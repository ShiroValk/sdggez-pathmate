/** Trust boundary for the unchanged single UUID header. DB failures propagate
 * to the 503 filter, never masquerade as expired authentication. No owner alias.
 */
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { memopathAccount } from '@server/database/schema';
import { and, eq, gt, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import type { MemoPrincipal } from './principal';
export type MemoAccountSession = MemoPrincipal;
export interface MemoAuthedRequest { memoAccount: MemoPrincipal; }

@Injectable()
export class MemoPathSessionGuard implements CanActivate {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase, private readonly config: ConfigService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; rawHeaders?: string[]; memoAccount?: MemoPrincipal }>();
    const token = req.headers['x-memopath-token'];
    const occurrences = (req.rawHeaders ?? []).filter((value, index) => index % 2 === 0 && value.toLowerCase() === 'x-memopath-token').length;
    if (typeof token !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(token) || occurrences > 1) throw new UnauthorizedException('請先登入');
    const digest = createHash('sha256').update(token).digest('hex');
    const [row] = await this.db.select().from(memopathAccount).where(and(eq(memopathAccount.sessionTokenHash, digest), gt(memopathAccount.sessionExpiresAt, sql`now()`))).limit(1);
    if (!row || (row.isDemo && !this.config.get<boolean>('DEMO_ACCOUNT_ENABLED'))) throw new UnauthorizedException('登入已過期，請重新登入');
    req.memoAccount = { accountId: row.id, accountKey: row.accountKey, role: row.role as MemoPrincipal['role'], isDemo: row.isDemo, displayName: row.displayName };
    return true;
  }
}
