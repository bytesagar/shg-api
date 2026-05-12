ALTER TABLE "person_addresses" ADD COLUMN "municipality_id" uuid;--> statement-breakpoint
ALTER TABLE "person_addresses" ADD COLUMN "district_id" uuid;--> statement-breakpoint
ALTER TABLE "person_addresses" ADD COLUMN "province_id" uuid;--> statement-breakpoint
ALTER TABLE "person_addresses" ADD CONSTRAINT "person_addresses_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_addresses" ADD CONSTRAINT "person_addresses_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_addresses" ADD CONSTRAINT "person_addresses_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_address_municipality_id_idx" ON "person_addresses" USING btree ("municipality_id");--> statement-breakpoint
CREATE INDEX "person_address_district_id_idx" ON "person_addresses" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "person_address_province_id_idx" ON "person_addresses" USING btree ("province_id");