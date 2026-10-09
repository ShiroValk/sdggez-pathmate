import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import {
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
  MemoPathAlertRecord,
  MemoPathContactInput,
  MemoPathContactRecord,
  MemoPathFamilyDashboardResponse,
  MemoPathGeofenceInput,
  MemoPathGeofenceRecord,
  MemoPathMovementRecord,
  MemoPathPlaceInput,
  MemoPathPlaceRecord,
  MemoPathPlaceUpdateInput,
  MemoPathSettingConfig,
  MemoPathTripInput,
  MemoPathTripRecord,
  MemoPathVitalRecord,
} from '@shared/api.interface';
import type { MemoPrincipal, MemoTransaction } from './principal';
import { MemoPathElderService } from './elder.service';
import type { MemoPathContactDto, MemoPathGeofenceDto, MemoPathPlaceDto, MemoPathTripDto } from './dto';

interface StoredSettingConfig {
  language?: string;
  voice_mode?: string;
  lock_layout?: boolean;
}

@Injectable()
export class MemoPathFamilyService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
    private readonly elderService: MemoPathElderService,
  ) {}

  async listContacts(principal: MemoPrincipal, elderId: string): Promise<MemoPathContactRecord[]> {
    await this.elderService.assertAccess(principal, elderId);
    const rows = await this.db
      .select()
      .from(memopathElderContact)
      .where(and(eq(memopathElderContact.elderId, elderId), this.elderService.resourceAccess(principal, memopathElderContact.elderId)))
      .orderBy(asc(memopathElderContact.createdAt));
    return rows.map((row): MemoPathContactRecord => ({
      id: row.id,
      elderId: row.elderId,
      name: row.name,
      relation: row.relation,
      phone: row.phone,
      avatarEmoji: row.avatarEmoji,
    }));
  }

  async addContact(
    principal: MemoPrincipal,
    elderId: string,
    dto: MemoPathContactDto,
  ): Promise<MemoPathContactRecord> {
    return this.elderService.withElderWrite(principal, elderId, true, async tx => {
    const inserted = await tx
      .insert(memopathElderContact)
      .values({
        elderId,
        createdBy: principal.accountId,
        updatedBy: principal.accountId,
        name: dto.name,
        relation: dto.relation ?? '',
        phone: dto.phone ?? '',
        avatarEmoji: dto.avatarEmoji || '👤',
      })
      .returning();
    const row = inserted[0];
    return {
      id: row.id,
      elderId: row.elderId,
      name: row.name,
      relation: row.relation,
      phone: row.phone,
      avatarEmoji: row.avatarEmoji,
    };
    });
  }

  async listTrips(principal: MemoPrincipal, elderId: string): Promise<MemoPathTripRecord[]> {
    await this.elderService.assertAccess(principal, elderId);
    const rows = await this.db
      .select()
      .from(memopathTrip)
      .where(and(eq(memopathTrip.elderId, elderId), this.elderService.resourceAccess(principal, memopathTrip.elderId)))
      .orderBy(asc(memopathTrip.tripDate), asc(memopathTrip.startTime));
    return rows.map((row): MemoPathTripRecord => this.toTripRecord(row));
  }

  async createTrip(principal: MemoPrincipal, dto: MemoPathTripDto): Promise<MemoPathTripRecord> {
    return this.elderService.withElderWrite(principal, dto.elderId, true, async tx => {
    const inserted = await tx
      .insert(memopathTrip)
      .values({
        elderId: dto.elderId,
        createdBy: principal.accountId,
        updatedBy: principal.accountId,
        destination: dto.destination,
        tripDate: dto.tripDate,
        startTime: dto.startTime ?? '',
        endTime: dto.endTime ?? '',
        scheduleMode: dto.scheduleMode ?? 'manual',
        status: 'pending',
      })
      .returning();
    return this.toTripRecord(inserted[0]);
    });
  }

  async callCab(principal: MemoPrincipal, tripId: string): Promise<MemoPathTripRecord> {
    const trips = await this.db
      .select({ id: memopathTrip.id, elderId: memopathTrip.elderId })
      .from(memopathTrip)
      .where(eq(memopathTrip.id, tripId))
      .limit(1);
    const trip = trips[0];
    if (!trip) {
      throw new NotFoundException('行程不存在');
    }
    return this.elderService.withElderWrite(principal, trip.elderId, false, async tx => {
    const updated = await tx
      .update(memopathTrip)
      .set({ status: 'cab_called', updatedAt: new Date(), updatedBy: principal.accountId })
      .where(eq(memopathTrip.id, tripId))
      .returning();
    return this.toTripRecord(updated[0]);
    });
  }

  async getSetting(principal: MemoPrincipal): Promise<MemoPathSettingConfig> {
    const rows = await this.db
      .select()
      .from(memopathSetting)
      .where(eq(memopathSetting.accountId, principal.accountId))
      .limit(1);
    const row = rows[0];
    const config: MemoPathSettingConfig = {
      language: 'cantonese',
      voiceMode: 'default_on',
      lockLayout: false,
    };
    if (!row) {
      return config;
    }
    const stored = (row.config ?? {}) as StoredSettingConfig;
    const language: MemoPathSettingConfig['language'] =
      stored.language === 'mandarin' || stored.language === 'english' || stored.language === 'cantonese'
        ? stored.language
        : config.language;
    const voiceMode: MemoPathSettingConfig['voiceMode'] =
      stored.voice_mode === 'standby' || stored.voice_mode === 'default_on'
        ? stored.voice_mode
        : config.voiceMode;
    return {
      language,
      voiceMode,
      lockLayout: Boolean(stored.lock_layout ?? config.lockLayout),
    };
  }

  async saveSetting(principal: MemoPrincipal, config: MemoPathSettingConfig): Promise<MemoPathSettingConfig> {
    const payload: StoredSettingConfig = {
      language: config.language,
      voice_mode: config.voiceMode,
      lock_layout: config.lockLayout,
    };
    await this.db.insert(memopathSetting).values({ accountId: principal.accountId, config: payload, createdBy: principal.accountId, updatedBy: principal.accountId })
      .onConflictDoUpdate({ target: memopathSetting.accountId, set: { config: payload, updatedAt: new Date(), updatedBy: principal.accountId } });
    return this.getSetting(principal);
  }

  async getGeofence(principal: MemoPrincipal, elderId: string): Promise<MemoPathGeofenceRecord> {
    await this.elderService.assertAccess(principal, elderId);
    const rows = await this.db
      .select()
      .from(memopathGeofence)
      .where(and(eq(memopathGeofence.elderId, elderId), this.elderService.resourceAccess(principal, memopathGeofence.elderId)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return {
        id: '',
        elderId,
        homeLabel: '',
        radiusM: 800,
        dwellEnabled: true,
        dwellMinutes: 18,
      };
    }
    return {
      id: row.id,
      elderId: row.elderId,
      homeLabel: row.homeLabel,
      radiusM: row.radiusM,
      dwellEnabled: row.dwellEnabled,
      dwellMinutes: row.dwellMinutes,
    };
  }

  async saveGeofence(
    principal: MemoPrincipal,
    elderId: string,
    dto: MemoPathGeofenceDto,
  ): Promise<MemoPathGeofenceRecord> {
    return this.elderService.withElderWrite(principal, elderId, true, async tx => {
    const [stored] = await tx.select().from(memopathGeofence).where(and(eq(memopathGeofence.elderId, elderId), this.elderService.resourceAccess(principal, memopathGeofence.elderId)));
    const current = stored ?? { homeLabel: '', radiusM: 800, dwellEnabled: true, dwellMinutes: 18 };
    const merged: MemoPathGeofenceInput = {
      homeLabel: dto.homeLabel ?? current.homeLabel,
      radiusM: dto.radiusM ?? current.radiusM,
      dwellEnabled: dto.dwellEnabled ?? current.dwellEnabled,
      dwellMinutes: dto.dwellMinutes ?? current.dwellMinutes,
    };
    const [saved] = await tx
      .insert(memopathGeofence)
      .values({ elderId, ...merged, createdBy: principal.accountId, updatedBy: principal.accountId })
      .onConflictDoUpdate({
        target: memopathGeofence.elderId,
        set: { ...merged, updatedAt: new Date(), updatedBy: principal.accountId },
      }).returning();
    return { id: saved.id, elderId, homeLabel: saved.homeLabel, radiusM: saved.radiusM, dwellEnabled: saved.dwellEnabled, dwellMinutes: saved.dwellMinutes };
    });
  }

  async listPlaces(principal: MemoPrincipal, elderId: string): Promise<MemoPathPlaceRecord[]> {
    await this.elderService.assertAccess(principal, elderId);
    const rows = await this.db
      .select()
      .from(memopathPlace)
      .where(and(eq(memopathPlace.elderId, elderId), this.elderService.resourceAccess(principal, memopathPlace.elderId)))
      .orderBy(asc(memopathPlace.createdAt));
    return rows.map((row): MemoPathPlaceRecord => ({
      id: row.id,
      elderId: row.elderId,
      label: row.label,
      icon: row.icon,
      placeType: row.placeType as MemoPathPlaceRecord['placeType'],
      beaconStatus: row.beaconStatus as MemoPathPlaceRecord['beaconStatus'],
      address: row.address,
      lng: row.lng ?? 0,
      lat: row.lat ?? 0,
    }));
  }

  async addPlace(principal: MemoPrincipal, dto: MemoPathPlaceDto): Promise<MemoPathPlaceRecord> {
    return this.elderService.withElderWrite(principal, dto.elderId, true, async tx => {
    const inserted = await tx
      .insert(memopathPlace)
      .values({
        elderId: dto.elderId,
        createdBy: principal.accountId,
        updatedBy: principal.accountId,
        label: dto.label,
        icon: dto.icon || '📍',
        placeType: dto.placeType ?? 'frequent',
        beaconStatus: dto.beaconStatus ?? 'safe',
        address: dto.address ?? '',
        lng: dto.lng ?? null,
        lat: dto.lat ?? null,
      })
      .returning();
    const row = inserted[0];
    return {
      id: row.id,
      elderId: row.elderId,
      label: row.label,
      icon: row.icon,
      placeType: row.placeType as MemoPathPlaceRecord['placeType'],
      beaconStatus: row.beaconStatus as MemoPathPlaceRecord['beaconStatus'],
      address: row.address,
      lng: row.lng ?? 0,
      lat: row.lat ?? 0,
    };
    });
  }

  async updatePlace(principal: MemoPrincipal, id: string, dto: MemoPathPlaceUpdateInput): Promise<MemoPathPlaceRecord> {
    const [existing] = await this.db.select({ elderId: memopathPlace.elderId })
      .from(memopathPlace).where(eq(memopathPlace.id, id)).limit(1);
    if (!existing) throw new NotFoundException('常去地点不存在');
    return this.elderService.withElderWrite(principal, existing.elderId, true, async tx => {
      const patch: Partial<typeof memopathPlace.$inferInsert> = {};
      for (const key of ['label', 'icon', 'placeType', 'beaconStatus', 'address', 'lng', 'lat'] as const) {
        if (dto[key] !== undefined) patch[key] = dto[key] as never;
      }
      if (Object.keys(patch).length === 0) throw new BadRequestException('未提供可更新字段');
      patch.updatedAt = new Date();
      patch.updatedBy = principal.accountId;
      const [row] = await tx.update(memopathPlace).set(patch)
        .where(and(eq(memopathPlace.id, id), eq(memopathPlace.elderId, existing.elderId))).returning();
      if (!row) throw new NotFoundException('常去地点不存在');
      return {
        id: row.id, elderId: row.elderId, label: row.label, icon: row.icon,
        placeType: row.placeType as MemoPathPlaceRecord['placeType'],
        beaconStatus: row.beaconStatus as MemoPathPlaceRecord['beaconStatus'],
        address: row.address, lng: row.lng ?? 0, lat: row.lat ?? 0,
      };
    });
  }

  async deletePlace(principal: MemoPrincipal, id: string): Promise<void> {
    const [existing] = await this.db.select({ elderId: memopathPlace.elderId })
      .from(memopathPlace).where(eq(memopathPlace.id, id)).limit(1);
    if (!existing) throw new NotFoundException('常去地点不存在');
    await this.elderService.withElderWrite(principal, existing.elderId, true, async tx => {
      const deleted = await tx.delete(memopathPlace)
        .where(and(eq(memopathPlace.id, id), eq(memopathPlace.elderId, existing.elderId)))
        .returning({ id: memopathPlace.id });
      if (deleted.length === 0) throw new NotFoundException('常去地点不存在');
    });
  }

  async listAlerts(principal: MemoPrincipal, elderId: string): Promise<MemoPathAlertRecord[]> {
    await this.elderService.assertAccess(principal, elderId);
    const rows = await this.db
      .select()
      .from(memopathAlert)
      .where(and(eq(memopathAlert.elderId, elderId), this.elderService.resourceAccess(principal, memopathAlert.elderId)))
      .orderBy(desc(memopathAlert.occurredAt));
    return rows.map((row): MemoPathAlertRecord => ({
      id: row.id,
      elderId: row.elderId,
      alertType: row.alertType,
      title: row.title,
      location: row.location,
      status: row.status,
      occurredAt: row.occurredAt.toISOString(),
    }));
  }

  async getVitalSummary(
    principal: MemoPrincipal,
    elderId: string,
  ): Promise<{ latest: MemoPathVitalRecord | null; trend: MemoPathVitalRecord[] }> {
    await this.elderService.assertAccess(principal, elderId);
    const oneHourAgo: Date = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await this.db
      .select()
      .from(memopathVital)
      .where(and(this.elderService.resourceAccess(principal, memopathVital.elderId), eq(memopathVital.elderId, elderId), gte(memopathVital.recordedAt, oneHourAgo)))
      .orderBy(asc(memopathVital.recordedAt));
    const toVitalRecord = (row: typeof memopathVital.$inferSelect): MemoPathVitalRecord => ({
      id: row.id,
      elderId: row.elderId,
      heartRate: row.heartRate,
      bloodOxygen: row.bloodOxygen,
      temperature: Number(row.temperature),
      steps: row.steps,
      recordedAt: row.recordedAt.toISOString(),
    });
    const trend: MemoPathVitalRecord[] = rows.map(toVitalRecord);
    const latest: MemoPathVitalRecord | null = trend.length > 0 ? trend[trend.length - 1] : null;
    return { latest, trend };
  }

  async listMovements(principal: MemoPrincipal, elderId: string): Promise<MemoPathMovementRecord[]> {
    await this.elderService.assertAccess(principal, elderId);
    const rows = await this.db
      .select()
      .from(memopathMovement)
      .where(and(eq(memopathMovement.elderId, elderId), this.elderService.resourceAccess(principal, memopathMovement.elderId)))
      .orderBy(desc(memopathMovement.occurredDate));
    return rows.map((row): MemoPathMovementRecord => ({
      id: row.id,
      elderId: row.elderId,
      occurredDate: row.occurredDate,
      location: row.location,
      status: row.status as MemoPathMovementRecord['status'],
      note: row.note,
    }));
  }

  async getDashboard(principal: MemoPrincipal, elderId?: string): Promise<MemoPathFamilyDashboardResponse> {
    if (elderId !== undefined) await this.elderService.assertAccess(principal, elderId);
    const elders = await this.elderService.list(principal);
    if (elders.length === 0) {
      return { elder: null, latestVital: null, latestAlert: null, places: [], todayTrips: [] };
    }
    const elder = elders.find((item) => item.id === elderId) ?? elders[0];
    const targetId: string = elder.id;
    const vitals = await this.getVitalSummary(principal, targetId);
    const alerts = await this.listAlerts(principal, targetId);
    const places = await this.listPlaces(principal, targetId);
    const trips = await this.listTrips(principal, targetId);
    const today: string = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return {
      elder,
      latestVital: vitals.latest,
      latestAlert: alerts.length > 0 ? alerts[0] : null,
      places,
      todayTrips: trips.filter((trip: MemoPathTripRecord) => trip.tripDate === today),
    };
  }

  /** Account-private defaults, atomic with registration; no sharing via elder. */
  async initializeSetting(tx: MemoTransaction, principal: MemoPrincipal): Promise<void> {
    await tx.insert(memopathSetting).values({ accountId: principal.accountId, createdBy: principal.accountId, updatedBy: principal.accountId,
      config: { language: 'cantonese', voice_mode: 'default_on', lock_layout: false } });
  }

  /** Existing clearly simulated dataset; only explicit demo seed calls this. */
  async seedDemoInTransaction(tx: MemoTransaction, elderId: string): Promise<void> {
    await tx.insert(memopathElderContact).values([
      { elderId, name: '阿明', relation: '大仔', phone: '+852 9111 2222', avatarEmoji: '👨‍🦱' },
      { elderId, name: '婉晴', relation: '孫女', phone: '+852 9222 3333', avatarEmoji: '👩🏻' },
      { elderId, name: '家欣', relation: '女兒', phone: '+852 9333 4444', avatarEmoji: '👩‍🦱' },
      { elderId, name: '陳姑娘', relation: '護理員', phone: '+852 9444 5555', avatarEmoji: '👵' },
    ]);

    await tx.insert(memopathTrip).values([
      {
        elderId,
        destination: '圣德肋撒医院',
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

    await tx.insert(memopathGeofence).values({
      elderId,
      homeLabel: '家 · 旺角站 A 出口',
      radiusM: 800,
      dwellEnabled: true,
      dwellMinutes: 18,
    });

    await tx.insert(memopathPlace).values([
      { elderId, label: '家 · 旺角站 A 出口', icon: '🏠', placeType: 'frequent', beaconStatus: 'safe' },
      { elderId, label: '公園散步', icon: '🌳', placeType: 'frequent', beaconStatus: 'safe' },
      { elderId, label: '菜市場', icon: '🥬', placeType: 'frequent', beaconStatus: 'safe' },
      { elderId, label: '旺角', icon: '📡', placeType: 'beacon', beaconStatus: 'safe' },
      { elderId, label: '柴灣', icon: '📡', placeType: 'beacon', beaconStatus: 'strange' },
    ]);

    await tx.insert(memopathAlert).values({
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
    await tx.insert(memopathVital).values(vitalRows);

    await tx.insert(memopathMovement).values([
      { elderId, occurredDate: '2026-09-25', location: '某街道', status: 'safe', note: '' },
      { elderId, occurredDate: '2026-09-25', location: '某商場', status: 'safe', note: '' },
      { elderId, occurredDate: '2026-09-23', location: '某半島', status: 'out_of_range', note: '超出範圍' },
    ]);
  }

  private toTripRecord(row: typeof memopathTrip.$inferSelect): MemoPathTripRecord {
    return {
      id: row.id,
      elderId: row.elderId,
      destination: row.destination,
      tripDate: row.tripDate,
      startTime: row.startTime,
      endTime: row.endTime,
      scheduleMode: row.scheduleMode as MemoPathTripRecord['scheduleMode'],
      status: row.status,
    };
  }
}
