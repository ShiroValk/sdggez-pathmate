/**
 * Independent PostgreSQL 0001 model. Drizzle retains existing property/API names.
 * UUID audit actors are nullable foreign keys, never business ownership. Services
 * enforce roles, demo domains and permissions; DB constraints protect integrity.
 * Dates use Hong Kong business days; timestamps represent instants as Date/ISO.
 * No platform composite types, plaintext sessions or implicit owner fallback.
 */
import { sql } from 'drizzle-orm';
import { boolean, check, date, doublePrecision, foreignKey, index, integer, jsonb, numeric,
  pgTable, text, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

/** Authentication storage: password hashes and one revocable, expiring session. */
export const memopathAccount = pgTable('memopath_account', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountKey: varchar('account_key', { length: 64 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 16 }).notNull().default('family'),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
  sessionTokenHash: varchar('session_token_hash', { length: 64 }),
  sessionExpiresAt: timestamp('session_expires_at', { precision: 3, withTimezone: true, mode: 'date' }),
  createdAt: timestamp('_created_at', { precision: 3, withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('_updated_at', { precision: 3, withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  createdBy: uuid('_created_by').references((): AnyPgColumn => memopathAccount.id, { onDelete: 'set null' }),
  updatedBy: uuid('_updated_by').references((): AnyPgColumn => memopathAccount.id, { onDelete: 'set null' }),
}, table => [
  uniqueIndex('idx_memopath_account_key').on(table.accountKey),
  uniqueIndex('idx_memopath_account_session_hash').on(table.sessionTokenHash).where(sql`${table.sessionTokenHash} IS NOT NULL`),
  check('memopath_account_key_check', sql`length(btrim(${table.accountKey})) BETWEEN 1 AND 64 AND ${table.accountKey} = btrim(${table.accountKey})`),
  check('memopath_account_role_check', sql`${table.role} IN ('family','elder')`),
  check('memopath_account_display_name_check', sql`length(btrim(${table.displayName})) BETWEEN 1 AND 100`),
  check('memopath_account_session_pair_check', sql`(${table.sessionTokenHash} IS NULL) = (${table.sessionExpiresAt} IS NULL)`),
  check('memopath_account_session_hash_check', sql`${table.sessionTokenHash} IS NULL OR ${table.sessionTokenHash} ~ '^[0-9a-f]{64}$'`),
]);

export const memopathMovement = pgTable("memopath_movement", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull(),
  occurredDate: date("occurred_date").notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Hong_Kong')::date`),
  location: varchar("location", { length: 255 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default('safe'),
  note: varchar("note", { length: 255 }).notNull(),
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_memopath_movement_elder").on(table.elderId),
  check("memopath_movement_status_check", sql`${table.status} IN ('safe','out_of_range')`),
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
  recordedAt: timestamp("recorded_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
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
  occurredAt: timestamp("occurred_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
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
  address: varchar('address', { length: 255 }).notNull().default(''),
  lng: doublePrecision('lng'),
  lat: doublePrecision('lat'),
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_memopath_place_elder").on(table.elderId),
  check("memopath_place_label_check", sql`length(btrim(${table.label})) > 0`),
  check("memopath_place_type_check", sql`${table.placeType} IN ('frequent','beacon')`),
  check("memopath_place_beacon_check", sql`${table.beaconStatus} IN ('safe','strange')`),
  check('memopath_place_coordinate_check', sql`(${table.lng} IS NULL AND ${table.lat} IS NULL) OR
    (${table.lng} IS NOT NULL AND ${table.lat} IS NOT NULL AND ${table.lng} BETWEEN -180 AND 180 AND ${table.lat} BETWEEN -90 AND 90)`),
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
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
}, (table) => [
  uniqueIndex("idx_memopath_geofence_elder").on(table.elderId),
  check("memopath_geofence_radius_check", sql`${table.radiusM} BETWEEN 100 AND 5000`),
  check("memopath_geofence_dwell_check", sql`${table.dwellMinutes} BETWEEN 1 AND 120`),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_geofence_elder_id_fkey",
  }).onDelete("cascade"),
]);

/** Private account settings; callers never supply account ownership. */
export const memopathSetting = pgTable("memopath_setting", {
  accountId: uuid("account_id").notNull().unique().references(() => memopathAccount.id, { onDelete: "restrict" }),
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * @type { language?: string; voice_mode?: string; lock_layout?: boolean }
   */
  config: jsonb("config").notNull().default('{}'),
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
}, (table) => [
  check("memopath_setting_config_check", sql`jsonb_typeof(${table.config}) = 'object'
    AND (NOT (${table.config} ? 'language') OR ${table.config}->>'language' IN ('mandarin','cantonese','english'))
    AND (NOT (${table.config} ? 'voice_mode') OR ${table.config}->>'voice_mode' IN ('default_on','standby'))
    AND (NOT (${table.config} ? 'lock_layout') OR jsonb_typeof(${table.config}->'lock_layout') = 'boolean')`),
]);

export const memopathTrip = pgTable("memopath_trip", {
  id: uuid("id").primaryKey().defaultRandom(),
  elderId: uuid("elder_id").notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  tripDate: date("trip_date").notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Hong_Kong')::date`),
  startTime: varchar("start_time", { length: 8 }).notNull(),
  endTime: varchar("end_time", { length: 8 }).notNull(),
  scheduleMode: varchar("schedule_mode", { length: 16 }).notNull().default('manual'),
  status: varchar("status", { length: 32 }).notNull().default('pending'),
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_memopath_trip_elder").on(table.elderId),
  check("memopath_trip_mode_check", sql`${table.scheduleMode} IN ('auto','manual')`),
  check("memopath_trip_time_check", sql`(${table.startTime} = '' OR ${table.startTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND (${table.endTime} = '' OR ${table.endTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND (${table.startTime} = '' OR ${table.endTime} = '' OR ${table.endTime} >= ${table.startTime})`),
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
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_memopath_contact_elder").on(table.elderId),
  foreignKey({
    columns: [table.elderId],
    foreignColumns: [memopathElder.id],
    name: "memopath_elder_contact_elder_id_fkey",
  }).onDelete("cascade"),
]);

/** Care records have a mandatory owner independent of nullable audit actors. */
export const memopathElder = pgTable("memopath_elder", {
  ownerAccountId: uuid("owner_account_id").notNull().references(() => memopathAccount.id, { onDelete: "restrict" }),
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
  createdAt: timestamp("_created_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: uuid("_created_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
  updatedAt: timestamp("_updated_at", { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: uuid("_updated_by").references((): AnyPgColumn => memopathAccount.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_memopath_elder_owner").on(table.ownerAccountId),
  unique("memopath_elder_id_owner_unique").on(table.id, table.ownerAccountId),
  check("memopath_elder_name_check", sql`length(btrim(${table.name})) > 0 AND ${table.name} = btrim(${table.name})`),
  check("memopath_elder_age_check", sql`${table.age} BETWEEN 0 AND 130`),
]);

/** Explicit consent; only hashes are stored. Service verifies role/demo domain
 * and consumes pending, unexpired invitations under elder/target row locks.
 */
export const memopathCareInvitation = pgTable('memopath_care_invitation', {
  id: uuid('id').primaryKey().defaultRandom(),
  elderId: uuid('elder_id').notNull(),
  familyAccountId: uuid('family_account_id').notNull(),
  targetElderAccountId: uuid('target_elder_account_id').notNull(),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { precision: 3, withTimezone: true, mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP + interval '600 seconds'`),
  consumedAt: timestamp('consumed_at', { precision: 3, withTimezone: true, mode: 'date' }),
}, table => [
  foreignKey({ name: 'memopath_care_invitation_target_fkey', columns: [table.targetElderAccountId], foreignColumns: [memopathAccount.id] }).onDelete('restrict'),
  foreignKey({ name: 'memopath_care_invitation_owner_fkey', columns: [table.elderId, table.familyAccountId], foreignColumns: [memopathElder.id, memopathElder.ownerAccountId] }).onDelete('cascade'),
  uniqueIndex('idx_memopath_care_invitation_hash').on(table.codeHash),
  index('idx_memopath_care_invitation_elder').on(table.elderId),
  check('memopath_care_invitation_status_check', sql`${table.status} IN ('pending','accepted','revoked')`),
  check('memopath_care_invitation_hash_check', sql`${table.codeHash} ~ '^[0-9a-f]{64}$'`),
]);

/** Revocation retains the consent audit fact. Partial unique indexes enforce
 * one active link per elder and per elder account, including racing accepts.
 */
export const memopathCareLink = pgTable('memopath_care_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  elderId: uuid('elder_id').notNull(),
  familyAccountId: uuid('family_account_id').notNull(),
  elderAccountId: uuid('elder_account_id').notNull(),
  status: varchar('status', { length: 16 }).notNull().default('active'),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { precision: 3, withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { precision: 3, withTimezone: true, mode: 'date' }),
}, table => [
  foreignKey({ name: 'memopath_care_link_account_fkey', columns: [table.elderAccountId], foreignColumns: [memopathAccount.id] }).onDelete('restrict'),
  foreignKey({ name: 'memopath_care_link_owner_fkey', columns: [table.elderId, table.familyAccountId], foreignColumns: [memopathElder.id, memopathElder.ownerAccountId] }).onDelete('cascade'),
  uniqueIndex('idx_memopath_care_link_active_elder').on(table.elderId).where(sql`${table.status} = 'active'`),
  uniqueIndex('idx_memopath_care_link_active_account').on(table.elderAccountId).where(sql`${table.status} = 'active'`),
  check('memopath_care_link_status_check', sql`${table.status} IN ('active','revoked')`),
  check('memopath_care_link_revocation_check', sql`(${table.status} = 'active' AND ${table.revokedAt} IS NULL) OR (${table.status} = 'revoked' AND ${table.revokedAt} IS NOT NULL)`),
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
