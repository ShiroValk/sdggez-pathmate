/** T038 rehearsal uses fresh dedicated _test databases, not development data.
 * No app writes to these targets. Official container pg_dump/pg_restore make
 * a verified 0000 recovery point before applying 0001; targets are preserved.
 * Credentials/payloads are never printed; source volumes are never removed.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash, scryptSync } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const postgres = require('postgres');
const { loadEnvironment, readConfig } = require('./config.cjs');
const migrations = require('./db.cjs');
const root = path.resolve(__dirname, '..');
let stage = 'configuration';
function command(executable, args, env = process.env) {
  const result = spawnSync(executable, args, { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  if (result.error || result.status !== 0) {
    if (executable === process.execPath) {
      try {
        const diagnostic = JSON.parse(result.stderr.trim());
        if (diagnostic.operation === 'db' && typeof diagnostic.message === 'string') process.stderr.write(diagnostic.message + '\n');
      } catch { /* fixed failure below */ }
    }
    throw new Error('Rehearsal command failed');
  }
  return result.stdout;
}
async function run() {
  loadEnvironment(root);
  const config = readConfig(process.env, { requireTestDatabase: true });
  const source = new URL(config.DATABASE_URL_TEST);
  const suffix = randomUUID().replaceAll('-', '');
  const name = 'pathmate_upgrade_' + suffix + '_test';
  const restoreName = 'pathmate_upgrade_copy_' + suffix + '_test';
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  const admin = postgres(adminUrl.toString(), { max: 1, connect_timeout: 5 });
  let db, restored;
  try {
    // Random identifier with strict alphabet; CREATE DATABASE refuses collision.
    assert.match(name, /^pathmate_upgrade_[a-f0-9]+_test$/);
    stage = 'create isolated database';
    await admin.unsafe('CREATE DATABASE "' + name + '"');
    const target = new URL(source); target.pathname = '/' + name;
    stage = 'initialize 0000';
    command(process.execPath, ['scripts/db.cjs', 'migrate', '--to', '0000'], { ...process.env, DATABASE_URL: target.toString() });
    db = postgres(target.toString(), { max: 1, connect_timeout: 5 });
    stage = 'representative fixture';
    const account = randomUUID(); const elder = randomUUID();
    const salt = randomUUID().replaceAll('-', '');
    const hash = salt + ':' + scryptSync('Synthetic123!', salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
    await db`INSERT INTO memopath_account(id,account_key,password_hash,role,display_name) VALUES(${account},${'upgrade_' + suffix},${hash},'family','Upgrade fixture')`;
    await db`INSERT INTO memopath_elder(id,owner_account_id,name,nickname,relation,age,gender,address,phone,emergency_phone,avatar_emoji)
      VALUES(${elder},${account},'Upgrade elder','','',75,'','Synthetic address','','','👴')`;
    await db`INSERT INTO memopath_setting(account_id,config) VALUES(${account},${db.json({ language: 'english', voice_mode: 'standby', lock_layout: true })})`;
    await db`INSERT INTO memopath_trip(elder_id,destination,trip_date,start_time,end_time) VALUES(${elder},'Synthetic destination','2026-10-05','09:00','10:00')`;
    await db`INSERT INTO memopath_place(elder_id,label) VALUES(${elder},'Legacy place')`;
    async function state(client) {
      const data = {};
      for (const table of ['memopath_account', 'memopath_elder', 'memopath_setting', 'memopath_trip']) data[table] = await client.unsafe('SELECT * FROM ' + table + ' ORDER BY id');
      return JSON.stringify(data);
    }
    const before = await state(db);
    stage = 'container lookup';
    const container = command('docker', ['compose', 'ps', '-q', 'db']).trim();
    assert.match(container, /^[a-f0-9]{12,64}$/);
    const user = decodeURIComponent(source.username);
    const containerFile = '/tmp/pathmate_upgrade_' + suffix + '.dump';
    const backupRoot = path.join(root, '.local-backups'); fs.mkdirSync(backupRoot, { recursive: true });
    const backup = path.join(backupRoot, name + '.dump');
    stage = 'official backup';
    command('docker', ['exec', container, 'pg_dump', '-U', user, '-d', name, '-Fc', '-f', containerFile]);
    command('docker', ['exec', container, 'pg_restore', '--list', containerFile]);
    command('docker', ['cp', container + ':' + containerFile, backup]);
    stage = 'isolated restore';
    await admin.unsafe('CREATE DATABASE "' + restoreName + '"');
    command('docker', ['exec', container, 'pg_restore', '-U', user, '-d', restoreName, '--exit-on-error', containerFile]);
    const restoredUrl = new URL(source); restoredUrl.pathname = '/' + restoreName;
    restored = postgres(restoredUrl.toString(), { max: 1, connect_timeout: 5 });
    assert.equal(await state(restored), before);
    await migrations.assertSchema(restored, migrations.migrationFiles(), '0000');
    stage = 'upgrade 0001';
    command(process.execPath, ['scripts/db.cjs', 'migrate', '--to', '0001'], { ...process.env, DATABASE_URL: target.toString() });
    assert.equal(await state(db), before);
    await migrations.assertSchema(db, migrations.migrationFiles(), '0001');
    const place = await db`SELECT address,lng,lat FROM memopath_place WHERE elder_id=${elder}`;
    assert.deepEqual({ ...place[0] }, { address: '', lng: null, lat: null });
    command(process.execPath, ['scripts/db.cjs', 'migrate', '--to', '0001'], { ...process.env, DATABASE_URL: target.toString() });
    assert.equal(await state(db), before);
    const manifest = { sourceDatabase: name, restoredDatabase: restoreName, schemaBefore: '0000', schemaAfter: '0001',
      createdAt: new Date().toISOString(), sha256: createHash('sha256').update(fs.readFileSync(backup)).digest('hex'),
      checks: ['pg_restore --list', 'isolated actual restore', '0000 schema match', '0001 schema match', 'account/owner/trip/setting fields unchanged', 'legacy place defaults', 'repeat upgrade'], writesStopped: 'No application connected to fresh rehearsal databases' };
    fs.writeFileSync(backup + '.json', JSON.stringify(manifest, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ operation: 'verify_upgrade', result: 'passed', ...manifest }) + '\n');
  } finally { await db?.end({ timeout: 5 }); await restored?.end({ timeout: 5 }); await admin.end({ timeout: 5 }); }
}
run().catch(() => { process.stderr.write('Upgrade rehearsal failed at ' + stage + '; isolated targets preserved, development database unchanged.\n'); process.exitCode = 1; });
