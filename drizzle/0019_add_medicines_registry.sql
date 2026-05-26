CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medicine_name" varchar(500) NOT NULL,
	"medicine_form" varchar(100),
	"strength" varchar(255),
	"unit" varchar(100),
	"dose" varchar(255),
	"frequency" varchar(100),
	"route" varchar(100),
	"medicine_time" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"legacy_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medicines_name_idx" ON "medicines" USING btree ("medicine_name");--> statement-breakpoint
CREATE UNIQUE INDEX "medicines_legacy_id_uidx" ON "medicines" USING btree ("legacy_id");