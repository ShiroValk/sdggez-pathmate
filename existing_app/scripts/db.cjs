/** Independent migration CLI; only submitted SQL is executed, never arbitrary
 * arguments. check/status are read-only. migrate locks and applies a chain in
 * one transaction; a failure leaves schema and ledger unchanged. Errors never
 * expose driver messages, SQL data or connection credentials.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const postgres = require('postgres');
const configuration = require('./config.cjs');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'server/database/migrations');
const ledger = 'pathmate_schema_migrations';
class MigrationError extends Error { constructor(message) { super(message); this.name = 'MigrationError'; } }
function refuse(message) { throw new MigrationError(message); }
const digest = data => crypto.createHash('sha256').update(data).digest('hex');

/** Read and validate the committed file chain before opening a connection. */
function migrationFiles() {
  let journal;
  try { journal = JSON.parse(fs.readFileSync(path.join(directory, 'meta/_journal.json'), 'utf8')); }
  catch { refuse('Migration journal is missing or invalid; restore submitted migration files.'); }
  if (journal.version !== '7' || journal.dialect !== 'postgresql' || !Array.isArray(journal.entries) || !journal.entries.length) refuse('Migration journal is not a supported PostgreSQL chain.');
  let previous = '00000000-0000-0000-0000-000000000000';
  const files = journal.entries.map((entry, index) => {
    const version = String(index).padStart(4, '0');
    if (entry.idx !== index || entry.version !== '7' || !new RegExp(`^${version}_[a-z_]+$`).test(entry.tag)) refuse('Migration journal order or version is invalid.');
    let sql, snapshotBytes, snapshot;
    try {
      sql = fs.readFileSync(path.join(directory, `${entry.tag}.sql`), 'utf8');
      snapshotBytes = fs.readFileSync(path.join(directory, `meta/${version}_snapshot.json`));
      snapshot = JSON.parse(snapshotBytes);
    } catch { refuse('Migration SQL or snapshot is missing or invalid; restore submitted files.'); }
    if (!sql.trim() || snapshot.version !== '7' || snapshot.dialect !== 'postgresql' || snapshot.prevId !== previous || !snapshot.id || !snapshot.tables || !Object.keys(snapshot.tables).length) refuse('Migration snapshot chain is invalid.');
    previous = snapshot.id;
    return { version, tag: entry.tag, sql, snapshot, sqlHash: digest(sql), snapshotHash: digest(snapshotBytes) };
  });
  const expected = files.map(file => `${file.tag}.sql`).sort();
  const actual = fs.readdirSync(directory).filter(name => name.endsWith('.sql')).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) refuse('Migration directory and journal disagree.');
  return files;
}

/** Require ledger rows to be the exact applied prefix and reject unknown tables.
 * An empty public schema has no ledger and is safe to initialize. There is no
 * automatic adoption, drop, reset, downgrade, or implicit migration on startup.
 */
async function databaseState(client, files) {
  const tables = await client`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  const names = tables.map(row => row.tablename);
  if (!names.includes(ledger)) {
    if (names.length) refuse('Unknown nonempty public schema; select a new empty dedicated database.');
    const objects = await client`SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' LIMIT 1`;
    if (objects.length) refuse('Unknown objects exist in public schema; select a new empty database.');
    return [];
  }
  let applied;
  try { applied = await client`SELECT version, tag, sql_hash, snapshot_hash FROM public.pathmate_schema_migrations ORDER BY version`; }
  catch { refuse('Migration ledger is invalid; compare against a verified backup.'); }
  if (!applied.length) refuse('An empty migration ledger is not a valid initialized database.');
  applied.forEach((row, index) => {
    const file = files[index];
    if (!file || row.version !== file.version || row.tag !== file.tag || row.sql_hash !== file.sqlHash || row.snapshot_hash !== file.snapshotHash) refuse('Migration ledger/file drift; stop and restore the matching submitted files or verified backup.');
  });
  const expected = Object.values(files[applied.length - 1].snapshot.tables).map(table => table.name).concat(ledger).sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) refuse('Database tables drift from the applied snapshot; do not migrate.');
  return applied;
}

/** Startup compatibility: require supported version and snapshot columns, FK,
 * unique/check constraints and indexes. Does not perform business authorization.
 */
async function assertSchema(client, files, supported = '0000') {
  const applied = await databaseState(client, files);
  if (applied.at(-1)?.version !== supported) refuse(`Schema version incompatible; run npm.cmd run db:migrate -- --to ${supported} with a matching build.`);
  const snapshot = files.find(file => file.version === supported).snapshot;
  for (const table of Object.values(snapshot.tables)) {
    const columns = await client`SELECT column_name, is_nullable, udt_name, character_maximum_length, datetime_precision FROM information_schema.columns WHERE table_schema='public' AND table_name=${table.name}`;
    for (const column of Object.values(table.columns)) {
      const current = columns.find(item => item.column_name === column.name);
      const type = column.type;
      const expectedType = type.startsWith('varchar') ? 'varchar' : type.startsWith('timestamp') ? 'timestamptz' : type === 'integer' ? 'int4' : type === 'boolean' ? 'bool' : type === 'double precision' ? 'float8' : type;
      const length = /^varchar\((\d+)\)$/.exec(type);
      if (!current || current.udt_name !== expectedType || current.is_nullable !== (column.notNull || column.primaryKey ? 'NO' : 'YES') || (length && current.character_maximum_length !== Number(length[1])) || (expectedType === 'timestamptz' && current.datetime_precision !== 3)) refuse(`Schema column incompatible: ${table.name}.${column.name}; restore the matching schema.`);
    }
    const constraints = await client`SELECT conname FROM pg_constraint WHERE conrelid = ${'public.' + table.name}::regclass`;
    const required = ['foreignKeys', 'uniqueConstraints', 'checkConstraints'].flatMap(kind => Object.keys(table[kind] || {}));
    if (required.some(name => !constraints.some(item => item.conname === name))) refuse(`Schema constraints missing: ${table.name}; restore the matching schema.`);
    const indexes = await client`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename=${table.name}`;
    if (Object.keys(table.indexes || {}).some(name => !indexes.some(item => item.indexname === name))) refuse(`Schema indexes missing: ${table.name}; restore the matching schema.`);
  }
}

