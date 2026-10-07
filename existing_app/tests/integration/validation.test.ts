/** Invalid boundary input must return the public contract status and leave
 * owned data unchanged; ordinary unknown fields retain whitelist semantics.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './helpers';
import { businessFixture } from './business-fixtures';
test('body, nested, path, query, token and coupled input boundaries', async () => {
  const f = await businessFixture();
  const call = (route: string, method = 'GET', body?: unknown) => api(f.server.base, route, { token: f.a.token, method, body });
  try {
    for (const route of ['/elders/not-a-uuid', '/geofences/not-a-uuid']) {
      assert.equal((await call(route, route.startsWith('/elders') ? 'PATCH' : 'GET', route.startsWith('/elders') ? { name: 'Bad' } : undefined)).status, 404);
    }
    for (const resource of ['trips', 'places', 'alerts', 'vitals', 'movements']) {
      assert.equal((await call('/' + resource)).status, 400);
      assert.equal((await call('/' + resource + '?elderId=invalid')).status, 404);
      assert.equal((await call('/' + resource + '?elderId=' + f.elder.id + '&elderId=' + f.elder.id)).status, 404);
    }
    // Fetch normalizes outer HTTP whitespace; use an internal space so the
    // malformed token actually reaches the guard unchanged.
    for (const token of ['invalid', f.a.token.slice(0, 8) + ' ' + f.a.token.slice(8), f.a.token + ',' + f.b.token]) {
      assert.equal((await api(f.server.base, '/auth/me', { token })).status, 401);
    }
    const cases = [
      { route: '/elders/' + f.elder.id, method: 'PATCH', bodies: [{ name: ' ' }, { age: 131 }, { age: 1.5 }, { phone: 'abc' }, { nickname: 'a'.repeat(101) }, { ownerAccountId: f.b.accountId }, { _created_by: f.b.accountId }] },
      { route: '/elders/' + f.elder.id + '/contacts', method: 'POST', bodies: [{ name: '' }, { name: 'x', phone: 'a' }, { name: 'x', relation: 'a'.repeat(101) }] },
      { route: '/trips', method: 'POST', base: { elderId: f.elder.id, destination: 'Fixture', tripDate: '2026-10-05' }, bodies: [{ tripDate: '2026-02-30' }, { tripDate: '2026-13-01' }, { startTime: '25:00' }, { startTime: '9:00' }, { startTime: '12:00', endTime: '11:00' }, { scheduleMode: 'unknown' }] },
      { route: '/geofences/' + f.elder.id, method: 'PUT', bodies: [{ radiusM: 99 }, { radiusM: 5001 }, { dwellMinutes: 121 }, { dwellEnabled: 'false' }, { homeLabel: 'x'.repeat(101) }] },
      { route: '/places', method: 'POST', base: { elderId: f.elder.id, label: 'Fixture' }, bodies: [{ label: ' ' }, { lng: 1 }, { lat: 1 }, { lng: 181, lat: 0 }, { lng: 0, lat: -91 }, { lng: '1', lat: 2 }, { address: 'x'.repeat(256) }, { placeType: 'unknown' }, { beaconStatus: 'unknown' }] },
      { route: '/settings', method: 'PUT', base: { language: 'english', voiceMode: 'standby', lockLayout: true }, bodies: [{ lockLayout: 'true' }, { language: 'unknown' }, { accountId: f.b.accountId }] },
    ];
    const counts = async () => {
      const rows = await f.db`SELECT (SELECT count(*) FROM memopath_trip WHERE elder_id=${f.elder.id})::int AS trips,
        (SELECT count(*) FROM memopath_place WHERE elder_id=${f.elder.id})::int AS places,
        (SELECT count(*) FROM memopath_elder_contact WHERE elder_id=${f.elder.id})::int AS contacts`;
      return rows[0];
    };
    const before = await counts();
    for (const item of cases) for (const body of item.bodies) {
      assert.equal((await call(item.route, item.method, { ...('base' in item ? item.base : {}), ...body })).status, 400, 'invalid input must reject before write: ' + item.route.split('?')[0] + ' / ' + Object.keys(body).join(','));
    }
    assert.deepEqual(await counts(), before);
    assert.equal((await call('/elders/' + f.elder.id, 'PATCH', { nickname: '', age: 0, unknownNote: 'strip' })).status, 200);
    assert.equal((await call('/geofences/' + f.elder.id, 'PUT', { radiusM: 900 })).status, 200);
    assert.equal((await call('/geofences/' + f.elder.id, 'PUT', { dwellEnabled: false })).body.radiusM, 900);
    // A compound failure after account creation must roll back all related rows.
    assert.equal((await api(f.server.base, '/auth/register', { method: 'POST', body: { account: f.keys[0] + '_bad', password: 'Synthetic123!', role: 'family', elder: { name: 'Invalid', age: 131 } } })).status, 400);
    assert.equal((await f.db`SELECT id FROM memopath_account WHERE account_key=${f.keys[0] + '_bad'}`).length, 0);
  } finally { await f.close(); }
});
