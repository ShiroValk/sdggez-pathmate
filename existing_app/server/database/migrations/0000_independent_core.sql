CREATE TABLE "memopath_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_key" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(16) DEFAULT 'family' NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"session_token_hash" varchar(64),
	"session_expires_at" timestamp (3) with time zone,
	"_created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"_updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"_created_by" uuid,
	"_updated_by" uuid,
	CONSTRAINT "memopath_account_key_check" CHECK (length(btrim("memopath_account"."account_key")) BETWEEN 1 AND 64 AND "memopath_account"."account_key" = btrim("memopath_account"."account_key")),
	CONSTRAINT "memopath_account_role_check" CHECK ("memopath_account"."role" IN ('family','elder')),
	CONSTRAINT "memopath_account_display_name_check" CHECK (length(btrim("memopath_account"."display_name")) BETWEEN 1 AND 100),
	CONSTRAINT "memopath_account_session_pair_check" CHECK (("memopath_account"."session_token_hash" IS NULL) = ("memopath_account"."session_expires_at" IS NULL)),
	CONSTRAINT "memopath_account_session_hash_check" CHECK ("memopath_account"."session_token_hash" IS NULL OR "memopath_account"."session_token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "memopath_alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"alert_type" varchar(32) DEFAULT 'sos' NOT NULL,
	"title" varchar(255) NOT NULL,
	"location" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'notified' NOT NULL,
	"occurred_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "memopath_elder" (
	"owner_account_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"nickname" varchar(100) NOT NULL,
	"relation" varchar(100) NOT NULL,
	"age" integer DEFAULT 0 NOT NULL,
	"gender" varchar(20) NOT NULL,
	"address" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"emergency_phone" varchar(32) NOT NULL,
	"avatar_emoji" varchar(16) DEFAULT '👴' NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid,
	CONSTRAINT "memopath_elder_id_owner_unique" UNIQUE("id","owner_account_id"),
	CONSTRAINT "memopath_elder_name_check" CHECK (length(btrim("memopath_elder"."name")) > 0 AND "memopath_elder"."name" = btrim("memopath_elder"."name")),
	CONSTRAINT "memopath_elder_age_check" CHECK ("memopath_elder"."age" BETWEEN 0 AND 130)
);
--> statement-breakpoint
CREATE TABLE "memopath_elder_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"relation" varchar(100) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"avatar_emoji" varchar(16) DEFAULT '👤' NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "memopath_geofence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"home_label" varchar(100) NOT NULL,
	"radius_m" integer DEFAULT 800 NOT NULL,
	"dwell_enabled" boolean DEFAULT true NOT NULL,
	"dwell_minutes" integer DEFAULT 18 NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid,
	CONSTRAINT "memopath_geofence_elder_id_unique" UNIQUE("elder_id"),
	CONSTRAINT "memopath_geofence_radius_check" CHECK ("memopath_geofence"."radius_m" BETWEEN 100 AND 5000),
	CONSTRAINT "memopath_geofence_dwell_check" CHECK ("memopath_geofence"."dwell_minutes" BETWEEN 1 AND 120)
);
--> statement-breakpoint
CREATE TABLE "memopath_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"occurred_date" date DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Hong_Kong')::date NOT NULL,
	"location" varchar(255) NOT NULL,
	"status" varchar(16) DEFAULT 'safe' NOT NULL,
	"note" varchar(255) NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid,
	CONSTRAINT "memopath_movement_status_check" CHECK ("memopath_movement"."status" IN ('safe','out_of_range'))
);
--> statement-breakpoint
CREATE TABLE "memopath_place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"icon" varchar(16) DEFAULT '📍' NOT NULL,
	"place_type" varchar(16) DEFAULT 'frequent' NOT NULL,
	"beacon_status" varchar(16) DEFAULT 'safe' NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid,
	CONSTRAINT "memopath_place_label_check" CHECK (length(btrim("memopath_place"."label")) > 0),
	CONSTRAINT "memopath_place_type_check" CHECK ("memopath_place"."place_type" IN ('frequent','beacon')),
	CONSTRAINT "memopath_place_beacon_check" CHECK ("memopath_place"."beacon_status" IN ('safe','strange'))
);
--> statement-breakpoint
CREATE TABLE "memopath_setting" (
	"account_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid,
	CONSTRAINT "memopath_setting_account_id_unique" UNIQUE("account_id"),
	CONSTRAINT "memopath_setting_config_check" CHECK (jsonb_typeof("memopath_setting"."config") = 'object'
    AND (NOT ("memopath_setting"."config" ? 'language') OR "memopath_setting"."config"->>'language' IN ('mandarin','cantonese','english'))
    AND (NOT ("memopath_setting"."config" ? 'voice_mode') OR "memopath_setting"."config"->>'voice_mode' IN ('default_on','standby'))
    AND (NOT ("memopath_setting"."config" ? 'lock_layout') OR jsonb_typeof("memopath_setting"."config"->'lock_layout') = 'boolean'))
);
--> statement-breakpoint
CREATE TABLE "memopath_trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"destination" varchar(255) NOT NULL,
	"trip_date" date DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Hong_Kong')::date NOT NULL,
	"start_time" varchar(8) NOT NULL,
	"end_time" varchar(8) NOT NULL,
	"schedule_mode" varchar(16) DEFAULT 'manual' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid,
	CONSTRAINT "memopath_trip_mode_check" CHECK ("memopath_trip"."schedule_mode" IN ('auto','manual')),
	CONSTRAINT "memopath_trip_time_check" CHECK (("memopath_trip"."start_time" = '' OR "memopath_trip"."start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND ("memopath_trip"."end_time" = '' OR "memopath_trip"."end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND ("memopath_trip"."start_time" = '' OR "memopath_trip"."end_time" = '' OR "memopath_trip"."end_time" >= "memopath_trip"."start_time"))
);
--> statement-breakpoint
CREATE TABLE "memopath_vital" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"heart_rate" integer DEFAULT 0 NOT NULL,
	"blood_oxygen" integer DEFAULT 0 NOT NULL,
	"temperature" numeric DEFAULT '0' NOT NULL,
	"steps" integer DEFAULT 0 NOT NULL,
	"recorded_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_created_by" uuid,
	"_updated_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"_updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "memopath_account" ADD CONSTRAINT "memopath_account__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_account" ADD CONSTRAINT "memopath_account__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_alert" ADD CONSTRAINT "memopath_alert__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_alert" ADD CONSTRAINT "memopath_alert__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_alert" ADD CONSTRAINT "memopath_alert_elder_id_fkey" FOREIGN KEY ("elder_id") REFERENCES "public"."memopath_elder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_elder" ADD CONSTRAINT "memopath_elder_owner_account_id_memopath_account_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."memopath_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_elder" ADD CONSTRAINT "memopath_elder__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_elder" ADD CONSTRAINT "memopath_elder__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_elder_contact" ADD CONSTRAINT "memopath_elder_contact__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_elder_contact" ADD CONSTRAINT "memopath_elder_contact__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_elder_contact" ADD CONSTRAINT "memopath_elder_contact_elder_id_fkey" FOREIGN KEY ("elder_id") REFERENCES "public"."memopath_elder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_geofence" ADD CONSTRAINT "memopath_geofence__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_geofence" ADD CONSTRAINT "memopath_geofence__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_geofence" ADD CONSTRAINT "memopath_geofence_elder_id_fkey" FOREIGN KEY ("elder_id") REFERENCES "public"."memopath_elder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_movement" ADD CONSTRAINT "memopath_movement__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_movement" ADD CONSTRAINT "memopath_movement__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_movement" ADD CONSTRAINT "memopath_movement_elder_id_fkey" FOREIGN KEY ("elder_id") REFERENCES "public"."memopath_elder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_place" ADD CONSTRAINT "memopath_place__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_place" ADD CONSTRAINT "memopath_place__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_place" ADD CONSTRAINT "memopath_place_elder_id_fkey" FOREIGN KEY ("elder_id") REFERENCES "public"."memopath_elder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_setting" ADD CONSTRAINT "memopath_setting_account_id_memopath_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."memopath_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_setting" ADD CONSTRAINT "memopath_setting__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_setting" ADD CONSTRAINT "memopath_setting__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_trip" ADD CONSTRAINT "memopath_trip__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_trip" ADD CONSTRAINT "memopath_trip__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_trip" ADD CONSTRAINT "memopath_trip_elder_id_fkey" FOREIGN KEY ("elder_id") REFERENCES "public"."memopath_elder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_vital" ADD CONSTRAINT "memopath_vital__created_by_memopath_account_id_fk" FOREIGN KEY ("_created_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_vital" ADD CONSTRAINT "memopath_vital__updated_by_memopath_account_id_fk" FOREIGN KEY ("_updated_by") REFERENCES "public"."memopath_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_vital" ADD CONSTRAINT "memopath_vital_elder_id_fkey" FOREIGN KEY ("elder_id") REFERENCES "public"."memopath_elder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memopath_account_key" ON "memopath_account" USING btree ("account_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memopath_account_session_hash" ON "memopath_account" USING btree ("session_token_hash") WHERE "memopath_account"."session_token_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_memopath_alert_elder" ON "memopath_alert" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "idx_memopath_elder_owner" ON "memopath_elder" USING btree ("owner_account_id");--> statement-breakpoint
CREATE INDEX "idx_memopath_contact_elder" ON "memopath_elder_contact" USING btree ("elder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memopath_geofence_elder" ON "memopath_geofence" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "idx_memopath_movement_elder" ON "memopath_movement" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "idx_memopath_place_elder" ON "memopath_place" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "idx_memopath_trip_elder" ON "memopath_trip" USING btree ("elder_id");--> statement-breakpoint
CREATE INDEX "idx_memopath_vital_elder" ON "memopath_vital" USING btree ("elder_id");