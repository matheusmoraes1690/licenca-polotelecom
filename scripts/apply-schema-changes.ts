import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create new tables if they don't exist yet
    await client.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "key" text NOT NULL UNIQUE,
        "value" text NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "credential_documents" (
        "id" serial PRIMARY KEY NOT NULL,
        "credential_id" integer NOT NULL REFERENCES "credentials"("id"),
        "name" text NOT NULL,
        "type" text NOT NULL,
        "file_type" text,
        "url" text NOT NULL,
        "size" integer,
        "created_at" timestamp DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "credential_history" (
        "id" serial PRIMARY KEY NOT NULL,
        "credential_id" integer NOT NULL REFERENCES "credentials"("id"),
        "user_id" integer NOT NULL REFERENCES "users_internal"("id"),
        "action" text NOT NULL,
        "changes" text NOT NULL,
        "reason" text,
        "created_at" timestamp DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "credential_custom_fields" (
        "id" serial PRIMARY KEY NOT NULL,
        "credential_id" integer NOT NULL REFERENCES "credentials"("id"),
        "name" text NOT NULL,
        "value" text,
        "is_encrypted" boolean DEFAULT false,
        "order" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "credential_categories" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE,
        "description" text,
        "icon" text,
        "created_at" timestamp DEFAULT now()
      )
    `);

    // Drop removed tables
    await client.query('DROP TABLE IF EXISTS "hardware" CASCADE');
    await client.query('DROP TABLE IF EXISTS "tipos_contrato" CASCADE');
    await client.query('DROP TABLE IF EXISTS "tipos_servico" CASCADE');

    // Licenses: drop old FK columns if they exist
    await client.query('ALTER TABLE "licenses" DROP COLUMN IF EXISTS "tipo_contrato_id"');
    await client.query('ALTER TABLE "licenses" DROP COLUMN IF EXISTS "tipo_servico_id"');

    // Licenses: add new columns
    await client.query('ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "service_category" text');
    await client.query('ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "contract_type" text DEFAULT \'new\'');
    await client.query('ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "renewal_type" text DEFAULT \'none\'');
    await client.query('ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "expiration_date" timestamp');
    await client.query('ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "alert_days_before" integer');

    // Users: add role
    await client.query('ALTER TABLE "users_internal" ADD COLUMN IF NOT EXISTS "role" text DEFAULT \'viewer\'');
    // Set existing admin user
    await client.query('UPDATE "users_internal" SET "role" = \'admin\' WHERE "username" = \'admin\'');

    // Credentials: add category text column
    await client.query('ALTER TABLE "credentials" ADD COLUMN IF NOT EXISTS "category" text');

    // Audit logs: add entity fields
    await client.query('ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity" text');
    await client.query('ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" integer');
    await client.query('ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "snapshot" text');

    await client.query("COMMIT");
    console.log("Schema changes applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error applying schema changes:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
