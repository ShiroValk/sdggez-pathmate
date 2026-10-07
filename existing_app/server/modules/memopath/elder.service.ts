import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { and, asc, eq, or, sql } from 'drizzle-orm';
import { memopathAccount, memopathCareInvitation, memopathCareLink, memopathElder } from '@server/database/schema';
import { createHash, randomBytes } from 'node:crypto';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type {
  MemoPathElderInput,
  MemoPathElderRecord,
} from '@shared/api.interface';
import type { MemoPathElderUpdateDto } from './dto';
import type { MemoPrincipal, MemoTransaction } from './principal';

type ElderRow = typeof memopathElder.$inferSelect;
type ElderInsert = typeof memopathElder.$inferInsert;

function toRecord(row: ElderRow): MemoPathElderRecord {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    relation: row.relation,
    age: row.age,
    gender: row.gender,
    address: row.address,
    phone: row.phone,
    emergencyPhone: row.emergencyPhone,
    avatarEmoji: row.avatarEmoji,
  };
}

@Injectable()
export class MemoPathElderService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly config: ConfigService,
  ) {}

  /** Each read contains the current active-link predicate; no access cache. */
  async list(principal: MemoPrincipal): Promise<MemoPathElderRecord[]> {
    const rows: ElderRow[] = await this.db
      .select()
      .from(memopathElder)
      .where(this.accessPredicate(principal))
      .orderBy(asc(memopathElder.createdAt));
    return rows.map((row: ElderRow) => toRecord(row));
  }

  async create(principal: MemoPrincipal, input: MemoPathElderInput): Promise<MemoPathElderRecord> {
    return this.db.transaction(tx => this.createInTransaction(tx, principal, input));
  }

  /** Auth may orchestrate this inside its registration transaction. */
  async createInTransaction(tx: MemoTransaction, principal: MemoPrincipal, input: MemoPathElderInput): Promise<MemoPathElderRecord> {
    if (principal.role !== "family") throw new ForbiddenException("只有家屬可管理長者");
    const values: ElderInsert = {
      ownerAccountId: principal.accountId,
      createdBy: principal.accountId,
      updatedBy: principal.accountId,
      name: input.name,
      nickname: input.nickname ?? '',
      relation: input.relation ?? '',
      age: input.age ?? 0,
      gender: input.gender ?? '',
      address: input.address ?? '',
      phone: input.phone ?? '',
      emergencyPhone: input.emergencyPhone ?? '',
      avatarEmoji: input.avatarEmoji || '👴',
    };
    const inserted = await tx.insert(memopathElder).values(values).returning();
    return toRecord(inserted[0]);
  }

  async update(
    principal: MemoPrincipal,
    elderId: string,
    dto: MemoPathElderUpdateDto,
  ): Promise<MemoPathElderRecord> {
    return this.withElderWrite(principal, elderId, true, async tx => {
    const patch: Partial<ElderInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.nickname !== undefined) patch.nickname = dto.nickname;
    if (dto.relation !== undefined) patch.relation = dto.relation;
    if (dto.age !== undefined) patch.age = dto.age;
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.emergencyPhone !== undefined) patch.emergencyPhone = dto.emergencyPhone;
    if (dto.avatarEmoji !== undefined) patch.avatarEmoji = dto.avatarEmoji;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    patch.updatedBy = principal.accountId;
    const updated = await tx
      .update(memopathElder)
      .set(patch)
      .where(eq(memopathElder.id, elderId))
      .returning();
    return toRecord(updated[0]);
    });
  }

  async remove(principal: MemoPrincipal, elderId: string): Promise<void> {
    await this.withElderWrite(principal, elderId, true, async tx => {
    const deleted = await tx
      .delete(memopathElder)
      .where(eq(memopathElder.id, elderId))
      .returning({ id: memopathElder.id });
    if (deleted.length === 0) {
      throw new NotFoundException('長者不存在');
    }
    });
  }

  /** Explicit seed only; records belong to the authenticated demo account. */
  async seedDemoInTransaction(tx: MemoTransaction, principal: MemoPrincipal): Promise<string> {
    const elders = await tx
      .insert(memopathElder)
      .values([
        {
          ownerAccountId: principal.accountId, createdBy: principal.accountId, updatedBy: principal.accountId,
          name: '王伯伯',
          nickname: '阿爸',
          relation: '父親',
          age: 78,
          gender: '男',
          address: '旺角站 A 出口附近',
          phone: '+852 9123 4567',
          emergencyPhone: '+852 9876 5432',
          avatarEmoji: '👴',
        },
        {
          ownerAccountId: principal.accountId, createdBy: principal.accountId, updatedBy: principal.accountId,
          name: '李婆婆',
          nickname: '阿媽',
          relation: '母親',
          age: 75,
          gender: '女',
          address: '旺角站 A 出口附近',
          phone: '+852 9234 5678',
          emergencyPhone: '+852 9876 5432',
          avatarEmoji: '👵',
        },
      ])
      .returning({ id: memopathElder.id, name: memopathElder.name });
    const uncle: { id: string; name: string } | undefined = elders.find(
      (item: { id: string; name: string }) => item.name === '王伯伯',
    );
    if (!uncle) {
      throw new Error('Demo elder initialization failed');
    }
    return uncle.id;
  }

  /** SQL authorization predicate is re-evaluated for every resource read. */
  accessPredicate(principal: MemoPrincipal) {
    if (principal.role === 'family') return eq(memopathElder.ownerAccountId, principal.accountId);
    return sql`EXISTS (SELECT 1 FROM ${memopathCareLink} link WHERE link.elder_id = ${memopathElder.id}
      AND link.elder_account_id = ${principal.accountId} AND link.status = 'active')`;
  }

  /** Apply this to the actual business query as well as the status check, so
   * a revoke committed between the two cannot disclose stale-authorized rows.
   */
  resourceAccess(principal: MemoPrincipal, elderColumn: AnyPgColumn) {
    return sql`EXISTS (SELECT 1 FROM ${memopathElder} WHERE ${memopathElder.id} = ${elderColumn} AND ${this.accessPredicate(principal)})`;
  }

  /** Lock the same elder used by revoke before checking authority or writing.
   * This serializes revoke with cab writes and cascaded resource deletion.
   */
  async withElderWrite<T>(principal: MemoPrincipal, elderId: string, management: boolean, operation: (tx: MemoTransaction, elder: ElderRow) => Promise<T>): Promise<T> {
    return this.db.transaction(async tx => {
      const [row] = await tx.select().from(memopathElder).where(eq(memopathElder.id, elderId)).for('update');
      if (!row) throw new NotFoundException('長者不存在');
      if (management && principal.role !== 'family') throw new ForbiddenException('只有家屬可管理長者');
      await this.assertAccess(principal, elderId, tx);
      return operation(tx, row);
    });
  }

  async assertAccess(principal: MemoPrincipal, elderId: string, client: PostgresJsDatabase | MemoTransaction = this.db): Promise<ElderRow> {
    const [authorized] = await client.select().from(memopathElder).where(and(eq(memopathElder.id, elderId), this.accessPredicate(principal))).limit(1);
    if (authorized) return authorized;
    const [exists] = await client.select({ id: memopathElder.id }).from(memopathElder).where(eq(memopathElder.id, elderId)).limit(1);
    if (!exists) throw new NotFoundException('長者不存在');
    throw new ForbiddenException('無權存取此資料');
  }

  /** Only the owning family may create a body-only, one-time invitation. */
  async invite(principal: MemoPrincipal, elderId: string, elderAccount: string) {
    return this.withElderWrite(principal, elderId, true, async tx => {
      const [target] = await tx.select().from(memopathAccount).where(eq(memopathAccount.accountKey, elderAccount)).for('update');
      if (!target || target.role !== 'elder' || target.isDemo !== principal.isDemo) throw new ConflictException('無法邀請此账号');
      const [active] = await tx.select().from(memopathCareLink).where(and(eq(memopathCareLink.status, 'active'), or(eq(memopathCareLink.elderId, elderId), eq(memopathCareLink.elderAccountId, target.id)))).limit(1);
      if (active) throw new ConflictException('已有有效照護關聯');
      await tx.update(memopathCareInvitation).set({ status: 'revoked' }).where(and(eq(memopathCareInvitation.elderId, elderId), eq(memopathCareInvitation.targetElderAccountId, target.id), eq(memopathCareInvitation.status, 'pending')));
      const code = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + this.config.get<number>('CARE_INVITE_TTL_SECONDS', 600) * 1000);
      const [row] = await tx.insert(memopathCareInvitation).values({ elderId, familyAccountId: principal.accountId, targetElderAccountId: target.id, codeHash: createHash('sha256').update(code).digest('hex'), expiresAt }).returning();
      return { invitationId: row.id, code, expiresAt: row.expiresAt.toISOString() };
    });
  }

  /** All invalid/expired/wrong-target codes share a non-identifying conflict. */
  private unavailable(): never { throw new ConflictException({ message: '邀請不可用', details: { reason: 'INVITATION_UNAVAILABLE' } }); }

  private async invitation(principal: MemoPrincipal, code: string, client: PostgresJsDatabase | MemoTransaction = this.db) {
    if (principal.role !== 'elder') throw new ForbiddenException('只有指定長者可接受邀請');
    const query = client.select().from(memopathCareInvitation).where(and(eq(memopathCareInvitation.codeHash, createHash('sha256').update(code).digest('hex')), eq(memopathCareInvitation.targetElderAccountId, principal.accountId), eq(memopathCareInvitation.status, 'pending'), sql`${memopathCareInvitation.expiresAt} > now()`)).limit(1);
    const [row] = client === this.db ? await query : await query.for('update');
    if (!row) this.unavailable();
    return row;
  }

  async preview(principal: MemoPrincipal, code: string) {
    const row = await this.invitation(principal, code);
    const [elder] = await this.db.select().from(memopathElder).where(and(eq(memopathElder.id, row.elderId), eq(memopathElder.ownerAccountId, row.familyAccountId)));
    const [family] = await this.db.select().from(memopathAccount).where(eq(memopathAccount.id, row.familyAccountId));
    if (!elder || !family || family.role !== 'family' || family.isDemo !== principal.isDemo) this.unavailable();
    return { invitationId: row.id, elder: { id: elder.id, name: elder.name }, family: { displayName: family.displayName }, expiresAt: row.expiresAt.toISOString() };
  }

  /** Elder, target account then invitation lock order matches invite/revoke.
   * Unique indexes arbitrate conflicting target accepts across different elders.
   */
  async accept(principal: MemoPrincipal, code: string) {
    const candidate = await this.invitation(principal, code);
    return this.db.transaction(async tx => {
      const [elder] = await tx.select().from(memopathElder).where(eq(memopathElder.id, candidate.elderId)).for('update');
      if (!elder || elder.ownerAccountId !== candidate.familyAccountId) this.unavailable();
      const [target] = await tx.select().from(memopathAccount).where(eq(memopathAccount.id, principal.accountId)).for('update');
      const row = await this.invitation(principal, code, tx);
      const [family] = await tx.select().from(memopathAccount).where(eq(memopathAccount.id, row.familyAccountId));
      if (!target || target.role !== 'elder' || !family || family.role !== 'family' || target.isDemo !== family.isDemo) this.unavailable();
      const [existing] = await tx.select().from(memopathCareLink).where(and(eq(memopathCareLink.status, 'active'), or(eq(memopathCareLink.elderId, row.elderId), eq(memopathCareLink.elderAccountId, principal.accountId)))).limit(1);
      if (existing) throw new ConflictException('已有有效照護關聯');
      const [link] = await tx.insert(memopathCareLink).values({ elderId: row.elderId, familyAccountId: row.familyAccountId, elderAccountId: principal.accountId }).returning();
      await tx.update(memopathCareInvitation).set({ status: 'accepted', consumedAt: new Date() }).where(eq(memopathCareInvitation.id, row.id));
      return { id: link.id, elderId: link.elderId, status: link.status };
    });
  }

  async links(principal: MemoPrincipal) {
    const rows = await this.db.select().from(memopathCareLink).where(and(eq(memopathCareLink.status, 'active'), principal.role === 'family' ? eq(memopathCareLink.familyAccountId, principal.accountId) : eq(memopathCareLink.elderAccountId, principal.accountId)));
    return rows.map(row => ({ id: row.id, elderId: row.elderId, status: row.status, acceptedAt: row.acceptedAt.toISOString() }));
  }

  async revokeInvitation(principal: MemoPrincipal, id: string) {
    const [candidate] = await this.db.select().from(memopathCareInvitation).where(eq(memopathCareInvitation.id, id));
    if (!candidate) throw new NotFoundException('邀請不存在');
    return this.withElderWrite(principal, candidate.elderId, true, async tx => {
      const [row] = await tx.select().from(memopathCareInvitation).where(eq(memopathCareInvitation.id, id));
      if (row.status === 'accepted') throw new ConflictException('邀請已被接受');
      await tx.update(memopathCareInvitation).set({ status: 'revoked' }).where(eq(memopathCareInvitation.id, id));
    });
  }

  /** Either participant can revoke, using the same elder lock as every write. */
  async revokeLink(principal: MemoPrincipal, id: string) {
    const [candidate] = await this.db.select().from(memopathCareLink).where(eq(memopathCareLink.id, id));
    if (!candidate) throw new NotFoundException('關聯不存在');
    if (candidate.familyAccountId !== principal.accountId && candidate.elderAccountId !== principal.accountId) throw new ForbiddenException('無權撤銷此關聯');
    await this.db.transaction(async tx => {
      await tx.select().from(memopathElder).where(eq(memopathElder.id, candidate.elderId)).for('update');
      await tx.update(memopathCareLink).set({ status: 'revoked', revokedAt: new Date() }).where(and(eq(memopathCareLink.id, id), eq(memopathCareLink.status, 'active')));
    });
  }

  async assertOwnership(principal: MemoPrincipal, elderId: string): Promise<ElderRow> {
    const rows: ElderRow[] = await this.db
      .select()
      .from(memopathElder)
      .where(eq(memopathElder.id, elderId))
      .limit(1);
    const row: ElderRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException('長者不存在');
    }
    if (principal.role !== "family" || row.ownerAccountId !== principal.accountId) {
      throw new ForbiddenException("無權存取此資料");
    }
    return row;
  }
}
