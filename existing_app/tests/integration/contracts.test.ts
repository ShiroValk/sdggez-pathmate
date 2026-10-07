/** 25 supported contracts: status, public field meaning, defaults/wrappers,
 * read-only empty data and simulated-cab persistence use real SQL/HTTP.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, fixtureAccount } from './helpers';
import { businessFixture } from './business-fixtures';
test('all 25 existing API contracts retain methods, statuses and field meanings', async () => {
  const f = await businessFixture(); const covered = new Set<string>(); let token = f.a.token;
  async function check(label: string, route: string, status: number, method = 'GET', body?: unknown, authenticated = true) {
    const result = await api(f.server.base, route, { method, body, token: authenticated ? token : undefined });
    assert.equal(result.status, status, label); assert.ok(result.requestId); covered.add(label); return result.body;
  }
  try {
    const otp = await check('01', '/auth/otp', 201, 'POST', { phone: '+852 0000 0000' }, false);
    assert.deepEqual(Object.keys(otp).sort(), ['code', 'expiresIn']); assert.equal(typeof otp.code, 'string');
    assert.equal((await check('02', '/auth/exists?account=' + f.keys[0], 200, 'GET', undefined, false)).exists, true);
    const registeredKey = fixtureAccount('contract_registration'); f.keys.push(registeredKey);
    const registration = await check('03', '/auth/register', 201, 'POST', { account: registeredKey, password: 'Synthetic123!', role: 'elder', elder: { name: 'Contract registration' } }, false);
    assert.deepEqual(Object.keys(registration).sort(), ['accountId', 'displayName', 'role', 'token']);
    assert.equal(registration.role, 'elder'); assert.equal(typeof registration.token, 'string');
    const login = await check('04', '/auth/login', 201, 'POST', { account: f.keys[0], password: 'Synthetic123!' }, false);
    assert.deepEqual(Object.keys(login).sort(), ['accountId', 'displayName', 'role', 'token']); token = login.token;
    const me = await check('05', '/auth/me', 200); assert.equal(me.role, 'family'); assert.ok(!('token' in me) && !('passwordHash' in me));
    const elders = await check('07', '/elders', 200); assert.ok(Array.isArray(elders.items));
    const extra = await check('08', '/elders', 201, 'POST', { name: 'Extra contract elder', nickname: '', age: 0 });
    assert.equal(extra.age, 0); assert.equal(extra.nickname, ''); assert.ok(!('ownerAccountId' in extra));
    assert.equal((await check('09', '/elders/' + extra.id, 200, 'PATCH', { name: 'Patched contract elder' })).name, 'Patched contract elder');
    const contact = await check('12', '/elders/' + f.elder.id + '/contacts', 201, 'POST', { name: 'Contract contact', phone: '', relation: '' });
    assert.equal(contact.phone, ''); assert.equal(contact.elderId, f.elder.id);
    assert.equal((await check('11', '/elders/' + f.elder.id + '/contacts', 200)).items[0].id, contact.id);
    const dashboard = await check('13', '/dashboard?elderId=' + f.elder.id, 200);
    assert.deepEqual(Object.keys(dashboard).sort(), ['elder', 'latestAlert', 'latestVital', 'places', 'todayTrips']);
    assert.equal(dashboard.latestVital, null);
    const trip = await check('15', '/trips', 201, 'POST', { elderId: f.elder.id, destination: 'Contract destination', tripDate: '2026-10-05', startTime: '', endTime: '' });
    assert.equal(trip.tripDate, '2026-10-05'); assert.equal(trip.startTime, ''); assert.equal(trip.status, 'pending');
    assert.equal((await check('14', '/trips?elderId=' + f.elder.id, 200)).items[0].id, trip.id);
    assert.equal((await check('16', '/trips/' + trip.id + '/call', 201, 'POST')).status, 'cab_called');
    assert.deepEqual((await check('17', '/settings', 200)).config, { language: 'cantonese', voiceMode: 'default_on', lockLayout: false });
    const setting = { language: 'english', voiceMode: 'standby', lockLayout: true };
    assert.deepEqual((await check('18', '/settings', 200, 'PUT', setting)).config, setting);
    const stored = await f.db`SELECT config FROM memopath_setting WHERE account_id=${f.a.accountId}`;
    assert.deepEqual(stored[0].config, { language: 'english', voice_mode: 'standby', lock_layout: true });
    const defaultFence = await check('19', '/geofences/' + f.elder.id, 200);
    assert.equal(defaultFence.id, ''); assert.equal(defaultFence.radiusM, 800); assert.equal(defaultFence.dwellEnabled, true); assert.equal(defaultFence.dwellMinutes, 18);
    assert.equal((await check('20', '/geofences/' + f.elder.id, 200, 'PUT', { radiusM: 900 })).radiusM, 900);
    const place = await check('22', '/places', 201, 'POST', { elderId: f.elder.id, label: 'Legacy place' });
    assert.equal(place.address, ''); assert.equal(place.lng, 0); assert.equal(place.lat, 0);
    assert.equal((await check('21', '/places?elderId=' + f.elder.id, 200)).items[0].id, place.id);
    assert.deepEqual((await check('23', '/alerts?elderId=' + f.elder.id, 200)).items, []);
    assert.deepEqual(await check('24', '/vitals?elderId=' + f.elder.id, 200), { latest: null, trend: [] });
    assert.deepEqual((await check('25', '/movements?elderId=' + f.elder.id, 200)).items, []);
    const invalid = await api(f.server.base, '/dashboard?elderId=invalid', { token });
    assert.equal(invalid.status, 404); assert.equal(invalid.body.error.code, 'NOT_FOUND');
    const forbidden = await api(f.server.base, '/dashboard?elderId=' + f.elder.id, { token: f.b.token });
    assert.equal(forbidden.status, 403); assert.equal(forbidden.body.error.code, 'FORBIDDEN');
    assert.equal(typeof (await check('10', '/elders/' + extra.id, 200, 'DELETE')).message, 'string');
    assert.equal(typeof (await check('06', '/auth/logout', 201, 'POST')).message, 'string');
    assert.equal(covered.size, 25);
  } finally { await f.close(); }
});
