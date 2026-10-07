CREATE TABLE "memopath_care_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"family_account_id" uuid NOT NULL,
	"target_elder_account_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp (3) with time zone DEFAULT CURRENT_TIMESTAMP + interval '600 seconds' NOT NULL,
	"consumed_at" timestamp (3) with time zone,
	CONSTRAINT "memopath_care_invitation_status_check" CHECK ("memopath_care_invitation"."status" IN ('pending','accepted','revoked')),
	CONSTRAINT "memopath_care_invitation_hash_check" CHECK ("memopath_care_invitation"."code_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "memopath_care_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elder_id" uuid NOT NULL,
	"family_account_id" uuid NOT NULL,
	"elder_account_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp (3) with time zone,
	CONSTRAINT "memopath_care_link_status_check" CHECK ("memopath_care_link"."status" IN ('active','revoked')),
	CONSTRAINT "memopath_care_link_revocation_check" CHECK (("memopath_care_link"."status" = 'active' AND "memopath_care_link"."revoked_at" IS NULL) OR ("memopath_care_link"."status" = 'revoked' AND "memopath_care_link"."revoked_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "memopath_place" ADD COLUMN "address" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "memopath_place" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "memopath_place" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "memopath_care_invitation" ADD CONSTRAINT "memopath_care_invitation_target_fkey" FOREIGN KEY ("target_elder_account_id") REFERENCES "public"."memopath_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_care_invitation" ADD CONSTRAINT "memopath_care_invitation_owner_fkey" FOREIGN KEY ("elder_id","family_account_id") REFERENCES "public"."memopath_elder"("id","owner_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_care_link" ADD CONSTRAINT "memopath_care_link_account_fkey" FOREIGN KEY ("elder_account_id") REFERENCES "public"."memopath_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memopath_care_link" ADD CONSTRAINT "memopath_care_link_owner_fkey" FOREIGN KEY ("elder_id","family_account_id") REFERENCES "public"."memopath_elder"("id","owner_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memopath_care_invitation_hash" ON "memopath_care_invitation" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "idx_memopath_care_invitation_elder" ON "memopath_care_invitation" USING btree ("elder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memopath_care_link_active_elder" ON "memopath_care_link" USING btree ("elder_id") WHERE "memopath_care_link"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_memopath_care_link_active_account" ON "memopath_care_link" USING btree ("elder_account_id") WHERE "memopath_care_link"."status" = 'active';--> statement-breakpoint
ALTER TABLE "memopath_place" ADD CONSTRAINT "memopath_place_coordinate_check" CHECK (("memopath_place"."lng" IS NULL AND "memopath_place"."lat" IS NULL) OR
    ("memopath_place"."lng" IS NOT NULL AND "memopath_place"."lat" IS NOT NULL AND "memopath_place"."lng" BETWEEN -180 AND 180 AND "memopath_place"."lat" BETWEEN -90 AND 90));