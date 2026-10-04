import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, sql } from 'drizzle-orm';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  memopathAccount,
  memopathAlert,
  memopathElder,
  memopathElderContact,
  memopathGeofence,
  memopathMovement,
  memopathPlace,
  memopathSetting,
  memopathTrip,
  memopathVital,
} from '@server/database/schema';
import type {
  MemoPathElderInput,
  MemoPathLoginResponse,
  MemoPathOtpResponse,
  MemoPathRegisterRequest,
} from '@shared/api.interface';

const DEMO_ACCOUNT_KEY = 'demo';
const DEMO_PASSWORD = 'demo1234';

function hashPassword(password: string): string {
  const salt: string = randomBytes(16).toString('hex');
  const hash: string = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    return false;
  }
  const candidate: Buffer = scryptSync(password, salt, 64);
  const expected: Buffer = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

@Injectable()
export class MemoPathAuthService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async issueOtp(): Promise<MemoPathOtpResponse> {
    const code: string = String(Math.floor(100000 + Math.random() * 900000));
    return { code, expiresIn: 300 };
  }

  async register(dto: MemoPathRegisterRequest): Promise<MemoPathLoginResponse> {
    const key: string = dto.account.trim();
    const existing = await this.db
      .select({ id: memopathAccount.id })
      .from(memopathAccount)
      .where(eq(memopathAccount.accountKey, key))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException('該帳號已存在，請直接登入');
    }
    const token: string = randomUUID();
    const inserted = await this.db
      .insert(memopathAccount)
      .values({
        accountKey: key,
        passwordHash: hashPassword(dto.password),
        role: dto.role,
        displayName: dto.elder.name,
        sessionToken: token,
      })
      .returning({ id: memopathAccount.id });
    const account = inserted[0];
    if (dto.role === 'family') {
      await this.createElder(dto.elder);
    }
    return {
      accountId: account.id,
      role: dto.role,
      displayName: dto.elder.name,
      token,
    };
  }

  async accountExists(accountKey: string): Promise<boolean> {
    const key: string = accountKey.trim();
    if (key.length === 0) return false;
    const rows = await this.db
      .select({ id: memopathAccount.id })
      .from(memopathAccount)
      .where(eq(memopathAccount.accountKey, key))
      .limit(1);
    return rows.length > 0;
  }

  async login(accountKey: string, password: string): Promise<MemoPathLoginResponse> {
    const key: string = accountKey.trim();
    const rows = await this.db
      .select()
      .from(memopathAccount)
      .where(eq(memopathAccount.accountKey, key))
      .limit(1);
    let account = rows[0];
    if (!account && key === DEMO_ACCOUNT_KEY) {
      account = await this.seedDemoAccount();
    }
    if (!account || !verifyPassword(password, account.passwordHash)) {
      if (account && key === DEMO_ACCOUNT_KEY) {
        await this.db
          .update(memopathAccount)
          .set({ passwordHash: hashPassword(DEMO_PASSWORD) })
          .where(eq(memopathAccount.id, account.id));
      }
      throw new UnauthorizedException('帳號或密碼錯誤');
    }
    const token: string = randomUUID();
    await this.db
      .update(memopathAccount)
      .set({ sessionToken: token })
      .where(eq(memopathAccount.id, account.id));
    return {
      accountId: account.id,
      role: account.role as MemoPathLoginResponse['role'],
      displayName: account.displayName,
      token,
    };
  }

  async logout(token: string): Promise<void> {
    await this.db
      .update(memopathAccount)
      .set({ sessionToken: '' })
      .where(eq(memopathAccount.sessionToken, token));
  }

  private async createElder(input: MemoPathElderInput): Promise<string> {
    const inserted = await this.db
      .insert(memopathElder)
      .values({
        name: input.name,
        nickname: input.nickname ?? '',
        relation: input.relation ?? '',
        age: input.age ?? 0,
        gender: input.gender ?? '',
        address: input.address ?? '',
        phone: input.phone ?? '',
        emergencyPhone: input.emergencyPhone ?? '',
        avatarEmoji: input.avatarEmoji || '👴',
      })
      .returning({ id: memopathElder.id });
    return inserted[0].id;
  }

  private async seedDemoAccount(): Promise<typeof memopathAccount.$inferSelect | undefined> {
    const inserted = await this.db
      .insert(memopathAccount)
      .values({
        accountKey: DEMO_ACCOUNT_KEY,
        passwordHash: hashPassword(DEMO_PASSWORD),
        role: 'family',
        displayName: '王伯伯',
        sessionToken: '',
      })
      .returning();
    const account = inserted[0];
    if (!account) {
      return undefined;
    }
    await this.seedDemoData();
    return account;
  }

  private async seedDemoData(): Promise<void> {
    const elders = await this.db
      .insert(memopathElder)
      .values([
        {
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
      return;
    }
    const elderId: string = uncle.id;

    await this.db.insert(memopathElderContact).values([
      { elderId, name: '阿明', relation: '大仔', phone: '+852 9111 2222', avatarEmoji: '👨‍🦱' },
      { elderId, name: '婉晴', relation: '孫女', phone: '+852 9222 3333', avatarEmoji: '👩🏻' },
      { elderId, name: '家欣', relation: '女兒', phone: '+852 9333 4444', avatarEmoji: '👩‍🦱' },
      { elderId, name: '陳姑娘', relation: '護理員', phone: '+852 9444 5555', avatarEmoji: '👵' },
    ]);

    await this.db.insert(memopathTrip).values([
      {
        elderId,
        destination: '法國醫院',
        tripDate: '2026-10-02',
        startTime: '10:00',
        endTime: '12:00',
        scheduleMode: 'auto',
        status: 'pending',
      },
      {
        elderId,
        destination: '阿仔屋企',
        tripDate: '2026-10-05',
        startTime: '15:00',
        endTime: '',
        scheduleMode: 'manual',
        status: 'pending',
      },
    ]);

    await this.db.insert(memopathSetting).values({
      config: sql`'{"language":"cantonese","voice_mode":"default_on","lock_layout":false}'::jsonb`,
    });

    await this.db.insert(memopathGeofence).values({
      elderId,
      homeLabel: '家 · 旺角站 A 出口',
      radiusM: 800,
      dwellEnabled: true,
      dwellMinutes: 18,
    });

    await this.db.insert(memopathPlace).values([
      { elderId, label: '家 · 旺角站 A 出口', icon: '🏠', placeType: 'frequent', beaconStatus: 'safe' },
      { elderId, label: '公園散步', icon: '🌳', placeType: 'frequent', beaconStatus: 'safe' },
      { elderId, label: '菜市場', icon: '🥬', placeType: 'frequent', beaconStatus: 'safe' },
      { elderId, label: '旺角', icon: '📡', placeType: 'beacon', beaconStatus: 'safe' },
      { elderId, label: '柴灣', icon: '📡', placeType: 'beacon', beaconStatus: 'strange' },
    ]);

    await this.db.insert(memopathAlert).values({
      elderId,
      alertType: 'sos',
      title: '長者按了緊急求助SOS',
      location: '柴灣站',
      status: '已通知',
    });

    const now: Date = new Date();
    const vitalRows = [76, 78, 77, 79, 78, 78].map((bpm: number, index: number) => ({
      elderId,
      heartRate: bpm,
      bloodOxygen: 97,
      temperature: '36.5',
      steps: 2140,
      recordedAt: new Date(now.getTime() - (5 - index) * 10 * 60 * 1000),
    }));
    await this.db.insert(memopathVital).values(vitalRows);

    await this.db.insert(memopathMovement).values([
      { elderId, occurredDate: '2026-09-25', location: '某街道', status: 'safe', note: '' },
      { elderId, occurredDate: '2026-09-25', location: '某商場', status: 'safe', note: '' },
      { elderId, occurredDate: '2026-09-23', location: '某半島', status: 'out_of_range', note: '超出範圍' },
    ]);
  }
}
