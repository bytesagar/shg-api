DROP INDEX "medicines_name_idx";--> statement-breakpoint
DROP INDEX "medicines_legacy_id_uidx";--> statement-breakpoint
ALTER TABLE "medicines" ALTER COLUMN "medicine_form" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "medicines" ALTER COLUMN "medicine_form" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "medicines" ALTER COLUMN "strength" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "medicines" ALTER COLUMN "strength" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "medicines_name_form_strength_uidx" ON "medicines" USING btree ("medicine_name","medicine_form","strength");--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN "legacy_id";