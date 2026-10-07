/** Trusted server identity. Never construct from client owner/role fields or
 * replace an elder identity with the family owner's ID. Access is rechecked by
 * ElderService; account settings always belong to accountId itself.
 */
export interface MemoPrincipal {
  accountId: string;
  accountKey: string;
  role: 'family' | 'elder';
  isDemo: boolean;
  displayName: string;
}

import type { PostgresJsDatabase } from '@server/database/database.module';
export type MemoTransaction = Parameters<Parameters<PostgresJsDatabase['transaction']>[0]>[0];
