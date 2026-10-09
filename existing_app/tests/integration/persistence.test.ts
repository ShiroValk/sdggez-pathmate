/** Complete business fields are stored in real PostgreSQL and survive an
 * actual process restart; no fake save or in-memory persistence is accepted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, startTestServer } from './helpers';
import { businessFixture } from './business-fixtures';

test('real vitals API distinguishes zero, positive steps and no record', async () => {
  const f = await businessFixture();
  try {
    for (const steps of [0, 1250]) {
      await f.db`DELETE FROM memopath_vital WHERE elder_id=${f.elder.id}`;
      await f.db`INSERT INTO memopath_vital(elder_id,heart_rate,blood_oxygen,temperature,steps,_created_by,_updated_by) VALUES(${f.elder.id},70,98,'36.5',${steps},${f.a.accountId},${f.a.accountId})`;
      const response = await api(f.server.base, '/vitals?elderId=' + f.elder.id, { token: f.a.token });
      assert.equal(response.status, 200);
      assert.equal(response.body.latest.steps, steps);
    }
    await f.db`DELETE FROM memopath_vital WHERE elder_id=${f.elder.id}`;
    const missing = await api(f.server.base, '/vitals?elderId=' + f.elder.id, { token: f.a.token });
    assert.equal(missing.status, 200);
    assert.equal(missing.body.latest, null);
  } finally { await f.close(); }
});
test('all existing editable resources survive restart with field meaning intact', async () => {
  const f = await businessFixture(); let restarted: Awaited<ReturnType<typeof startTestServer>> | undefined;
  const call = (route: string, method = 'GET', body?: unknown) => api(restarted?.base ?? f.server.base, route, { token: f.a.token, method, body });
  try {
    const elder = { name: '持久化長者', nickname: 'Fixture', relation: '親人', age: 75, gender: '女', address: 'Synthetic address', phone: '+852 1234 5678', emergencyPhone: '', avatarEmoji: '👵' };
    const contact = { name: 'Fixture contact', relation: '親人', phone: '(852) 1234-5678', avatarEmoji: '👤' };
    const trip = { elderId: f.elder.id, destination: 'Synthetic destination', tripDate: '2026-10-05', startTime: '09:00', endTime: '10:00', scheduleMode: 'manual' };
    const setting = { language: 'english', voiceMode: 'standby', lockLayout: true };
    const fence = { homeLabel: 'Fixture home', radiusM: 950, dwellEnabled: false, dwellMinutes: 20 };
    const place = { elderId: f.elder.id, label: 'Fixture place', icon: '📍', placeType: 'beacon', beaconStatus: 'strange', address: 'Synthetic place address', lng: 114.1, lat: 22.3 };
    assert.equal((await call('/elders/' + f.elder.id, 'PATCH', elder)).status, 200);
    const c = await call('/elders/' + f.elder.id + '/contacts', 'POST', contact); assert.equal(c.status, 201);
    const t = await call('/trips', 'POST', trip); assert.equal(t.status, 201);
    assert.equal((await call('/settings', 'PUT', setting)).status, 200);
    assert.equal((await call('/geofences/' + f.elder.id, 'PUT', fence)).status, 200);
    const p = await call('/places', 'POST', place); assert.equal(p.status, 201);
    // These assertions intentionally expose the current 0000 address/coordinate loss.
    assert.equal(p.body.address, place.address); assert.equal(p.body.lng, place.lng); assert.equal(p.body.lat, place.lat);
    await f.server.close(); restarted = await startTestServer();
    const select = (actual: Record<string, unknown>, expected: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value, 'persistent field: ' + key);
    };
    select((await call('/elders')).body.items[0], elder);
    select((await call('/elders/' + f.elder.id + '/contacts')).body.items.find((item: { id: string }) => item.id === c.body.id), contact);
    select((await call('/trips?elderId=' + f.elder.id)).body.items.find((item: { id: string }) => item.id === t.body.id), trip);
    assert.deepEqual((await call('/settings')).body.config, setting);
    select((await call('/geofences/' + f.elder.id)).body, fence);
    select((await call('/places?elderId=' + f.elder.id)).body.items.find((item: { id: string }) => item.id === p.body.id), place);
    const zero = await call('/places', 'POST', { elderId: f.elder.id, label: 'Real zero', lng: 0, lat: 0 });
    assert.equal(zero.status, 201);
    const row = await f.db`SELECT lng,lat FROM memopath_place WHERE id=${zero.body.id}`;
    assert.equal(row[0].lng, 0); assert.equal(row[0].lat, 0);
    const unset = await call('/places', 'POST', { elderId: f.elder.id, label: 'Unset position' });
    const unsetRow = await f.db`SELECT lng,lat FROM memopath_place WHERE id=${unset.body.id}`;
    assert.equal(unsetRow[0].lng, null); assert.equal(unsetRow[0].lat, null);
    assert.equal((await api(restarted.base, '/places?elderId=' + f.elder.id, { token: f.b.token })).status, 403);
    for (const table of ['memopath_elder_contact', 'memopath_trip', 'memopath_place', 'memopath_geofence']) {
      const actors = await f.db.unsafe('SELECT _created_by,_updated_by FROM ' + table + ' WHERE elder_id=$1', [f.elder.id]);
      for (const actor of actors) { assert.equal(actor._created_by, f.a.accountId); assert.equal(actor._updated_by, f.a.accountId); }
    }
    // Real SQL failure during a cascaded composite delete must roll back even
    // if PostgreSQL has already started deleting other child resources.
    await f.db.unsafe(`CREATE FUNCTION persistence_fixture_reject() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF OLD.elder_id = '${f.elder.id}'::uuid THEN RAISE EXCEPTION 'Synthetic persistence failure'; END IF; RETURN OLD; END $$`);
    await f.db.unsafe('CREATE TRIGGER persistence_fixture_reject BEFORE DELETE ON memopath_trip FOR EACH ROW EXECUTE FUNCTION persistence_fixture_reject()');
    assert.equal((await call('/elders/' + f.elder.id, 'DELETE')).status, 500);
    assert.equal((await call('/elders')).body.items[0].id, f.elder.id);
    assert.equal((await call('/trips?elderId=' + f.elder.id)).body.items.length, 1);
    assert.equal((await call('/elders/' + f.elder.id + '/contacts')).body.items.length, 1);
    assert.equal((await call('/places?elderId=' + f.elder.id)).body.items.length, 3);
  } finally {
    await restarted?.close();
    await f.db.unsafe('DROP TRIGGER IF EXISTS persistence_fixture_reject ON memopath_trip');
    await f.db.unsafe('DROP FUNCTION IF EXISTS persistence_fixture_reject()');
    await f.close();
  }
});

test('place edit and delete are authorized persistent service operations', async () => {
  const f = await businessFixture(); let restarted: Awaited<ReturnType<typeof startTestServer>> | undefined;
  try {
    const created = await api(f.server.base, '/places', { token: f.a.token, method: 'POST', body: {
      elderId: f.elder.id, label: 'Before edit', address: 'Before address', icon: '📍', placeType: 'frequent', beaconStatus: 'safe', lng: 114.1, lat: 22.3,
    } });
    assert.equal(created.status, 201);
    const patch = { label: 'After edit', address: 'After address', icon: '🏥', lng: 0, lat: 0 };
    const updated = await api(f.server.base, `/places/${created.body.id}`, { token: f.a.token, method: 'PATCH', body: patch });
    assert.equal(updated.status, 200); assert.equal(updated.body.id, created.body.id);
    for (const [key, value] of Object.entries(patch)) assert.equal(updated.body[key], value);
    assert.equal((await api(f.server.base, `/places/${created.body.id}`, { token: f.b.token, method: 'PATCH', body: { label: 'Denied' } })).status, 403);
    assert.equal((await api(f.server.base, `/places/${created.body.id}`, { token: f.b.token, method: 'DELETE' })).status, 403);
    assert.equal((await api(f.server.base, `/places/${created.body.id}`, { token: f.a.token, method: 'PATCH', body: {} })).status, 400);
    const audit = await f.db`SELECT _updated_by,lng,lat FROM memopath_place WHERE id=${created.body.id}`;
    assert.equal(audit[0]._updated_by, f.a.accountId); assert.equal(audit[0].lng, 0); assert.equal(audit[0].lat, 0);
    await f.server.close(); restarted = await startTestServer();
    const afterRestart = await api(restarted.base, `/places?elderId=${f.elder.id}`, { token: f.a.token });
    const persisted = afterRestart.body.items.find((item: { id: string }) => item.id === created.body.id);
    assert.equal(persisted.label, 'After edit'); assert.equal(persisted.address, 'After address');
    assert.equal((await api(restarted.base, `/places/${created.body.id}`, { token: f.a.token, method: 'DELETE' })).status, 200);
    const removed = await api(restarted.base, `/places?elderId=${f.elder.id}`, { token: f.a.token });
    assert.ok(!removed.body.items.some((item: { id: string }) => item.id === created.body.id));
  } finally { await restarted?.close(); await f.close(); }
});
