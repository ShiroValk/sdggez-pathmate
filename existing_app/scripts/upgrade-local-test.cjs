/** One local 0000->0001 rehearsal target only: DATABASE_URL_TEST. Operator must
 * first stop local validation servers. Protect development URL, keep source,
 * official custom-format backup and fresh restored copy; never overwrite DBs.
 * Unlike db:backup/restore, this narrow rehearsal is not the final US5 CLI.
 */
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const postgres = require('postgres');
const { loadEnvironment, readConfig } = require('./config.cjs');
const migrations = require('./db.cjs');
const root = path.resolve(__dirname, '..');
function command(binary, args, env = process.env) {
  const result = spawnSync(binary, args, { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  if (result.error || result.status !== 0) throw new Error('Local upgrade operation failed');
  return result.stdout;
}
async function run() {
  loadEnvironment(root);
  const config = readConfig(process.env, { requireTestDatabase: true });
  const source = new URL(config.DATABASE_URL_TEST);
  const sourceName = source.pathname.slice(1);
  assert.equal(sourceName, 'pathmate_test', 'Only the current validation database is authorized');
  const copyName = 'pathmate_preupgrade_' + randomUUID().replaceAll('-', '') + '_test';
  const administrative = new URL(source); administrative.pathname = '/postgres';
  const admin = postgres(administrative.toString(), { max: 1, connect_timeout: 5 });
  const db = postgres(source.toString(), { max: 1, connect_timeout: 5 });
  let restored;
  try {
    await migrations.assertSchema(db, migrations.migrationFiles(), '0000');
    // Other active clients invalidate the stopped-writes prerequisite.
    const active = await db`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=${sourceName} AND pid<>pg_backend_pid()`;
    assert.equal(active[0].n, 0, 'Stop all validation writers before backup');
    const tables = Object.values(migrations.migrationFiles()[0].snapshot.tables).map(table => table.name).sort();
    async function state(client) {
      const counts = {}; const hashes = {};
      for (const table of tables) {
        assert.match(table, /^memopath_[a-z_]+$/);
        const rows = await client.unsafe('SELECT * FROM ' + table + ' ORDER BY id');
        counts[table] = rows.length; hashes[table] = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
      }
      return { counts, hashes };
    }
    const before = await state(db);
    const container = command('docker', ['compose', 'ps', '-q', 'db']).trim(); assert.match(container, /^[a-f0-9]{12,64}$/);
    const user = decodeURIComponent(source.username);
    const temporary = '/tmp/' + copyName + '.dump';
    const backupRoot = path.join(root, '.local-backups'); fs.mkdirSync(backupRoot, { recursive: true });
    const backup = path.join(backupRoot, copyName + '.dump');
    command('docker', ['exec', container, 'pg_dump', '-U', user, '-d', sourceName, '-Fc', '-f', temporary]);
    command('docker', ['exec', container, 'pg_restore', '--list', temporary]);
    command('docker', ['cp', container + ':' + temporary, backup]);
    await admin.unsafe('CREATE DATABASE "' + copyName + '"');
    command('docker', ['exec', container, 'pg_restore', '-U', user, '-d', copyName, '--exit-on-error', temporary]);
    const copyUrl = new URL(source); copyUrl.pathname = '/' + copyName;
    restored = postgres(copyUrl.toString(), { max: 1, connect_timeout: 5 });
    assert.deepEqual(await state(restored), before);
    await migrations.assertSchema(restored, migrations.migrationFiles(), '0000');
    command(process.execPath, ['scripts/verify-baseline.cjs'], { ...process.env, DATABASE_URL_TEST: copyUrl.toString() });
    assert.deepEqual(await state(restored), before);
    // Upgrade checks preserve all existing fields; new place columns are
    // omitted when comparing against the old schema's column list below.
    command(process.execPath, ['scripts/db.cjs', 'migrate', '--to', '0001'], { ...process.env, DATABASE_URL: source.toString() });
    await migrations.assertSchema(db, migrations.migrationFiles(), '0001');
    for (const table of tables) {
      const columns = Object.values(migrations.migrationFiles()[0].snapshot.tables['public.' + table].columns).map(column => '"' + column.name + '"').join(',');
      const rows = await db.unsafe('SELECT ' + columns + ' FROM ' + table + ' ORDER BY id');
      // Object property order differs in explicit SELECT: compare canonical
      // key order so hash equality verifies field values, not driver ordering.
      const oldRows = await restored.unsafe('SELECT ' + columns + ' FROM ' + table + ' ORDER BY id');
      assert.equal(JSON.stringify(rows), JSON.stringify(oldRows));
    }
    const result = { operation: 'upgrade_local_test', result: 'passed', sourceDatabase: sourceName, restored0000: copyName,
      backupFile: path.basename(backup), backupSha256: createHash('sha256').update(fs.readFileSync(backup)).digest('hex'),
      counts: before.counts, checks: ['stopped writers', 'official backup', 'actual isolated restore', 'all original fields equal', 'archived 0000 login/logout/isolation/save', '0001 upgrade'], createdAt: new Date().toISOString() };
    fs.writeFileSync(backup + '.json', JSON.stringify(result, null, 2) + '\n');
    process.stdout.write(JSON.stringify(result) + '\n');
  } finally { await restored?.end({ timeout: 5 }); await db.end({ timeout: 5 }); await admin.end({ timeout: 5 }); }
}
run().catch(() => { process.stderr.write('Local upgrade verification failed; original and backup targets preserved. Do not start an incompatible build.\n'); process.exitCode = 1; });
