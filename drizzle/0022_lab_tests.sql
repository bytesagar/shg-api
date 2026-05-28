CREATE TABLE "lab_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(64) NOT NULL,
	"report_template" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "lab_tests_name_category_uidx" ON "lab_tests" USING btree ("name","category");--> statement-breakpoint
CREATE INDEX "lab_tests_category_idx" ON "lab_tests" USING btree ("category");