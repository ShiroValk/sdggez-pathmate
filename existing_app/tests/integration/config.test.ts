/** Reuse the already validated foundational config/schema cases through the
 * official suite, then verify actual startup against committed schema faults.
 * Only a newly created UUID fixture database is altered/dropped.
 */
import './startup-foundation.test';
import './foundation.test';
import '../unit/config.test.cjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import postgres from 'postgres';
import { testDatabase } from './helpers';

test('committed missing table/column/version faults prevent actual startup', async () => {
  const configuration = createRequire(join(process.cwd(), 'package.json'))('./scripts/config.cjs');
  configuration.loadEnvironment();
  const config = configuration.readConfig(process.env, { requireTestDatabase: true });
  const database = `pathmate_fixture_${randomUUID().replaceAll('-', '')}_test`;
  assert.match(database, /^pathmate_fixture_[a-f0-9]{32}_test$/);
  const admin = testDatabase();
  let fixture: postgres.Sql | undefined;
  const url = new URL(config.DATABASE_URL_TEST); url.pathname = '/' + database;
  const env = { ...process.env, DATABASE_URL: url.toString(), SERVER_HOST: '127.0.0.1', SERVER_PORT: '3128' };
  try {
    await admin.unsafe(`CREATE DATABASE "${database}"`);
    const migration = spawnSync(process.execPath, ['scripts/db.cjs', 'migrate'], { env, encoding: 'utf8', timeout: 15000 });
    assert.equal(migration.status, 0, 'fixture migration must succeed');
    fixture = postgres(url.toString(), { max: 1, connect_timeout: 5 });
    const faults = [
      ['ALTER TABLE memopath_alert RENAME TO fixture_missing_alert', 'ALTER TABLE fixture_missing_alert RENAME TO memopath_alert'],
      ['ALTER TABLE memopath_account RENAME COLUMN display_name TO fixture_missing_name', 'ALTER TABLE memopath_account RENAME COLUMN fixture_missing_name TO display_name'],
      ["UPDATE pathmate_schema_migrations SET version='9999' WHERE version='0000'", "UPDATE pathmate_schema_migrations SET version='0000' WHERE version='9999'"],
    ];
    for (const [damage, restore] of faults) {
      await fixture.unsafe(damage);
      try {
        const child = spawnSync(process.execPath, ['scripts/run.cjs', 'start'], { env, encoding: 'utf8', timeout: 12000 });
        assert.notEqual(child.status, 0); assert.ok(!child.error, 'startup terminates within bound');
        assert.ok(!(child.stdout + child.stderr).includes(url.password), 'startup redacts credentials');
        await assert.rejects(fetch('http://127.0.0.1:3128/', { signal: AbortSignal.timeout(500) }));
      } finally { await fixture.unsafe(restore); }
    }
  } finally {
    await fixture?.end({ timeout: 5 });
    await admin.unsafe(`DROP DATABASE IF EXISTS "${database}"`);
    await admin.end({ timeout: 5 });
  }
});
