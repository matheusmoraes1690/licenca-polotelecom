CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" text,
	"client_id" integer,
	"credential_id" integer,
	"entity" text,
	"entity_id" integer,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"details" text,
	"snapshot" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"username" text,
	"password" text,
	"url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"file_type" text,
	"url" text NOT NULL,
	"size" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"status" text DEFAULT 'active',
	"milvus_id" text,
	"document" text,
	"source" text DEFAULT 'manual',
	"last_sync_at" timestamp,
	"sync_status" text DEFAULT 'pending',
	"milvus_updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "clients_milvus_id_unique" UNIQUE("milvus_id")
);
--> statement-breakpoint
CREATE TABLE "credential_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "credential_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "credential_custom_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"credential_id" integer NOT NULL,
	"name" text NOT NULL,
	"value" text,
	"is_encrypted" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credential_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"credential_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"file_type" text,
	"url" text NOT NULL,
	"size" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credential_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"credential_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"changes" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"category_id" integer,
	"category" text,
	"title" text NOT NULL,
	"url" text,
	"username" text,
	"encrypted_password" text,
	"encrypted_notes" text,
	"tags" text,
	"status" text DEFAULT 'active',
	"responsible_id" integer,
	"deleted_at" timestamp,
	"deleted_by" integer,
	"delete_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text,
	"email" text,
	"telefone" text,
	"endereco" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"fornecedor_id" integer,
	"status" text DEFAULT 'active',
	"data_atualizacao" timestamp DEFAULT now(),
	"produto_id" integer,
	"client_id" integer,
	"notes" text,
	"service_category" text,
	"contract_type" text DEFAULT 'new',
	"renewal_type" text DEFAULT 'none' NOT NULL,
	"expiration_date" timestamp,
	"alert_days_before" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"categoria" text,
	"fornecedor_id" integer,
	"preco" real,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_built_in" boolean DEFAULT false,
	"permissions" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "profiles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users_internal" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"profile_id" integer,
	"role" text DEFAULT 'viewer' NOT NULL,
	"status" text DEFAULT 'active',
	"last_login_at" timestamp,
	"login_attempts" integer DEFAULT 0,
	"blocked_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_internal_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_internal_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_internal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_custom_fields" ADD CONSTRAINT "credential_custom_fields_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_documents" ADD CONSTRAINT "credential_documents_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_history" ADD CONSTRAINT "credential_history_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_history" ADD CONSTRAINT "credential_history_user_id_users_internal_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_internal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_category_id_credential_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."credential_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_responsible_id_users_internal_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users_internal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_deleted_by_users_internal_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users_internal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_internal" ADD CONSTRAINT "users_internal_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;