/** Real synthetic A/B/E accounts; cleanup only this fixture's random keys.
 * Tests never reset schemas, stop Docker or log credentials/resource payloads.
 */
import assert from 'node:assert/strict';
import { api, fixtureAccount, migrateTestDatabase, startTestServer, testDatabase } from './helpers';
export async function businessFixture(port = 3102) {
  migrateTestDatabase();
  const db = testDatabase();
  const server = await startTestServer(port);
  const keys = ['care_a', 'care_b', 'care_e', 'care_other_e'].map(fixtureAccount);
  const identities: { accountId: string; token: string }[] = [];
  async function close() {
    await server.close();
    const rows = await db`SELECT id FROM memopath_account WHERE account_key IN ${db(keys)}`;
    // Remove all owned elders first: cross-fixture care invitations can target
    // another fixture account with RESTRICT, independently of row order.
    for (const row of rows) {
      await db`DELETE FROM memopath_elder WHERE owner_account_id=${row.id}`;
    }
    for (const row of rows) {
      await db`DELETE FROM memopath_setting WHERE account_id=${row.id}`;
      await db`DELETE FROM memopath_account WHERE id=${row.id}`;
    }
    await db.end({ timeout: 5 });
  }
  try {
    for (const [index, account] of keys.entries()) {
      const result = await api(server.base, '/auth/register', { method: 'POST', body: {
        account, password: 'Synthetic123!', role: index >= 2 ? 'elder' : 'family', elder: { name: '權限測試長者' },
      } });
      assert.equal(result.status, 201); identities.push(result.body);
    }
    const elder = (await api(server.base, '/elders', { token: identities[0].token })).body.items[0];
    return { db, server, keys, a: identities[0], b: identities[1], e: identities[2], otherE: identities[3], elder, close };
  } catch (error) { await close(); throw error; }
}
