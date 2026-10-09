/** Real official archives and isolated PostgreSQL databases. No schema reset,
 * development/volume deletion, forced restore or private output is permitted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import postgres from 'postgres';
import { testDatabase } from './helpers';
const recovery = createRequire(join(process.cwd(), 'package.json'))('./scripts/recovery.cjs') as {
  requiredRestoreSpace(bytes: number): number;
  assertRestoreSpace(available: number, required: number, location: string): void;
  verifyRestorePrerequisites(file: string, containerId: string): unknown;
};
test('restore preflight rejects missing archives and insufficient measured capacity before restore work', () => {
  const required = recovery.requiredRestoreSpace(1024);
  assert.equal(required, 3 * 1024 + 64 * 1024 * 1024);
  recovery.assertRestoreSpace(required, required, 'fixture');
  assert.throws(() => recovery.assertRestoreSpace(required - 1, required, 'fixture'), /free space is insufficient/u);
  assert.throws(() => recovery.requiredRestoreSpace(0), /archive is empty/u);
  assert.throws(() => recovery.requiredRestoreSpace(Number.MAX_SAFE_INTEGER), /supported preflight range/u);
  assert.throws(() => recovery.verifyRestorePrerequisites(join(process.cwd(), '.local-backups', 'not-present.dump'), '0'.repeat(64)), /archive or local backup directory access/u);
});

test('restore preflight rejects unreadable input without copying or changing the archive', () => {
  const require = createRequire(join(process.cwd(), 'package.json'));
  const fs = require('node:fs') as typeof import('node:fs');
  const file = join(process.cwd(), '.local-backups', `access_fixture_${randomUUID()}.dump`);
  mkdirSync(join(process.cwd(), '.local-backups'), { recursive: true });
  const bytes = Buffer.from('synthetic archive access fixture');
  writeFileSync(file, bytes);
  const original = fs.accessSync;
  try {
    fs.accessSync = ((target: import('node:fs').PathLike, mode?: number) => {
      if (target === file) throw Object.assign(new Error('controlled unreadable fixture'), { code: 'EACCES' });
      original(target, mode);
    }) as typeof fs.accessSync;
    assert.throws(() => recovery.verifyRestorePrerequisites(file, '0'.repeat(64)), /access could not be verified/u);
    assert.deepEqual(readFileSync(file), bytes);
  } finally {
    fs.accessSync = original;
    fs.unlinkSync(file);
  }
});
test('migration locks/drift/rollback and official archive recovery protect source and sessions', async () => {
  const c = createRequire(join(process.cwd(),'package.json'))('./scripts/config.cjs'); c.loadEnvironment();
  const cfg = c.readConfig(process.env,{requireTestDatabase:true});
  const suffix = randomUUID().replaceAll('-','');
  const sourceName = 'pathmate_migration_' + suffix + '_test';
  const unknownName = 'pathmate_unknown_' + suffix + '_test';
  const restoreName = 'pathmate_restore_' + suffix;
  const url = new URL(cfg.DATABASE_URL_TEST); url.pathname='/'+sourceName;
  const unknownUrl = new URL(url); unknownUrl.pathname='/'+unknownName;
  const admin = testDatabase(); let db: postgres.Sql | undefined; let restored: postgres.Sql | undefined;
  const archive = '.local-backups/migration_' + suffix + '.dump';
  const isolatedRoot=join(process.cwd(),'.local-validation','migration-files-'+suffix);
  mkdirSync(join(isolatedRoot,'scripts'),{recursive:true});
  for(const name of ['config.cjs','db.cjs','recovery.cjs']) cpSync(join('scripts',name),join(isolatedRoot,'scripts',name));
  cpSync('server/database/migrations',join(isolatedRoot,'server/database/migrations'),{recursive:true});
  cpSync('package.json',join(isolatedRoot,'package.json'));
  const environment={...process.env,DATABASE_URL:url.toString(),NODE_PATH:join(process.cwd(),'node_modules')};
  function cli(args:string[], copied=false, target=url.toString()) {
    return spawnSync(process.execPath,[copied?join(isolatedRoot,'scripts/db.cjs'):'scripts/db.cjs',...args],{env:{...environment,DATABASE_URL:target},encoding:'utf8',timeout:120000});
  }
  function successful(args:string[]) {
    const result=cli(args);
    if(result.status!==0) {
      for(const line of result.stderr.trim().split('\n')) { try { const diagnostic=JSON.parse(line); if(diagnostic.operation==='db') console.error(diagnostic.message,diagnostic.errorKind,diagnostic.databaseCode); } catch { /* no raw output */ } }
    }
    assert.equal(result.status,0,'CLI '+args[0]+' must succeed'); return JSON.parse(result.stdout.trim());
  }
  const asyncMigration = () => new Promise<number|null>(resolve => {
    const child=spawn(process.execPath,['scripts/db.cjs','migrate'],{env:environment,stdio:'ignore'}); child.on('exit',resolve);
  });
  try {
    await admin.unsafe('CREATE DATABASE "'+sourceName+'"'); await admin.unsafe('CREATE DATABASE "'+unknownName+'"');
    db=postgres(url.toString(),{max:1});
    const unknown=postgres(unknownUrl.toString(),{max:1});
    try { await unknown`CREATE TABLE unrelated(id integer)`; assert.notEqual(cli(['migrate'],false,unknownUrl.toString()).status,0); assert.equal((await unknown`SELECT tablename FROM pg_tables WHERE schemaname='public'`).length,1); } finally { await unknown.end(); }
    assert.equal(successful(['check']).result,'pending_initialization');
    successful(['migrate','--to','0000']); successful(['migrate','--to','0000']);
    // Use the actual submitted tag instead of assuming an invented file name.
    const journal=JSON.parse(readFileSync(join(isolatedRoot,'server/database/migrations/meta/_journal.json'),'utf8'));
    const oldSql=join(isolatedRoot,'server/database/migrations',journal.entries[0].tag+'.sql');
    const bytes=readFileSync(oldSql); writeFileSync(oldSql,Buffer.concat([bytes,Buffer.from('\n-- drift\n')]));
    assert.notEqual(cli(['migrate'],true).status,0); writeFileSync(oldSql,bytes);
    const snapshot=join(isolatedRoot,'server/database/migrations/meta/0000_snapshot.json'); const originalSnapshot=readFileSync(snapshot);
    writeFileSync(snapshot,Buffer.concat([originalSnapshot,Buffer.from('\n')])); assert.notEqual(cli(['check'],true).status,0); writeFileSync(snapshot,originalSnapshot);
    const nextSql=join(isolatedRoot,'server/database/migrations',journal.entries[1].tag+'.sql'); const nextBytes=readFileSync(nextSql);
    writeFileSync(nextSql,Buffer.concat([nextBytes,Buffer.from('\n--> statement-breakpoint\nSELECT pathmate_intentional_migration_failure();')]));
    assert.notEqual(cli(['migrate'],true).status,0);
    assert.equal((await db`SELECT version FROM pathmate_schema_migrations ORDER BY version DESC LIMIT 1`)[0].version,'0000');
    assert.equal((await db`SELECT 1 FROM information_schema.tables WHERE table_name='memopath_care_link'`).length,0);
    writeFileSync(nextSql,nextBytes);
    const account=randomUUID(); const elder=randomUUID();
    await db`INSERT INTO memopath_account(id,account_key,password_hash,role,display_name,session_token_hash,session_expires_at) VALUES(${account},${'migration_'+suffix},'synthetic-hash','family','Synthetic migration',${'a'.repeat(64)},now()+interval '1 day')`;
    await db`INSERT INTO memopath_elder(id,owner_account_id,name,nickname,relation,gender,address,phone,emergency_phone) VALUES(${elder},${account},'Synthetic migration elder','','','','Preserve full field','','')`;
    await db.end(); db=undefined;
    const backup=successful(['backup','--output',archive]); assert.equal(backup.version,'0000');
    assert.ok(existsSync(archive+'.json')); assert.notEqual(cli(['backup','--output',archive]).status,0);
    const manifest=JSON.parse(readFileSync(archive+'.json','utf8')); assert.equal(manifest.tables.memopath_elder.count,1);
    // Simultaneous migrations serialize, and both return without partial data.
    assert.deepEqual(await Promise.all([asyncMigration(),asyncMigration()]),[0,0]);
    const secondArchive=archive.replace('.dump','_0001.dump');
    assert.equal(successful(['backup','--output',secondArchive]).version,'0001');
    assert.notEqual(cli(['migrate','--to','0000']).status,0);
    successful(['restore','--input',archive,'--database',restoreName]);
    successful(['verify','--database',restoreName]);
    assert.notEqual(cli(['restore','--input',archive,'--database',restoreName]).status,0);
    assert.notEqual(cli(['restore','--input',archive,'--database',sourceName]).status,0);
    const restoredUrl=new URL(url); restoredUrl.pathname='/'+restoreName;
    restored=postgres(restoredUrl.toString(),{max:1});
    assert.equal((await restored`SELECT session_token_hash FROM memopath_account WHERE id=${account}`)[0].session_token_hash,null);
    assert.equal((await restored`SELECT address FROM memopath_elder WHERE id=${elder}`)[0].address,'Preserve full field');
    await restored`ALTER TABLE memopath_account DROP CONSTRAINT memopath_account_role_check`;
    await restored`ALTER TABLE memopath_account ADD CONSTRAINT memopath_account_role_check CHECK (role='family')`;
    assert.notEqual(cli(['verify','--database',restoreName]).status,0,'Same-name altered constraint must fail comparison');
    // Latest real build refuses restored 0000; old build is separately exercised.
    const rejected=spawnSync(process.execPath,['dist/server/main.js'],{env:{...environment,DATABASE_URL:restoredUrl.toString(),SERVER_PORT:'3116'},encoding:'utf8',timeout:10000}); assert.notEqual(rejected.status,0);
    const corrupt=archive.replace('.dump','_corrupt.dump'); cpSync(archive,corrupt); cpSync(archive+'.json',corrupt+'.json'); writeFileSync(corrupt,Buffer.from('invalid archive'));
    assert.notEqual(cli(['restore','--input',corrupt,'--database','pathmate_restore_bad_'+suffix.slice(0,20)]).status,0);
    const state=await admin`SELECT datname FROM pg_database WHERE datname=${sourceName}`; assert.equal(state.length,1);
  } finally {
    await db?.end(); await restored?.end();
    for(const name of [restoreName,unknownName,sourceName]) await admin.unsafe('DROP DATABASE IF EXISTS "'+name+'"');
    await admin.end();
  }
});
