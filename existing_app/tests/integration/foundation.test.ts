/** Shared database boundary checks before business services are adapted.
 * DDL fault injection is transaction-scoped and always rolled back. The test
 * database guard runs before connecting; development/restore DBs are protected.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { testDatabase, migrateTestDatabase } from './helpers';
const migration = createRequire(join(process.cwd(), 'package.json'))('./scripts/db.cjs');

test('0001 actual schema, drift rejection and transaction rollback', async () => {
  migrateTestDatabase();
  const client = testDatabase();
  const files = migration.migrationFiles();
  try {
    await migration.assertSchema(client, files, '0001');
    assert.equal((await migration.databaseState(client, files)).length, 2);
    await assert.rejects(migration.assertSchema(client, files, '0000'), /incompatible/);
    const drifted = files.map((file: object) => ({ ...file, sqlHash: '0'.repeat(64) }));
    await assert.rejects(migration.databaseState(client, drifted), /drift/);
    const rollback = new Error('Expected rollback');
    await assert.rejects(client.begin(async transaction => {
      await transaction`ALTER TABLE memopath_account DROP COLUMN display_name CASCADE`;
      await assert.rejects(migration.assertSchema(transaction, files, '0001'), /column incompatible/);
      throw rollback;
    }), error => error === rollback);
    await migration.assertSchema(client, files, '0001');
    await assert.rejects(client.begin(async transaction => {
      await transaction`CREATE TABLE foundation_unknown (id integer)`;
      await assert.rejects(migration.databaseState(transaction, files), /tables drift/);
      throw rollback;
    }), error => error === rollback);
    await migration.assertSchema(client, files, '0001');
  } finally { await client.end({ timeout: 5 }); }
});
