/** Official PostgreSQL archive recovery. Only new named restore databases are
 * created; the source and application connection are never changed. Manifests
 * hold counts and hashes, not account data, passwords or session credentials.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const postgres = require('postgres');
const root = path.resolve(__dirname, '..');
const backupRoot = path.join(root, '.local-backups');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new (require('./db.cjs').MigrationError)(message); };
/** PostgreSQL flattens nested AND/OR during dump reparse. Canonicalize only
 * Boolean grouping; atomic SQL, including quoted literals/functions, is kept.
 * BETWEEN's AND is an atomic range separator, never a Boolean split.
 */
function booleanTree(sql) {
  let text = sql.trim();
  function scan(value, operator) {
    let depth=0, quoted=false, between=false, start=0; const pieces=[];
    for(let i=0;i<value.length;i++) {
      if(value[i]==="'") { if(quoted && value[i+1]==="'") { i++; continue; } quoted=!quoted; continue; }
      if(quoted) continue;
      if(value[i]==='(') depth++; else if(value[i]===')') depth--;
      if(depth===0) {
        if(/^\bBETWEEN\b/.test(value.slice(i))) between=true;
        if(/^\bAND\b/.test(value.slice(i)) && between) { between=false; i+=2; continue; }
        if(value.slice(i,i+operator.length)===operator) {pieces.push(value.slice(start,i));i+=operator.length-1;start=i+1;}
      }
    }
    if(pieces.length) pieces.push(value.slice(start)); return pieces;
  }
  // Remove a pair only when it encloses the entire expression.
  while(text[0]==='(' && text.at(-1)===')') {
    let depth=0,quoted=false,whole=true;
    for(let i=0;i<text.length-1;i++) { if(text[i]==="'") {if(quoted&&text[i+1]==="'"){i++;continue;}quoted=!quoted;} if(!quoted){if(text[i]==='(')depth++;if(text[i]===')')depth--;if(depth===0){whole=false;break;}} }
    if(!whole)break; text=text.slice(1,-1).trim();
  }
  for(const operator of [' OR ',' AND ']) {
    const pieces=scan(text,operator);
    if(pieces.length) {const key=operator.trim();return {[key]:pieces.flatMap(piece=>{const nested=booleanTree(piece);return nested&&typeof nested==='object'&&nested[key]?nested[key]:[nested];})};}
  }
  return text;
}
function official(args) {
  const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  if (result.error || result.status !== 0) fail('Official PostgreSQL archive command failed; check Docker engine, Compose database, file permissions and free space. Source unchanged; no application switch performed.');
  return result.stdout.trim();
}
function archivePath(input, existing) {
  fs.mkdirSync(backupRoot, { recursive: true });
  const result = path.resolve(root, input);
  if (!result.startsWith(backupRoot + path.sep) || path.extname(result) !== '.dump') fail('Archive must be a .dump file inside ignored .local-backups.');
  // Keep paths flat and reject links before file reads/copies.
  if (path.dirname(result) !== backupRoot || fs.lstatSync(backupRoot).isSymbolicLink()) fail('Archive directory must be the real .local-backups directory; nested paths and links are refused.');
  if (existing && (!fs.existsSync(result) || fs.lstatSync(result).isSymbolicLink() || !fs.lstatSync(result).isFile())) fail('Archive is missing or is not a regular file.');
  if (!existing && (fs.existsSync(result) || fs.existsSync(result + '.json'))) fail('Archive already exists; choose a new output path.');
  return result;
}
function container() {
  // Process injection is also supported; a fresh checkout need not copy a
  // private env file. COMPOSE_PROJECT_NAME can identify the reused local DB.
  const options=fs.existsSync(path.join(root,'.env.local'))?['--env-file','.env.local']:[];
  const id = official(['compose', ...options, 'ps', '-q', 'db']);
  if (!/^[a-f0-9]{12,64}$/.test(id)) fail('Exactly one running local Compose database is required.');
  return id;
}
function connection(config, database) {
  const url = new URL(config.DATABASE_URL);
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(database)) fail('Invalid local database identifier.');
  url.pathname = '/' + database; return url.toString();
}
function readManifest(file) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(file + '.json', 'utf8')); } catch { fail('Backup manifest missing or invalid.'); }
  if (manifest.format !== 1 || manifest.verifiedRestore !== true || !['0000', '0001'].includes(manifest.schemaVersion) || !manifest.tables || hash(fs.readFileSync(file)) !== manifest.sha256) fail('Backup integrity or isolated restore verification failed; use a verified archive and matching manifest.');
  return manifest;
}
async function state(db, version) {
  const migration = require('./db.cjs');
  const files = migration.migrationFiles(); await migration.assertSchema(db, files, version);
  const snapshot = files.find(file => file.version === version).snapshot;
  const tables = {};
  for (const table of Object.values(snapshot.tables)) {
    if (!/^memopath_[a-z_]+$/.test(table.name)) fail('Unsupported snapshot identifier.');
    const data = await db.unsafe('SELECT to_jsonb(t) AS row FROM public."' + table.name + '" t ORDER BY id');
    const rows = data.map(item => item.row);
    // Revoking all restored sessions is the sole expected data difference.
    if (table.name === 'memopath_account') for (const row of rows) { row.session_token_hash = null; row.session_expires_at = null; }
    tables[table.name] = { count: rows.length, fieldsSha256: hash(JSON.stringify(rows)) };
  }
  const catalog = await db`SELECT c.relname, a.attname, format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`;
  const constraints = await db`SELECT c.relname,p.conname,pg_get_constraintdef(p.oid) AS definition,p.convalidated FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,p.conname`;
  // pg_dump/reparse pushes a varchar-literal array's text[] cast onto each
  // literal. Canonicalize exactly that equivalent cast; preserve operators,
  // values, functions, FK actions and all other constraint expressions.
  for (const item of constraints) item.definition = item.definition
    .replace(/\('((?:[^']|'')*)'::character varying\)::text/g, "'$1'::text")
    .replace(/\(\(ARRAY\[([^\]]+)\]\)::text\[\]\)/g, (whole, entries) =>
      /^(?:'(?:[^']|'')*'::character varying)(?:, '(?:[^']|'')*'::character varying)*$/.test(entries)
        ? '(ARRAY[' + entries.replace(/::character varying/g, '::text') + '])' : whole);
  for(const item of constraints) if(item.definition.startsWith('CHECK ')) item.definition='CHECK '+JSON.stringify(booleanTree(item.definition.slice(6)));
  const indexes = await db`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`;
  if (constraints.some(item => !item.convalidated)) fail('Unvalidated database constraints; repair before backup/recovery.');
  // Verify existing FK rows, even if an administrator previously bypassed checks.
  for (const table of Object.values(snapshot.tables)) for (const fk of Object.values(table.foreignKeys || {})) {
    const join = fk.columnsFrom.map((column,i) => 'p."' + fk.columnsTo[i] + '"=t."' + column + '"').join(' AND ');
    const populated = fk.columnsFrom.map(column => 't."' + column + '" IS NOT NULL').join(' AND ');
    const invalid = await db.unsafe('SELECT 1 FROM "' + table.name + '" t WHERE ' + populated + ' AND NOT EXISTS (SELECT 1 FROM "' + fk.tableTo + '" p WHERE ' + join + ') LIMIT 1');
    if (invalid.length) fail('Foreign-key data integrity failed.');
  }
  if (version === '0001') {
    const invalid = await db`SELECT 1 FROM memopath_care_link l JOIN memopath_account f ON f.id=l.family_account_id JOIN memopath_account e ON e.id=l.elder_account_id WHERE f.role<>'family' OR e.role<>'elder' OR f.is_demo<>e.is_demo LIMIT 1`;
    const badInvite = await db`SELECT 1 FROM memopath_care_invitation i JOIN memopath_account f ON f.id=i.family_account_id JOIN memopath_account e ON e.id=i.target_elder_account_id WHERE f.role<>'family' OR e.role<>'elder' OR f.is_demo<>e.is_demo OR (i.status='accepted' AND i.consumed_at IS NULL) OR (i.status='pending' AND i.consumed_at IS NOT NULL) LIMIT 1`;
    if (invalid.length || badInvite.length) fail('Care role/demo domain or consumption integrity failed.');
  }
  const invalidOwner = await db`SELECT 1 FROM memopath_elder e JOIN memopath_account a ON a.id=e.owner_account_id WHERE a.role<>'family' LIMIT 1`;
  if (invalidOwner.length) fail('Elder owner role integrity failed.');
  return { tables, structureSha256: hash(JSON.stringify({ catalog, constraints, indexes })), structureParts: { columns: hash(JSON.stringify(catalog)), constraints: hash(JSON.stringify(constraints)), indexes: hash(JSON.stringify(indexes)) }, constraintHashes: Object.fromEntries(constraints.map(item=>[item.relname+'.'+item.conname,hash(JSON.stringify(item))])) };
}
async function verify(db, manifest, revoked) {
  const current = await state(db, manifest.schemaVersion);
  const differingTables = Object.keys(current.tables).filter(name => JSON.stringify(current.tables[name]) !== JSON.stringify(manifest.tables[name]));
  if (differingTables.length) fail('Restored field/count comparison failed for '+differingTables.join(',')+'; do not switch applications.');
  if (current.structureSha256 !== manifest.structureSha256) {
    const parts=Object.keys(current.structureParts).filter(name=>current.structureParts[name]!==manifest.structureParts?.[name]);
    const names=Object.keys(current.constraintHashes).filter(name=>current.constraintHashes[name]!==manifest.constraintHashes?.[name]);
    fail('Restored schema comparison failed ('+parts.join(',')+'; '+names.join(',')+'); do not switch applications.');
  }
  if (revoked && (await db`SELECT 1 FROM memopath_account WHERE session_token_hash IS NOT NULL OR session_expires_at IS NOT NULL LIMIT 1`).length) fail('Restored session revocation verification failed.');
}
async function restoreArchive(config, file, manifest, database, transient = false) {
  if (!/^pathmate_restore_[a-z0-9_]{1,45}$/.test(database)) fail('Restore target must be a new pathmate_restore_* database.');
  const admin = postgres(connection(config, 'postgres'), { max: 1 });
  let db; let created = false; let verified = false; const id = container();
  const temporary = '/tmp/pathmate_restore_' + crypto.randomUUID().replaceAll('-', '') + '.dump';
  const user = decodeURIComponent(new URL(config.DATABASE_URL).username);
  try {
    if ((await admin`SELECT 1 FROM pg_database WHERE datname=${database}`).length) fail('Restore target exists; choose a new database. Overwrite/force is not supported.');
    official(['cp', file, id + ':' + temporary]); official(['exec', id, 'pg_restore', '--list', temporary]);
    await admin.unsafe('CREATE DATABASE "' + database + '"'); created = true;
    official(['exec', id, 'pg_restore', '-U', user, '-d', database, '--exit-on-error', '--no-owner', '--no-privileges', temporary]);
    db = postgres(connection(config, database), { max: 1 });
    await db`UPDATE memopath_account SET session_token_hash=NULL,session_expires_at=NULL`;
    await verify(db, manifest, true);
    verified = true;
    if (!transient) fs.writeFileSync(path.join(backupRoot, database + '.json'), JSON.stringify({ format: 1, archive: path.basename(file), database, sha256: manifest.sha256, schemaVersion: manifest.schemaVersion, sessionsRevoked: true, createdAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
  } finally {
    await db?.end({ timeout: 5 });
    // Only this invocation's randomly named verification copy is disposable.
    if (transient && created && verified) await admin.unsafe('DROP DATABASE "' + database + '"');
    await admin.end({ timeout: 5 });
    try { official(['exec', id, 'rm', '-f', temporary]); } catch { /* Temporary cleanup failure must not overwrite recovery diagnostics. */ }
  }
}
async function run(command, options, config) {
  if (command === 'backup') {
    if (options.length !== 2 || options[0] !== '--output') fail('Use db:backup -- --output .local-backups/NAME.dump after stopping all application writers.');
    const file = archivePath(options[1], false); const id = container();
    const url = new URL(config.DATABASE_URL); const name = url.pathname.slice(1); const user = decodeURIComponent(url.username);
    connection(config, name);
    const temporary = '/tmp/pathmate_backup_' + crypto.randomUUID().replaceAll('-', '') + '.dump';
    const db = postgres(config.DATABASE_URL, { max: 1 }); let manifest;
    try {
      await db.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(176002,2)`;
        if ((await tx`SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() LIMIT 1`).length) fail('Source has other connections. Stop application writers and close pools before backup; no connections were terminated.');
        const files = require('./db.cjs').migrationFiles(); const applied = await require('./db.cjs').databaseState(tx, files); const version = applied.at(-1)?.version;
        if (!version) fail('Initialize and verify a supported database before backup.');
        const names = Object.values(files.find(item => item.version === version).snapshot.tables).map(table => table.name).concat('pathmate_schema_migrations');
        // Prevent concurrent data/schema writes for dump + manifest comparison.
        await tx`SET LOCAL lock_timeout='5s'`;
        await tx.unsafe('LOCK TABLE ' + names.map(n => '"' + n + '"').join(',') + ' IN SHARE MODE');
        const before = await state(tx, version);
        official(['exec', id, 'pg_dump', '-U', user, '-d', name, '-Fc', '-f', temporary]);
        official(['exec', id, 'pg_restore', '--list', temporary]); official(['cp', id + ':' + temporary, file]);
        const baseline = path.join(root, '.local-baselines/0000/manifest.json');
        manifest = { format: 1, sourceDatabase: name, schemaVersion: version, createdAt: new Date().toISOString(), sha256: hash(fs.readFileSync(file)), ...before,
          appVersion: require('../package.json').version, lockSha256: hash(fs.readFileSync(path.join(root,'package-lock.json'))),
          matchingBuild: version === '0000' ? (fs.existsSync(baseline) ? hash(fs.readFileSync(baseline)) : null) : hash(fs.readFileSync(path.join(root,'dist/server/main.js'))),
          sessionPolicy: 'All restored sessions revoked; remaining account fields must match', writesStopped: true, verifiedRestore: false };
        fs.writeFileSync(file + '.json', JSON.stringify(manifest, null, 2), { flag: 'wx' });
      });
      await restoreArchive(config, file, manifest, 'pathmate_restore_verify_' + crypto.randomUUID().replaceAll('-','').slice(0,24), true);
      manifest.verifiedRestore = true;
      fs.writeFileSync(file + '.json', JSON.stringify(manifest, null, 2));
      require('./db.cjs').report('db_backup', 'verified', { file, sha256: manifest.sha256, version: manifest.schemaVersion });
    } finally { await db.end({ timeout: 5 }); try { official(['exec',id,'rm','-f',temporary]); } catch { /* preserve failure */ } }
  } else if (command === 'restore') {
    if (options.length !== 4 || options[0] !== '--input' || options[2] !== '--database') fail('Use db:restore -- --input .local-backups/NAME.dump --database pathmate_restore_NAME.');
    const file = archivePath(options[1], true); const manifest = readManifest(file);
    await restoreArchive(config, file, manifest, options[3]);
    require('./db.cjs').report('db_restore','verified',{ database:options[3], version:manifest.schemaVersion, sessionsRevoked:true, applicationSwitched:false });
  } else {
    if (options.length !== 2 || options[0] !== '--database' || !/^pathmate_restore_[a-z0-9_]{1,45}$/.test(options[1])) fail('Use db:verify -- --database pathmate_restore_NAME with a recorded restore receipt.');
    let receipt; try { receipt = JSON.parse(fs.readFileSync(path.join(backupRoot,options[1]+'.json'))); } catch { fail('Restore receipt missing; verify through the original backup/restore workflow.'); }
    const file = archivePath(path.join('.local-backups', receipt.archive), true); const manifest = readManifest(file);
    if (receipt.sha256 !== manifest.sha256 || receipt.database !== options[1]) fail('Restore receipt and backup disagree.');
    const db = postgres(connection(config,options[1]),{max:1});
    try { await verify(db,manifest,true); } finally { await db.end({timeout:5}); }
    require('./db.cjs').report('db_verify','passed',{database:options[1],version:manifest.schemaVersion,sessionsRevoked:true});
  }
}
module.exports = { run, state, verify };
