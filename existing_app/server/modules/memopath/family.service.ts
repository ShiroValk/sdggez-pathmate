import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
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
  MemoPathSettingConfig,
  MemoPathTripInput,
  MemoPathTripRecord,
  MemoPathVitalRecord,
} from '@shared/api.interface';
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

  async listContacts(ownerId: string, elderId: string): Promise<MemoPathContactRecord[]> {
    await this.elderService.assertOwnership(ownerId, elderId);
    const rows = await this.db
      .select()
      .from(memopathElderContact)
      .where(eq(memopathElderContact.elderId, elderId))
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
    ownerId: string,
    elderId: string,
    dto: MemoPathContactDto,
  ): Promise<MemoPathContactRecord> {
    await this.elderService.assertOwnership(ownerId, elderId);
    const inserted = await this.db
      .insert(memopathElderContact)
      .values({
        elderId,
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
  }

  async listTrips(ownerId: string, elderId: string): Promise<MemoPathTripRecord[]> {
    await this.elderService.assertOwnership(ownerId, elderId);
    const rows = await this.db
      .select()
      .from(memopathTrip)
      .where(eq(memopathTrip.elderId, elderId))
      .orderBy(asc(memopathTrip.tripDate), asc(memopathTrip.startTime));
    return rows.map((row): MemoPathTripRecord => this.toTripRecord(row));
  }

  async createTrip(ownerId: string, dto: MemoPathTripDto): Promise<MemoPathTripRecord> {
    await this.elderService.assertOwnership(ownerId, dto.elderId);
    const inserted = await this.db
      .insert(memopathTrip)
      .values({
        elderId: dto.elderId,
        destination: dto.destination,
        tripDate: dto.tripDate,
        startTime: dto.startTime ?? '',
        endTime: dto.endTime ?? '',
        scheduleMode: dto.scheduleMode ?? 'manual',
        status: 'pending',
      })
      .returning();
    return this.toTripRecord(inserted[0]);
  }

  async callCab(ownerId: string, tripId: string): Promise<MemoPathTripRecord> {
    const trips = await this.db
      .select({ id: memopathTrip.id, elderId: memopathTrip.elderId })
      .from(memopathTrip)
      .where(eq(memopathTrip.id, tripId))
      .limit(1);
    const trip = trips[0];
    if (!trip) {
      throw new NotFoundException('行程不存在');
    }
    await this.elderService.assertOwnership(ownerId, trip.elderId);
    const updated = await this.db
      .update(memopathTrip)
      .set({ status: 'cab_called', updatedAt: new Date() })
      .where(eq(memopathTrip.id, tripId))
      .returning();
    return this.toTripRecord(updated[0]);
  }

  async getSetting(ownerId: string): Promise<MemoPathSettingConfig> {
    const rows = await this.db
      .select()
      .from(memopathSetting)
      .where(eq(memopathSetting.createdBy, ownerId))
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

  async saveSetting(ownerId: string, config: MemoPathSettingConfig): Promise<MemoPathSettingConfig> {
    const payload: StoredSettingConfig = {
      language: config.language,
      voice_mode: config.voiceMode,
      lock_layout: config.lockLayout,
    };
    const existing = await this.db
      .select({ id: memopathSetting.id })
      .from(memopathSetting)
      .where(eq(memopathSetting.createdBy, ownerId))
      .limit(1);
    if (existing.length > 0) {
      await this.db
        .update(memopathSetting)
        .set({ config: payload, updatedAt: new Date() })
        .where(eq(memopathSetting.id, existing[0].id));
    } else {
      await this.db.insert(memopathSetting).values({ config: payload });
    }
    return this.getSetting(ownerId);
  }

  async getGeofence(ownerId: string, elderId: string): Promise<MemoPathGeofenceRecord> {
    await this.elderService.assertOwnership(ownerId, elderId);
    const rows = await this.db
      .select()
      .from(memopathGeofence)
      .where(eq(memopathGeofence.elderId, elderId))
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
    ownerId: string,
    elderId: string,
    dto: MemoPathGeofenceDto,
  ): Promise<MemoPathGeofenceRecord> {
    const current: MemoPathGeofenceRecord = await this.getGeofence(ownerId, elderId);
    const merged: MemoPathGeofenceInput = {
      homeLabel: dto.homeLabel ?? current.homeLabel,
      radiusM: dto.radiusM ?? current.radiusM,
      dwellEnabled: dto.dwellEnabled ?? current.dwellEnabled,
      dwellMinutes: dto.dwellMinutes ?? current.dwellMinutes,
    };
    await this.db
      .insert(memopathGeofence)
      .values({ elderId, ...merged })
      .onConflictDoUpdate({
        target: memopathGeofence.elderId,
        set: { ...merged, updatedAt: new Date() },
      });
    return this.getGeofence(ownerId, elderId);
  }

  async listPlaces(ownerId: string, elderId: string): Promise<MemoPathPlaceRecord[]> {
    await this.elderService.assertOwnership(ownerId, elderId);
    const rows = await this.db
      .select()
      .from(memopathPlace)
      .where(eq(memopathPlace.elderId, elderId))
      .orderBy(asc(memopathPlace.createdAt));
    return rows.map((row): MemoPathPlaceRecord => ({
      id: row.id,
      elderId: row.elderId,
      label: row.label,
      icon: row.icon,
      placeType: row.placeType as MemoPathPlaceRecord['placeType'],
      beaconStatus: row.beaconStatus as MemoPathPlaceRecord['beaconStatus'],
      address: '',
      lng: 0,
      lat: 0,
    }));
  }

  async addPlace(ownerId: string, dto: MemoPathPlaceDto): Promise<MemoPathPlaceRecord> {
    await this.elderService.assertOwnership(ownerId, dto.elderId);
    const inserted = await this.db
      .insert(memopathPlace)
      .values({
        elderId: dto.elderId,
        label: dto.label,
        icon: dto.icon || '📍',
        placeType: dto.placeType ?? 'frequent',
        beaconStatus: dto.beaconStatus ?? 'safe',
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
      address: '',
      lng: 0,
      lat: 0,
    };
  }

  async listAlerts(ownerId: string, elderId: string): Promise<MemoPathAlertRecord[]> {
    await this.elderService.assertOwnership(ownerId, elderId);
    const rows = await this.db
      .select()
      .from(memopathAlert)
      .where(eq(memopathAlert.elderId, elderId))
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
    ownerId: string,
    elderId: string,
  ): Promise<{ latest: MemoPathVitalRecord | null; trend: MemoPathVitalRecord[] }> {
    await this.elderService.assertOwnership(ownerId, elderId);
    const oneHourAgo: Date = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await this.db
      .select()
      .from(memopathVital)
      .where(and(eq(memopathVital.elderId, elderId), gte(memopathVital.recordedAt, oneHourAgo)))
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

  async listMovements(ownerId: string, elderId: string): Promise<MemoPathMovementRecord[]> {
    await this.elderService.assertOwnership(ownerId, elderId);
    const rows = await this.db
      .select()
      .from(memopathMovement)
      .where(eq(memopathMovement.elderId, elderId))
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

  async getDashboard(ownerId: string, elderId?: string): Promise<MemoPathFamilyDashboardResponse> {
    const elders = await this.elderService.list(ownerId);
    if (elders.length === 0) {
      return { elder: null, latestVital: null, latestAlert: null, places: [], todayTrips: [] };
    }
    const elder = elders.find((item) => item.id === elderId) ?? elders[0];
    const targetId: string = elder.id;
    const vitals = await this.getVitalSummary(ownerId, targetId);
    const alerts = await this.listAlerts(ownerId, targetId);
    const places = await this.listPlaces(ownerId, targetId);
    const trips = await this.listTrips(ownerId, targetId);
    const today: string = new Date().toISOString().slice(0, 10);
    return {
      elder,
      latestVital: vitals.latest,
      latestAlert: alerts.length > 0 ? alerts[0] : null,
      places,
      todayTrips: trips.filter((trip: MemoPathTripRecord) => trip.tripDate === today),
    };
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
