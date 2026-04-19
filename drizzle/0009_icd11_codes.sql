CREATE TABLE "icd11_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"category" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "icd11_codes_code_uidx" ON "icd11_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "icd11_codes_category_idx" ON "icd11_codes" USING btree ("category");
-- Optional trigram indexes (requires pg_trgm): enable extension in provider UI or as superuser, then run:
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
--   CREATE INDEX "icd11_codes_title_trgm_idx" ON "icd11_codes" USING gin ("title" gin_trgm_ops);
--   CREATE INDEX "icd11_codes_code_trgm_idx" ON "icd11_codes" USING gin ("code" gin_trgm_ops);