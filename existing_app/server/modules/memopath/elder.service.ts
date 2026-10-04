import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { asc, eq } from 'drizzle-orm';
import { memopathElder } from '@server/database/schema';
import type {
  MemoPathElderInput,
  MemoPathElderRecord,
} from '@shared/api.interface';
import type { MemoPathElderUpdateDto } from './dto';

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
  ) {}

  async list(ownerId: string): Promise<MemoPathElderRecord[]> {
    const rows: ElderRow[] = await this.db
      .select()
      .from(memopathElder)
      .where(eq(memopathElder.createdBy, ownerId))
      .orderBy(asc(memopathElder.createdAt));
    return rows.map((row: ElderRow) => toRecord(row));
  }

  async create(input: MemoPathElderInput): Promise<MemoPathElderRecord> {
    const values: ElderInsert = {
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
    const inserted = await this.db.insert(memopathElder).values(values).returning();
    return toRecord(inserted[0]);
  }

  async update(
    ownerId: string,
    elderId: string,
    dto: MemoPathElderUpdateDto,
  ): Promise<MemoPathElderRecord> {
    await this.assertOwnership(ownerId, elderId);
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
    const updated = await this.db
      .update(memopathElder)
      .set(patch)
      .where(eq(memopathElder.id, elderId))
      .returning();
    return toRecord(updated[0]);
  }

  async remove(ownerId: string, elderId: string): Promise<void> {
    await this.assertOwnership(ownerId, elderId);
    const deleted = await this.db
      .delete(memopathElder)
      .where(eq(memopathElder.id, elderId))
      .returning({ id: memopathElder.id });
    if (deleted.length === 0) {
      throw new NotFoundException('長者不存在');
    }
  }

  async assertOwnership(ownerId: string, elderId: string): Promise<ElderRow> {
    const rows: ElderRow[] = await this.db
      .select()
      .from(memopathElder)
      .where(eq(memopathElder.id, elderId))
      .limit(1);
    const row: ElderRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException('長者不存在');
    }
    if (row.createdBy !== ownerId) {
      throw new NotFoundException('長者不存在');
    }
    return row;
  }
}
