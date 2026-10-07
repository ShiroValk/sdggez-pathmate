/** Password/session owner and registration orchestrator. Elder and Family
 * services own their data initialization within the same explicit transaction.
 * All public results retain the original shape; no password/hash is returned.
 */
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { memopathAccount } from '@server/database/schema';
import { eq, sql } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { MemoPathLoginResponse, MemoPathOtpResponse, MemoPathRegisterRequest } from '@shared/api.interface';
import { MemoPathElderService } from './elder.service';
import { MemoPathFamilyService } from './family.service';
import type { MemoPrincipal } from './principal';

const DEMO_ACCOUNT_KEY = 'demo';
const DEMO_PASSWORD = 'demo1234';
const scryptParameters = { N: 16384, r: 8, p: 1 };

/** Preserve salt:hash format and exact password bytes; only DB stores this. */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64, scryptParameters).toString('hex')}`;
}
function verifyPassword(password: string, stored: string): boolean {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) return false;
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(password, salt, 64, scryptParameters);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}
export function sessionDigest(token: string): string { return createHash('sha256').update(token).digest('hex'); }
function principal(row: typeof memopathAccount.$inferSelect): MemoPrincipal {
  return { accountId: row.id, accountKey: row.accountKey, role: row.role as MemoPrincipal['role'], isDemo: row.isDemo, displayName: row.displayName };
}
/** postgres-js may wrap SQL errors in cause; inspect only codes, never log it. */
function uniqueConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: string; cause?: unknown };
  return value.code === '23505' || (value.cause !== error && uniqueConflict(value.cause));
}

@Injectable()
export class MemoPathAuthService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly config: ConfigService,
    private readonly elderService: MemoPathElderService,
    private readonly familyService: MemoPathFamilyService,
  ) {}

  /** Clearly simulated OTP response; no SMS or phone verification occurs. */
  async issueOtp(): Promise<MemoPathOtpResponse> { return { code: String(Math.floor(100000 + Math.random() * 900000)), expiresIn: 300 }; }

  /** Atomic account, private settings, optional family elder and session. */
  async register(dto: MemoPathRegisterRequest): Promise<MemoPathLoginResponse> {
    const key = dto.account.trim();
    if (key === DEMO_ACCOUNT_KEY) throw new ConflictException('演示帳號保留供演示登入');
    const token = randomUUID();
    const passwordHash = hashPassword(dto.password);
    try {
      return await this.db.transaction(async tx => {
        const [row] = await tx.insert(memopathAccount).values({ accountKey: key, passwordHash, role: dto.role, displayName: dto.elder.name,
          sessionTokenHash: sessionDigest(token), sessionExpiresAt: sql`now() + ${this.config.get<number>('SESSION_TTL_SECONDS')} * interval '1 second'` }).returning();
        const actor = principal(row);
        if (actor.role === 'family') await this.elderService.createInTransaction(tx, actor, dto.elder);
        await this.familyService.initializeSetting(tx, actor);
        return { accountId: row.id, role: actor.role, displayName: row.displayName, token };
      });
    } catch (error) { if (uniqueConflict(error)) throw new ConflictException('該帳號已存在，請直接登入'); throw error; }
  }

  async accountExists(accountKey: string): Promise<boolean> {
    const key = accountKey.trim();
    if (!key) return false;
    return (await this.db.select({ id: memopathAccount.id }).from(memopathAccount).where(eq(memopathAccount.accountKey, key)).limit(1)).length > 0;
  }

  /** Login replaces the single active session; wrong demo passwords never seed
   * or reset credentials. Demo initialization is explicit and transactional.
   */
  async login(accountKey: string, password: string): Promise<MemoPathLoginResponse> {
    const key = accountKey.trim();
    let [row] = await this.db.select().from(memopathAccount).where(eq(memopathAccount.accountKey, key)).limit(1);
    if (!row && key === DEMO_ACCOUNT_KEY && password === DEMO_PASSWORD && this.config.get<boolean>('DEMO_ACCOUNT_ENABLED')) row = await this.seedDemoAccount();
    if (!row || (row.isDemo && !this.config.get<boolean>('DEMO_ACCOUNT_ENABLED')) || !verifyPassword(password, row.passwordHash)) throw new UnauthorizedException('帳號或密碼錯誤');
    const token = randomUUID();
    await this.db.update(memopathAccount).set({ sessionTokenHash: sessionDigest(token),
      sessionExpiresAt: sql`now() + ${this.config.get<number>('SESSION_TTL_SECONDS')} * interval '1 second'`, updatedAt: new Date(), updatedBy: row.id }).where(eq(memopathAccount.id, row.id));
    return { accountId: row.id, role: row.role as MemoPathLoginResponse['role'], displayName: row.displayName, token };
  }

  /** Revoke only the presented session; it cannot revoke a newer relogin token. */
  async logout(token: string): Promise<void> {
    await this.db.update(memopathAccount).set({ sessionTokenHash: null, sessionExpiresAt: null, updatedAt: new Date() }).where(eq(memopathAccount.sessionTokenHash, sessionDigest(token)));
  }

  private async seedDemoAccount(): Promise<typeof memopathAccount.$inferSelect> {
    return this.db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(176002, 3)`);
      const [existing] = await tx.select().from(memopathAccount).where(eq(memopathAccount.accountKey, DEMO_ACCOUNT_KEY)).limit(1);
      if (existing) return existing;
      const [row] = await tx.insert(memopathAccount).values({ accountKey: DEMO_ACCOUNT_KEY, passwordHash: hashPassword(DEMO_PASSWORD), role: 'family', displayName: '王伯伯', isDemo: true }).returning();
      const actor = principal(row);
      const elderId = await this.elderService.seedDemoInTransaction(tx, actor);
      await this.familyService.initializeSetting(tx, actor);
      await this.familyService.seedDemoInTransaction(tx, elderId);
      return row;
    });
  }
}
