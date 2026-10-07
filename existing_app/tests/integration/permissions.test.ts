/** Contract matrix: real sessions/SQL, explicit consent, revoke races and
 * domain isolation. Missing endpoints fail rather than being skipped.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './helpers';
import { businessFixture } from './business-fixtures';
test('care consent and all protected resource permissions', async () => {
  const f = await businessFixture(); const { server, a, b, e, elder } = f;
  const call = (route: string, token = a.token, method = 'GET', body?: unknown) => api(server.base, route, { token, method, body });
  const reads = [`/elders/${elder.id}/contacts`, `/dashboard?elderId=${elder.id}`, `/trips?elderId=${elder.id}`,
    `/geofences/${elder.id}`, `/places?elderId=${elder.id}`, `/alerts?elderId=${elder.id}`, `/vitals?elderId=${elder.id}`, `/movements?elderId=${elder.id}`];
  try {
    assert.equal((await call('/elders', e.token)).body.items.length, 0);
    assert.equal((await call('/dashboard', e.token)).body.elder, null);
    for (const route of reads) {
      assert.equal((await call(route)).status, 200);
      assert.equal((await call(route, b.token)).status, 403);
      assert.equal((await call(route, e.token)).status, 403);
      assert.equal((await api(server.base, route)).status, 401);
    }
    const trip = await call('/trips', a.token, 'POST', { elderId: elder.id, destination: 'Fixture', tripDate: '2026-10-05' });
    assert.equal(trip.status, 201);
    const management = [
      { route: '/elders', method: 'POST', body: { name: 'Forbidden' } },
      { route: '/elders/' + elder.id, method: 'PATCH', body: { name: 'Forbidden' } },
      { route: '/elders/' + elder.id, method: 'DELETE' },
      { route: `/elders/${elder.id}/contacts`, method: 'POST', body: { name: 'Fixture' } },
      { route: '/trips', method: 'POST', body: { elderId: elder.id, destination: 'Fixture', tripDate: '2026-10-05' } },
      { route: `/geofences/${elder.id}`, method: 'PUT', body: { radiusM: 900 } },
      { route: '/places', method: 'POST', body: { elderId: elder.id, label: 'Fixture' } },
    ];
    for (const item of management) assert.equal((await call(item.route, e.token, item.method, item.body)).status, 403);
    // 21 existing protected contracts: 8 reads + 7 management + these 6.
    for (const item of [...management, { route: '/elders', method: 'GET' }, { route: '/auth/me', method: 'GET' },
      { route: '/auth/logout', method: 'POST' }, { route: '/settings', method: 'GET' },
      { route: '/settings', method: 'PUT', body: { language: 'english', voiceMode: 'standby', lockLayout: true } },
      { route: `/trips/${trip.body.id}/call`, method: 'POST' }]) {
      assert.equal((await api(server.base, item.route, { method: item.method, body: 'body' in item ? item.body : undefined })).status, 401);
    }
    assert.equal((await call('/care-links/invitations', b.token, 'POST', { elderId: elder.id, elderAccount: f.keys[2] })).status, 403);
    assert.equal((await call('/care-links/invitations', a.token, 'POST', { elderId: elder.id, elderAccount: f.keys[1] })).status, 409);
    for (const body of [{ ownerId: b.accountId }, { role: 'family' }, { isDemo: true }]) {
      assert.equal((await call('/care-links/invitations', a.token, 'POST', { elderId: elder.id, elderAccount: f.keys[2], ...body })).status, 400);
    }
    const invite = async () => {
      const result = await call('/care-links/invitations', a.token, 'POST', { elderId: elder.id, elderAccount: f.keys[2] });
      assert.equal(result.status, 201); assert.match(result.body.code, /^[A-Za-z0-9_-]{43}$/); return result.body;
    };
    const old = await invite(); const replacement = await invite();
    const digest = await f.db`SELECT code_hash FROM memopath_care_invitation WHERE id=${replacement.invitationId}`;
    assert.match(digest[0].code_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(digest[0].code_hash, replacement.code);
    assert.equal((await call('/care-links/accept', e.token, 'POST', { code: old.code, confirm: true })).status, 409);
    assert.equal((await call('/care-links/invitations/preview', b.token, 'POST', { code: replacement.code })).status, 403);
    const preview = await call('/care-links/invitations/preview', e.token, 'POST', { code: replacement.code });
    assert.equal((await call('/care-links/invitations/preview', f.otherE.token, 'POST', { code: replacement.code })).status, 409);
    assert.equal((await call('/care-links/accept', f.otherE.token, 'POST', { code: replacement.code, confirm: true })).status, 409);
    assert.equal(preview.status, 200); assert.equal(preview.body.elder.id, elder.id);
    assert.equal((await call('/care-links/accept', e.token, 'POST', { code: replacement.code, confirm: 'true' })).status, 400);
    assert.equal((await call('/care-links/accept', e.token, 'POST', { code: replacement.code, confirm: false })).status, 400);
    const concurrent = await Promise.all([0, 1].map(() => call('/care-links/accept', e.token, 'POST', { code: replacement.code, confirm: true })));
    assert.deepEqual(concurrent.map(item => item.status).sort(), [201, 409]);
    const link = concurrent.find(item => item.status === 201)!.body;
    const linkList = await call('/care-links', e.token);
    assert.equal(linkList.body.items.length, 1);
    assert.ok(!JSON.stringify(linkList.body).includes(replacement.code));
    assert.equal((await call('/care-links', b.token)).body.items.length, 0);
    assert.equal((await call('/elders', e.token)).body.items[0].id, elder.id);
    for (const route of reads) assert.equal((await call(route, e.token)).status, 200);
    for (const item of management) assert.equal((await call(item.route, e.token, item.method, item.body)).status, 403);
    assert.equal((await call(`/trips/${trip.body.id}/call`, e.token, 'POST')).status, 201);
    assert.equal((await call(`/trips/${trip.body.id}/call`, b.token, 'POST')).status, 403);
    await call('/settings', a.token, 'PUT', { language: 'english', voiceMode: 'standby', lockLayout: true });
    assert.equal((await call('/settings', e.token)).body.config.language, 'cantonese');
    assert.equal((await call('/care-links/' + link.id, b.token, 'DELETE')).status, 403);
    assert.equal((await call('/care-links/' + link.id, e.token, 'DELETE')).status, 200);
    for (const route of reads) assert.equal((await call(route, e.token)).status, 403);
    const expired = await invite();
    await f.db`UPDATE memopath_care_invitation SET expires_at=now()-interval '1 second' WHERE id=${expired.invitationId}`;
    assert.equal((await call('/care-links/accept', e.token, 'POST', { code: expired.code, confirm: true })).status, 409);
    const revoked = await invite();
    assert.equal((await call('/care-links/invitations/' + revoked.invitationId, a.token, 'DELETE')).status, 200);
    assert.equal((await call('/care-links/accept', e.token, 'POST', { code: revoked.code, confirm: true })).status, 409);
    await f.db`UPDATE memopath_account SET is_demo=true WHERE id=${e.accountId}`;
    assert.equal((await call('/care-links/invitations', a.token, 'POST', { elderId: elder.id, elderAccount: f.keys[2] })).status, 409);
    await f.db`UPDATE memopath_account SET is_demo=false WHERE id=${e.accountId}`;
    const final = await invite(); const accepted = await call('/care-links/accept', e.token, 'POST', { code: final.code, confirm: true });
    assert.equal(accepted.status, 201);
    const revokeRace = await Promise.all([
      call('/care-links/' + accepted.body.id, a.token, 'DELETE'),
      call(`/trips/${trip.body.id}/call`, e.token, 'POST'),
    ]);
    assert.equal(revokeRace[0].status, 200);
    assert.ok([201, 403].includes(revokeRace[1].status));
    assert.equal((await call(`/trips/${trip.body.id}/call`, e.token, 'POST')).status, 403);
    const deleting = await invite();
    assert.equal((await call('/care-links/accept', e.token, 'POST', { code: deleting.code, confirm: true })).status, 201);
    assert.equal((await call('/elders/' + elder.id, a.token, 'DELETE')).status, 200);
    assert.equal((await call('/elders', e.token)).body.items.length, 0);
    assert.equal((await call('/auth/me', e.token)).status, 200);
    assert.equal((await call('/dashboard?elderId=' + elder.id, e.token)).status, 404);
  } finally { await f.close(); }
});