function report(operation, result, extra = {}) {
  process.stdout.write(JSON.stringify({ time: new Date().toISOString(), level: 'info', requestId: crypto.randomUUID(), operation, result, ...extra }) + '\n');
}
/** Strict options; no arbitrary SQL, forced adoption or down migration. */
async function main(args = process.argv.slice(2)) {
  const [command, ...options] = args;
  if (['backup', 'restore', 'verify'].includes(command)) {
    configuration.loadEnvironment(root);
    const config = configuration.readConfig(process.env, { requireDatabase: true });
    return require('./recovery.cjs').run(command, options, config);
  }
  if (!['generate', 'check', 'migrate', 'status'].includes(command)) refuse('Use db:generate/check/migrate/status/backup/restore/verify.');
  const files = command === 'generate' ? undefined : migrationFiles();
  let target;
  if (options.length) {
    if (command !== 'migrate' || options.length !== 2 || options[0] !== '--to' || !files.some(file => file.version === options[1])) refuse('Only db:migrate --to with a submitted version is supported.');
    target = options[1];
  }
  configuration.loadEnvironment(root);
  const config = configuration.readConfig(process.env, { requireDatabase: command !== 'generate' });
  if (command === 'generate') {
    const result = spawnSync(process.execPath, [path.join(root, 'node_modules/drizzle-kit/bin.cjs'), 'generate'], { cwd: root, encoding: 'utf8' });
    // Drizzle Kit can report an error yet return zero; never accept that output.
    if (result.error || result.status !== 0 || /\bError[:\s]|Transform failed/i.test((result.stdout || '') + (result.stderr || ''))) refuse('Drizzle generation failed; inspect schema and submitted migration files.');
    process.stdout.write(result.stdout || '');
    return;
  }
  const client = postgres(config.DATABASE_URL, { max: 1, connect_timeout: 5 });
  try {
    await client`SELECT 1`;
    if (command !== 'migrate') {
      await client.begin('read only', async transaction => {
        const applied = await databaseState(transaction, files);
        report(`db_${command}`, applied.length ? 'ready' : 'pending_initialization', { database: configuration.databaseUrl(config.DATABASE_URL).pathname.slice(1), version: applied.at(-1)?.version ?? null, pending: files.slice(applied.length).map(file => file.version) });
      });
      return;
    }
    target ??= files.at(-1).version;
    await client.begin(async transaction => {
      await transaction`SELECT pg_advisory_xact_lock(176002, 2)`;
      const applied = await databaseState(transaction, files);
      if (applied.at(-1)?.version > target) refuse('Downgrade refused; use an isolated backup restore with the matching application.');
      if (!applied.length) await transaction`CREATE TABLE public.pathmate_schema_migrations (version varchar(4) PRIMARY KEY, tag text NOT NULL, sql_hash varchar(64) NOT NULL, snapshot_hash varchar(64) NOT NULL, applied_at timestamptz(3) NOT NULL DEFAULT now())`;
      const pending = files.slice(applied.length).filter(file => file.version <= target);
      for (const file of pending) {
        for (const statement of file.sql.split('--> statement-breakpoint').filter(sql => sql.trim())) await transaction.unsafe(statement);
        await transaction`INSERT INTO public.pathmate_schema_migrations (version,tag,sql_hash,snapshot_hash) VALUES (${file.version},${file.tag},${file.sqlHash},${file.snapshotHash})`;
      }
      await assertSchema(transaction, files, target);
      // Reporting after commit below; a failed transaction never reports success.
    });
    report('db_migrate', 'committed', { version: target });
  } finally { await client.end({ timeout: 5 }); }
}

// Publish shared migration functions before executing a recovery CLI branch.
// verify reads them before its first async I/O; late exports cause a cycle.
module.exports = { migrationFiles, databaseState, assertSchema, main, MigrationError, report };
if (require.main === module) main().catch(error => {
  const safe = error instanceof MigrationError || error instanceof configuration.ConfigurationError;
  process.stderr.write(JSON.stringify({ time: new Date().toISOString(), level: 'error', requestId: crypto.randomUUID(), operation: 'db', result: 'rejected', errorKind: ['TypeError','SyntaxError','PostgresError'].includes(error.name) ? error.name : undefined, databaseCode: typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : undefined, message: safe ? error.message : 'Database operation failed; check local PostgreSQL availability, credentials and migration integrity. No automatic reset was performed.' }) + '\n');
  process.exitCode = 1;
});
