/** Real 0000 authentication acceptance; fixtures use synthetic identities and
 * private credentials. Expected status assertions never print whole responses.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, connect, type Socket } from 'node:net';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { scryptSync } from 'node:crypto';
import { api, fixtureAccount, migrateTestDatabase, startTestServer, testDatabase } from './helpers';

test('real registration, finite single session, role baseline and logout', async () => {
  migrateTestDatabase();
  const db = testDatabase();
  const server = await startTestServer();
  const accounts = [fixtureAccount('auth_a'), fixtureAccount('auth_b'), fixtureAccount('auth_e'), fixtureAccount('auth_race'), fixtureAccount('auth_abort')];
  const password = 'Synthetic123!';
  const elder = { name: '測試長者', nickname: '', relation: '', age: 0, gender: '', address: '', phone: '', emergencyPhone: '', avatarEmoji: '👴' };
  try {
    for (const patch of [{ account: '' }, { account: ' '.repeat(3) }, { account: 'a'.repeat(65) }, { account: 42 },
      { password: 'a'.repeat(129) }, { role: 'admin' }, { elder: null }, { elder: { ...elder, age: 131 } },
      { elder: { ...elder, phone: 'invalid-phone' } }, { elder: { ...elder, name: ' '.repeat(2) } },
      { ownerId: 'forged' }, { accountId: 'forged' }, { isDemo: true }, { elder: { ...elder, _created_by: 'forged' } }]) {
      const result = await api(server.base, '/auth/register', { method: 'POST', body: { account: fixtureAccount(), password, role: 'family', elder, ...patch } });
      assert.equal(result.status, 400, 'invalid registration must be rejected');
    }
    assert.equal((await api(server.base, '/auth/exists?account=a&account=b')).status, 400);
    assert.equal((await api(server.base, '/auth/exists?account=' + 'a'.repeat(65))).status, 400);
    assert.equal((await api(server.base, '/auth/exists')).body.exists, false);
    assert.equal((await api(server.base, '/auth/exists?account=')).body.exists, false);
    assert.equal((await api(server.base, '/auth/otp', { method: 'POST', body: { phone: '+852 1234 5678' } })).status, 201);
    const registered = [];
    for (const [index, account] of accounts.slice(0, 3).entries()) {
      const result = await api(server.base, '/auth/register', { method: 'POST', body: { account, password, role: index === 2 ? 'elder' : 'family', elder } });
      assert.equal(result.status, 201, 'registration status');
      assert.ok(result.requestId); registered.push(result.body);
    }
    const [a, b, e] = registered;
    assert.deepEqual(Object.keys(a).sort(), ['accountId', 'displayName', 'role', 'token']);
    const hashRows = await db`SELECT password_hash FROM memopath_account WHERE id=${a.accountId}`;
    const [salt, digest] = hashRows[0].password_hash.split(':');
    assert.ok(/^[a-f0-9]{32}$/.test(salt) && /^[a-f0-9]{128}$/.test(digest), 'scrypt storage format');
    assert.ok(scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex') === digest, 'fixed scrypt parameters');
    assert.equal((await db`SELECT id FROM memopath_elder WHERE owner_account_id=${a.accountId}`).length, 1);
    assert.equal((await db`SELECT id FROM memopath_elder WHERE owner_account_id=${e.accountId}`).length, 0);
    assert.equal((await api(server.base, '/elders', { token: e.token })).body.items.length, 0);
    assert.equal((await api(server.base, '/settings', { token: e.token })).status, 200);
    assert.equal((await api(server.base, '/dashboard', { token: e.token })).body.elder, null);
    const aElders = (await api(server.base, '/elders', { token: a.token })).body.items;
    assert.equal(aElders.length, 1);
    assert.equal((await api(server.base, '/dashboard?elderId=' + aElders[0].id, { token: b.token })).status, 403);
    assert.equal((await api(server.base, '/elders/' + aElders[0].id, { token: e.token, method: 'PATCH', body: { name: 'forbidden' } })).status, 403);
    const saved = await api(server.base, '/elders/' + aElders[0].id, { token: a.token, method: 'PATCH', body: { address: 'Synthetic saved address' } });
    assert.equal(saved.status, 200); assert.equal(saved.body.address, 'Synthetic saved address');
    const aSetting = { language: 'english', voiceMode: 'standby', lockLayout: true };
    assert.equal((await api(server.base, '/settings', { token: a.token, method: 'PUT', body: aSetting })).status, 200);
    assert.deepEqual((await api(server.base, '/settings', { token: a.token })).body.config, aSetting);
    for (const identity of [b, e]) {
      assert.deepEqual((await api(server.base, '/settings', { token: identity.token })).body.config, { language: 'cantonese', voiceMode: 'default_on', lockLayout: false });
    }
    assert.equal((await api(server.base, '/settings', { token: e.token, method: 'PUT', body: aSetting })).status, 200);
    assert.equal((await api(server.base, '/auth/register', { method: 'POST', body: { account: accounts[0], password, role: 'family', elder } })).status, 409);
    assert.equal((await api(server.base, '/auth/login', { method: 'POST', body: { account: accounts[0], password: 'wrong' } })).status, 401);
    assert.equal((await api(server.base, '/auth/register', { method: 'POST', body: { account: fixtureAccount(), password: 'short', role: 'family', elder } })).status, 400);
    assert.equal((await api(server.base, '/auth/register', { method: 'POST', body: { account: fixtureAccount(), password, role: 'family' } })).status, 400);
    assert.equal((await api(server.base, '/auth/me', { token: 'invalid' })).status, 401);
    assert.equal((await api(server.base, '/auth/me', { token: a.token })).status, 200);
    const login = await api(server.base, '/auth/login', { method: 'POST', body: { account: accounts[0], password } });
    assert.equal(login.status, 201);
    assert.equal((await api(server.base, '/auth/me', { token: a.token })).status, 401);
    assert.equal((await api(server.base, '/auth/me', { token: login.body.token })).status, 200);
    const stored = await db`SELECT session_token_hash, session_expires_at FROM memopath_account WHERE id=${a.accountId}`;
    assert.match(stored[0].session_token_hash, /^[a-f0-9]{64}$/);
    const secondsRemaining = (new Date(stored[0].session_expires_at).getTime() - Date.now()) / 1000;
    assert.ok(secondsRemaining > 86300 && secondsRemaining <= 86400, 'default session lifetime is 24 hours');
    assert.notEqual(stored[0].session_token_hash, login.body.token, 'stored credential must be a digest');
    await db`UPDATE memopath_account SET session_expires_at=now()-interval '1 second' WHERE id=${b.accountId}`;
    assert.equal((await api(server.base, '/auth/me', { token: b.token })).status, 401);
    assert.equal((await api(server.base, '/auth/logout', { method: 'POST', token: login.body.token })).status, 201);
    assert.equal((await api(server.base, '/auth/me', { token: login.body.token })).status, 401);
    // Case-sensitive keys and exact password bytes remain compatible. Unknown
    // ordinary fields strip; controlled identity fields are rejected above.
    const mixedKey = fixtureAccount('AuthCase'); const lowerKey = mixedKey.toLowerCase();
    accounts.push(mixedKey, lowerKey);
    for (const account of [mixedKey, lowerKey]) {
      assert.equal((await api(server.base, '/auth/register', { method: 'POST', body: { account: ' ' + account + ' ', password: ' ExactPass1! ', role: 'family', elder, unknownNote: 'strip me' } })).status, 201);
    }
    assert.equal((await api(server.base, '/auth/login', { method: 'POST', body: { account: mixedKey, password: 'ExactPass1!' } })).status, 401);
    assert.equal((await api(server.base, '/auth/login', { method: 'POST', body: { account: mixedKey, password: ' ExactPass1! ' } })).status, 201);
    const race = await Promise.all([0, 1].map(() => api(server.base, '/auth/register', { method: 'POST', body: { account: accounts[3], password, role: 'family', elder } })));
    assert.deepEqual(race.map(item => item.status).sort(), [201, 409]);
    assert.equal((await db`SELECT id FROM memopath_account WHERE account_key=${accounts[3]}`).length, 1);
    // Trigger failure happens after account+elder inserts inside registration;
    // the entire transaction must roll back, not leave a partial identity.
    await db.unsafe(`CREATE FUNCTION auth_fixture_reject_setting() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF EXISTS (SELECT 1 FROM memopath_account WHERE id=NEW.account_id AND account_key LIKE 'auth_abort_%') THEN
      RAISE EXCEPTION 'Synthetic initialization failure'; END IF; RETURN NEW; END $$`);
    await db.unsafe('CREATE TRIGGER auth_fixture_reject BEFORE INSERT ON memopath_setting FOR EACH ROW EXECUTE FUNCTION auth_fixture_reject_setting()');
    assert.equal((await api(server.base, '/auth/register', { method: 'POST', body: { account: accounts[4], password, role: 'family', elder } })).status, 500);
    assert.equal((await db`SELECT id FROM memopath_account WHERE account_key=${accounts[4]}`).length, 0);
  } finally {
    await server.close();
    await db.unsafe('DROP TRIGGER IF EXISTS auth_fixture_reject ON memopath_setting');
    await db.unsafe('DROP FUNCTION IF EXISTS auth_fixture_reject_setting()');
    const rows = await db`SELECT id FROM memopath_account WHERE account_key IN ${db(accounts)}`;
    for (const row of rows) {
      await db`DELETE FROM memopath_elder WHERE owner_account_id=${row.id}`;
      await db`DELETE FROM memopath_setting WHERE account_id=${row.id}`;
      await db`DELETE FROM memopath_account WHERE id=${row.id}`;
    }
    await db.end({ timeout: 5 });
  }
});

/** Test-only TCP relay forwards real PostgreSQL traffic unchanged, then cuts
 * only this child server's connections. It never stops Docker or other clients,
 * simulates no SQL/HTTP success, and closes all sockets even on failed assertions.
 */
