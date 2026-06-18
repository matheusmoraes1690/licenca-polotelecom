ALTER TABLE "users_internal" ADD COLUMN "last_password_changed_at" timestamp DEFAULT now();
ALTER TABLE "users_internal" ADD COLUMN "password_expires_at" timestamp;

CREATE TABLE "password_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
