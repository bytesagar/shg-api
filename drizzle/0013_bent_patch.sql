CREATE TABLE "user_facility_affiliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"role" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "user_facility_affiliations" ADD CONSTRAINT "user_facility_affiliations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_facility_affiliations" ADD CONSTRAINT "user_facility_affiliations_facility_id_health_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."health_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_facility_affiliation_user_id_idx" ON "user_facility_affiliations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_facility_affiliation_facility_id_idx" ON "user_facility_affiliations" USING btree ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_facility_affiliation_unique" ON "user_facility_affiliations" USING btree ("user_id","facility_id");