test('runtime database disconnection returns 503 for public and protected auth', async () => {
  const configuration = createRequire(join(process.cwd(), 'package.json'))('./scripts/config.cjs');
  configuration.loadEnvironment();
  const source = new URL(configuration.readConfig(process.env, { requireTestDatabase: true }).DATABASE_URL_TEST);
  const sockets = new Set<Socket>();
  const relay = createServer(incoming => {
    const outgoing = connect({ host: source.hostname, port: Number(source.port || '5432') });
    sockets.add(incoming); sockets.add(outgoing);
    incoming.on('error', () => {}); outgoing.on('error', () => incoming.destroy());
    incoming.on('close', () => { sockets.delete(incoming); outgoing.destroy(); });
    outgoing.on('close', () => { sockets.delete(outgoing); incoming.destroy(); });
    incoming.pipe(outgoing); outgoing.pipe(incoming);
  });
  await new Promise<void>((resolve, reject) => { relay.once('error', reject); relay.listen(0, '127.0.0.1', resolve); });
  const address = relay.address(); assert.ok(address && typeof address !== 'string');
  const target = new URL(source); target.hostname = '127.0.0.1'; target.port = String(address.port);
  let server: Awaited<ReturnType<typeof startTestServer>> | undefined;
  try {
    server = await startTestServer(3103, target.toString());
    await new Promise<void>(resolve => { relay.close(() => resolve()); for (const socket of sockets) socket.destroy(); });
    const routes = [
      { route: '/auth/exists?account=synthetic', options: {} },
      { route: '/auth/login', options: { method: 'POST', body: { account: 'synthetic', password: 'invalid' } } },
      { route: '/auth/register', options: { method: 'POST', body: { account: fixtureAccount('fault'), password: 'Synthetic123!', role: 'family', elder: { name: 'Synthetic' } } } },
      { route: '/auth/me', options: { token: '00000000-0000-4000-8000-000000000001' } },
      { route: '/auth/logout', options: { method: 'POST', token: '00000000-0000-4000-8000-000000000001' } },
    ];
    for (const { route, options } of routes) {
      const result = await api(server.base, route, options);
      assert.equal(result.status, 503, 'DB disconnection must not masquerade as invalid credentials or success');
      assert.ok(result.requestId);
      const publicError = JSON.stringify(result.body);
      assert.ok(!publicError.includes(source.password) && !publicError.includes('stack') && !publicError.includes('cause'), 'failure response is sanitized');
    }
  } finally {
    for (const socket of sockets) socket.destroy();
    if (relay.listening) await new Promise<void>(resolve => relay.close(() => resolve()));
    await server?.close();
  }
});
