/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const memopathMovement = pgTable("memopath_movement", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull(),
  occurredDate: date("occurred_date").notNull().default('CURRENT_DATE'),
  location: varchar("location", { length: 255 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default('safe'),
  note: varchar("note", { length: 255 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_memopath_movement_elder").on(table.elderId),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_movement_elder_id_fkey",
  }).onDelete("cascade"),
]);

export const memopathVital = pgTable("memopath_vital", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull(),
  heartRate: integer("heart_rate").notNull().default(0),
  bloodOxygen: integer("blood_oxygen").notNull().default(0),
  temperature: numeric("temperature").notNull().default('0'),
  steps: integer("steps").notNull().default(0),
  recordedAt: customTimestamptz("recorded_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_memopath_vital_elder").on(table.elderId),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_vital_elder_id_fkey",
  }).onDelete("cascade"),
]);

export const memopathAlert = pgTable("memopath_alert", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull(),
  alertType: varchar("alert_type", { length: 32 }).notNull().default('sos'),
  title: varchar("title", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default('notified'),
  occurredAt: customTimestamptz("occurred_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_memopath_alert_elder").on(table.elderId),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_alert_elder_id_fkey",
  }).onDelete("cascade"),
]);

export const memopathPlace = pgTable("memopath_place", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 16 }).notNull().default('📍'),
  placeType: varchar("place_type", { length: 16 }).notNull().default('frequent'),
  beaconStatus: varchar("beacon_status", { length: 16 }).notNull().default('safe'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_memopath_place_elder").on(table.elderId),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_place_elder_id_fkey",
  }).onDelete("cascade"),
]);

export const memopathGeofence = pgTable("memopath_geofence", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull().unique(),
  homeLabel: varchar("home_label", { length: 100 }).notNull(),
  radiusM: integer("radius_m").notNull().default(800),
  dwellEnabled: boolean("dwell_enabled").notNull().default(true),
  dwellMinutes: integer("dwell_minutes").notNull().default(18),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_memopath_geofence_elder").on(table.elderId),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_geofence_elder_id_fkey",
  }).onDelete("cascade"),
]);

export const memopathSetting = pgTable("memopath_setting", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * @type { language?: string; voice_mode?: string; lock_layout?: boolean }
   */
  config: jsonb("config").notNull().default('{}'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE UNIQUE INDEX idx_memopath_setting_creator ON memopath_setting USING btree (((_created_by).user_id)),
]);

export const memopathTrip = pgTable("memopath_trip", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  tripDate: date("trip_date").notNull().default('CURRENT_DATE'),
  startTime: varchar("start_time", { length: 8 }).notNull(),
  endTime: varchar("end_time", { length: 8 }).notNull(),
  scheduleMode: varchar("schedule_mode", { length: 16 }).notNull().default('manual'),
  status: varchar("status", { length: 32 }).notNull().default('pending'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_memopath_trip_elder").on(table.elderId),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_trip_elder_id_fkey",
  }).onDelete("cascade"),
]);

export const memopathElderContact = pgTable("memopath_elder_contact", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  relation: varchar("relation", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  avatarEmoji: varchar("avatar_emoji", { length: 16 }).notNull().default('👤'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_memopath_contact_elder").on(table.elderId),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_elder_contact_elder_id_fkey",
  }).onDelete("cascade"),
]);

export const memopathElder = pgTable("memopath_elder", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  relation: varchar("relation", { length: 100 }).notNull(),
  age: integer("age").notNull().default(0),
  gender: varchar("gender", { length: 20 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  emergencyPhone: varchar("emergency_phone", { length: 32 }).notNull(),
  avatarEmoji: varchar("avatar_emoji", { length: 16 }).notNull().default('👴'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE INDEX idx_memopath_elder_creator ON memopath_elder USING btree (((_created_by).user_id)),
]);

export const memopathAccount = pgTable("memopath_account", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountKey: varchar("account_key", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).notNull().default('family'),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  sessionToken: varchar("session_token", { length: 128 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_memopath_account_key").on(table.accountKey),
  // Complex index: CREATE INDEX idx_memopath_account_creator ON memopath_account USING btree (((_created_by).user_id)),
]);

// table aliases
export const memopathAccountTable = memopathAccount;
export const memopathAlertTable = memopathAlert;
export const memopathElderTable = memopathElder;
export const memopathElderContactTable = memopathElderContact;
export const memopathGeofenceTable = memopathGeofence;
export const memopathMovementTable = memopathMovement;
export const memopathPlaceTable = memopathPlace;
export const memopathSettingTable = memopathSetting;
export const memopathTripTable = memopathTrip;
export const memopathVitalTable = memopathVital;
