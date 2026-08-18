CREATE TABLE "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref_id" integer,
	"image_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
