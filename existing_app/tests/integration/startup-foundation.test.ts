/** Foundation startup rejection checks against real PostgreSQL. Only a uniquely
 * named synthetic *_test database is created/dropped; no development volume or
 * existing database is reset. Full dev/SPA acceptance follows in US1.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { testDatabase } from './helpers';
const configuration = createRequire(join(process.cwd(), 'package.json'))('./scripts/config.cjs');

test('missing/bad config, unavailable DB and unknown schema never listen', async () => {
  configuration.loadEnvironment();
  const config = configuration.readConfig(process.env, { requireTestDatabase: true });
  const port = 3129;
  const unavailable = new URL(config.DATABASE_URL_TEST); unavailable.port = '65432';
  for (const overrides of [{ DATABASE_URL: '' }, { SERVER_PORT: 'bad' }, { SERVER_HOST: '0.0.0.0' }, { SESSION_TTL_SECONDS: '59' }, { DATABASE_URL: unavailable.toString() }]) {
    const result = spawnSync(process.execPath, ['scripts/run.cjs', 'start'], {
      env: { ...process.env, DATABASE_URL: config.DATABASE_URL_TEST, SERVER_PORT: String(port), ...overrides }, encoding: 'utf8', timeout: 12000,
    });
    assert.notEqual(result.status, 0, 'startup must exit nonzero');
    assert.ok(!result.error, 'startup must terminate within bound');
    assert.ok(!((result.stdout || '') + (result.stderr || '')).includes(new URL(config.DATABASE_URL_TEST).password), 'no credential output');
    await assert.rejects(fetch(`http://127.0.0.1:${port}/api/memopath/auth/exists`, { signal: AbortSignal.timeout(500) }));
  }
  const database = `pathmate_fixture_${randomUUID().replaceAll('-', '')}_test`;
  assert.match(database, /^pathmate_fixture_[a-f0-9]{32}_test$/);
  const admin = testDatabase();
  let temporary: postgres.Sql | undefined;
  try {
    await admin.unsafe(`CREATE DATABASE "${database}"`);
    const url = new URL(config.DATABASE_URL_TEST); url.pathname = '/' + database;
    temporary = postgres(url.toString(), { max: 1, connect_timeout: 5 });
    const env = { ...process.env, DATABASE_URL: url.toString(), SERVER_PORT: String(port) };
    const check = spawnSync(process.execPath, ['scripts/db.cjs', 'check'], { env, encoding: 'utf8' });
    assert.equal(check.status, 0); assert.ok(check.stdout.includes('pending_initialization'));
    await temporary`CREATE TABLE fixture_unknown(id integer)`;
    for (const args of [['scripts/db.cjs', 'check'], ['scripts/db.cjs', 'migrate'], ['scripts/run.cjs', 'start']]) {
      const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 12000 });
      assert.notEqual(result.status, 0); assert.ok(!result.error);
    }
    assert.equal((await temporary`SELECT tablename FROM pg_tables WHERE schemaname='public'`).length, 1, 'refusal must preserve unknown table');
    await assert.rejects(fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) }));
  } finally {
    await temporary?.end({ timeout: 5 });
    await admin.unsafe(`DROP DATABASE IF EXISTS "${database}"`);
    await admin.end({ timeout: 5 });
  }
});
