/** Demo authentication is real; fresh synthetic database protects saved demo
 * passwords/data on the user's test instance. Frontend zero-write acceptance
 * is measured separately through real pages and PostgreSQL mutation counters.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';
import { api, fixtureAccount, startTestServer, testDatabase } from './helpers';
test('demo uses real password/session, isolated persistence and disabled-session refusal', async () => {
  const c = createRequire(join(process.cwd(), 'package.json'))('./scripts/config.cjs'); c.loadEnvironment();
  const config = c.readConfig(process.env, { requireTestDatabase: true });
  const name = 'pathmate_demo_' + randomUUID().replaceAll('-', '') + '_test';
  const url = new URL(config.DATABASE_URL_TEST); url.pathname = '/' + name;
  const admin = testDatabase(); let db: postgres.Sql | undefined;
  let server: Awaited<ReturnType<typeof startTestServer>> | undefined;
  try {
    await admin.unsafe('CREATE DATABASE "' + name + '"');
    assert.equal(spawnSync(process.execPath, ['scripts/db.cjs', 'migrate'], { env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8' }).status, 0);
    db = postgres(url.toString(), { max: 1, connect_timeout: 5 });
    server = await startTestServer(3114, url.toString());
    const wrong = await api(server.base, '/auth/login', { method: 'POST', body: { account: 'demo', password: 'wrong' } });
    assert.equal(wrong.status, 401); assert.equal((await db`SELECT id FROM memopath_account WHERE account_key='demo'`).length, 0);
    const demoLogin = () => api(server!.base, '/auth/login', { method: 'POST', body: { account: 'demo', password: 'demo1234' } });
    const demo = (await demoLogin()).body;
    assert.equal((await api(server.base, '/auth/me', { token: demo.token })).status, 200);
    const demoRows = await db`SELECT is_demo,password_hash FROM memopath_account WHERE id=${demo.accountId}`;
    assert.equal(demoRows[0].is_demo, true); const originalHash = demoRows[0].password_hash;
    const demoElders = (await api(server.base, '/elders', { token: demo.token })).body.items; assert.equal(demoElders.length, 2);
    const ordinary = await api(server.base, '/auth/register', { method: 'POST', body: { account: fixtureAccount('demo_normal'), password: 'Synthetic123!', role: 'family', elder: { name: 'Normal fixture' } } });
    assert.equal(ordinary.status, 201);
    const ordinaryElder = (await api(server.base, '/elders', { token: ordinary.body.token })).body.items[0];
    assert.equal((await api(server.base, '/dashboard?elderId=' + demoElders[0].id, { token: ordinary.body.token })).status, 403);
    assert.equal((await api(server.base, '/dashboard?elderId=' + ordinaryElder.id, { token: demo.token })).status, 403);
    const elderKey = fixtureAccount('demo_elder');
    const target = await api(server.base, '/auth/register', { method: 'POST', body: { account: elderKey, password: 'Synthetic123!', role: 'elder', elder: { name: 'Independent elder fixture' } } });
    assert.equal(target.status, 201);
    assert.equal((await api(server.base, '/care-links/invitations', { token: demo.token, method: 'POST', body: { elderId: demoElders[0].id, elderAccount: elderKey } })).status, 409);
    await db`UPDATE memopath_account SET is_demo=true WHERE id=${target.body.accountId}`;
    assert.equal((await api(server.base, '/care-links/invitations', { token: ordinary.body.token, method: 'POST', body: { elderId: ordinaryElder.id, elderAccount: elderKey } })).status, 409);
    const saved = await api(server.base, '/elders/' + demoElders[0].id, { token: demo.token, method: 'PATCH', body: { address: 'Saved demo fixture' } });
    assert.equal(saved.status, 200);
    await server.close(); server = await startTestServer(3114, url.toString());
    assert.equal((await api(server.base, '/elders', { token: demo.token })).body.items[0].address, 'Saved demo fixture');
    const repeated = await demoLogin(); assert.equal(repeated.status, 201);
    assert.equal((await api(server.base, '/elders', { token: repeated.body.token })).body.items.length, 2);
    assert.equal((await db`SELECT password_hash FROM memopath_account WHERE id=${demo.accountId}`)[0].password_hash, originalHash);
    await db`UPDATE memopath_account SET session_expires_at=now()-interval '1 second' WHERE id=${demo.accountId}`;
    assert.equal((await api(server.base, '/auth/me', { token: repeated.body.token })).status, 401);
    const logged = await demoLogin(); assert.equal(logged.status, 201);
    assert.equal((await api(server.base, '/auth/logout', { token: logged.body.token, method: 'POST' })).status, 201);
    assert.equal((await api(server.base, '/auth/me', { token: logged.body.token })).status, 401);
    const salt = randomUUID().replaceAll('-', '');
    const changedHash = salt + ':' + scryptSync('ChangedDemo123!', salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
    await db`UPDATE memopath_account SET password_hash=${changedHash} WHERE id=${demo.accountId}`;
    assert.equal((await demoLogin()).status, 401);
    assert.equal((await db`SELECT password_hash FROM memopath_account WHERE id=${demo.accountId}`)[0].password_hash, changedHash);
    const changed = await api(server.base, '/auth/login', { method: 'POST', body: { account: 'demo', password: 'ChangedDemo123!' } }); assert.equal(changed.status, 201);
    await server.close(); server = await startTestServer(3114, url.toString(), false);
    assert.equal((await api(server.base, '/auth/me', { token: changed.body.token })).status, 401);
    assert.equal((await api(server.base, '/auth/login', { method: 'POST', body: { account: 'demo', password: 'ChangedDemo123!' } })).status, 401);
    assert.equal((await api(server.base, '/auth/me', { token: ordinary.body.token })).status, 200);
  } finally {
    await server?.close(); await db?.end({ timeout: 5 });
    await admin.unsafe('DROP DATABASE IF EXISTS "' + name + '"'); await admin.end({ timeout: 5 });
  }
});
