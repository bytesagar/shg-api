CREATE TABLE "migration_id_map" (
	"entity" varchar(64) NOT NULL,
	"v1_id" bigint NOT NULL,
	"v2_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "migration_id_map_entity_v1_id_pk" PRIMARY KEY("entity","v1_id")
);
