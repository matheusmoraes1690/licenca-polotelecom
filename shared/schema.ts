import { pgTable, text, integer, real, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// --- Clients ---
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  status: text("status").default("active"), // active, inactive
  milvusId: text("milvus_id").unique(),
  document: text("document"),
  source: text("source").default("manual"), // manual, milvus
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status").default("pending"), // pending, synced, error
  milvusUpdatedAt: timestamp("milvus_updated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// --- Licenses ---
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  fornecedorId: integer("fornecedor_id").references(() => fornecedores.id),
  status: text("status").default("active"), // active, expired, suspended
  dataAtualizacao: timestamp("data_atualizacao").defaultNow(),
  produtoId: integer("produto_id").references(() => produtos.id),
  clientId: integer("client_id").references(() => clients.id),
  notes: text("notes"),
  serviceCategory: text("service_category"),
  contractType: text("contract_type").default("new"), // new, renewal, trial, perpetual
  renewalType: text("renewal_type").notNull().default("none"), // none, annual, monthly, custom
  expirationDate: timestamp("expiration_date"),
  alertDaysBefore: integer("alert_days_before"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLicenseSchema = z.object({
  key: z.string().min(1, "Chave da licença é obrigatória"),
  fornecedorId: z.number().int().positive().nullable().optional(),
  status: z.string().optional().default("active"),
  produtoId: z.number().int().positive().nullable().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  serviceCategory: z.string().nullable().optional(),
  contractType: z.enum(["new", "renewal", "trial", "perpetual"]).optional().default("new"),
  renewalType: z.enum(["none", "annual", "monthly", "custom"]).optional().default("none"),
  expirationDate: z.union([z.string(), z.date()]).nullable().optional(),
  alertDaysBefore: z.number().int().nullable().optional(),
});
export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;

// --- Relations ---
export const clientsRelations = relations(clients, ({ many }) => ({
  licenses: many(licenses),
}));

export const licensesRelations = relations(licenses, ({ one }) => ({
  client: one(clients, {
    fields: [licenses.clientId],
    references: [clients.id],
  }),
  fornecedor: one(fornecedores, {
    fields: [licenses.fornecedorId],
    references: [fornecedores.id],
  }),
  produto: one(produtos, {
    fields: [licenses.produtoId],
    references: [produtos.id],
  }),
}));

// --- API Types ---
export type CreateClientRequest = InsertClient;
export type UpdateClientRequest = Partial<InsertClient>;
export type ClientResponse = Client & { activeLicenseCount?: number; licenseCount?: number; credentialCount?: number };

export type CreateLicenseRequest = InsertLicense;
export type UpdateLicenseRequest = Partial<InsertLicense>;
export type LicenseResponse = License & { clientName?: string };

export interface DashboardStats {
  totalClients: number;
  totalLicenses: number;
  activeLicenses: number;
  expiringLicenses: number;
  perpetualLicenses: number;
  totalCredentials: number;
  activeCredentials: number;
  inactiveCredentials: number;
  recentAuditEvents: number;
}

// --- Fornecedor (Supplier) ---
export const fornecedores = pgTable("fornecedores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  email: text("email"),
  telefone: text("telefone"),
  endereco: text("endereco"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFornecedorSchema = createInsertSchema(fornecedores).omit({ id: true, createdAt: true });
export type Fornecedor = typeof fornecedores.$inferSelect;
export type InsertFornecedor = z.infer<typeof insertFornecedorSchema>;

// --- Produto (Product) ---
export const produtos = pgTable("produtos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria"),
  fornecedorId: integer("fornecedor_id").references(() => fornecedores.id),
  preco: real("preco"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProdutoSchema = createInsertSchema(produtos).omit({ id: true, createdAt: true });
export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = z.infer<typeof insertProdutoSchema>;

// --- Relations for Cadastro ---
export const fornecedoresRelations = relations(fornecedores, ({ many }) => ({
  produtos: many(produtos),
  licenses: many(licenses),
}));

export const produtosRelations = relations(produtos, ({ one, many }) => ({
  fornecedor: one(fornecedores, {
    fields: [produtos.fornecedorId],
    references: [fornecedores.id],
  }),
  licenses: many(licenses),
}));


// --- Client Documents ---
export const clientDocuments = pgTable("client_documents", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'file' or 'link'
  fileType: text("file_type"), // pdf, word, excel, etc.
  url: text("url").notNull(), // file path or external URL
  size: integer("size"), // file size in bytes
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientDocumentSchema = z.object({
  clientId: z.number(),
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(['file', 'link']),
  fileType: z.string().nullable(),
  url: z.string().min(1, "URL é obrigatória"),
  size: z.number().nullable(),
});
export type ClientDocument = typeof clientDocuments.$inferSelect;
export type InsertClientDocument = z.infer<typeof insertClientDocumentSchema>;

export const clientDocumentsRelations = relations(clientDocuments, ({ one }) => ({
  client: one(clients, {
    fields: [clientDocuments.clientId],
    references: [clients.id],
  }),
}));

// --- Profiles (Permission Groups) ---
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isBuiltIn: boolean("is_built_in").default(false),
  permissions: text("permissions").default("{}"), // JSON string of permissions
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true });
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

// --- Users (Internal System Users) ---
export const users = pgTable("users_internal", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  profileId: integer("profile_id").references(() => profiles.id),
  role: text("role").notNull().default("viewer"), // admin, editor, viewer
  status: text("status").default("active"), // active, inactive, blocked
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0),
  blockedUntil: timestamp("blocked_until"),
  lastPasswordChangedAt: timestamp("last_password_changed_at").defaultNow(),
  passwordExpiresAt: timestamp("password_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLoginAt: true, loginAttempts: true, blockedUntil: true, lastPasswordChangedAt: true, passwordExpiresAt: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// --- Password History ---
export const passwordHistory = pgTable("password_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordHistory = typeof passwordHistory.$inferSelect;

// --- Credential Categories ---
export const credentialCategories = pgTable("credential_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCredentialCategorySchema = createInsertSchema(credentialCategories).omit({ id: true, createdAt: true });
export type CredentialCategory = typeof credentialCategories.$inferSelect;
export type InsertCredentialCategory = z.infer<typeof insertCredentialCategorySchema>;

// --- Credentials (Password Vault) ---
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  categoryId: integer("category_id").references(() => credentialCategories.id),
  category: text("category"),
  title: text("title").notNull(),
  url: text("url"),
  username: text("username"),
  encryptedPassword: text("encrypted_password"),
  encryptedNotes: text("encrypted_notes"),
  tags: text("tags"), // comma-separated tags
  status: text("status").default("active"), // active, inactive, deleted
  responsibleId: integer("responsible_id").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCredentialSchema = z.object({
  clientId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
  category: z.string().nullable().optional(),
  title: z.string().min(1, "Título é obrigatório"),
  url: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  status: z.string().optional().default("active"),
  responsibleId: z.number().int().positive().nullable().optional(),
});

export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;

// --- API Route Validation Schemas ---
export const createUserSchema = z.object({
  username: z.string().min(1, "Username é obrigatório").max(50),
  name: z.string().min(1, "Nome é obrigatório").max(100),
  email: z.string().email("Email inválido").optional(),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  profileId: z.number().int().positive().optional(),
  role: z.enum(["admin", "editor", "viewer"]).optional().default("viewer"),
});

export const updateUserSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  profileId: z.number().int().positive().optional(),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
});

export const createProfileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().optional(),
  permissions: z.record(z.any()).optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

// --- Credential Custom Fields ---
export const credentialCustomFields = pgTable("credential_custom_fields", {
  id: serial("id").primaryKey(),
  credentialId: integer("credential_id").notNull().references(() => credentials.id),
  name: text("name").notNull(),
  value: text("value"),
  isEncrypted: boolean("is_encrypted").default(false),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCredentialCustomFieldSchema = z.object({
  credentialId: z.number().int().positive(),
  name: z.string().min(1, "Nome do campo é obrigatório"),
  value: z.string().nullable().optional(),
  isEncrypted: z.boolean().optional().default(false),
  order: z.number().optional().default(0),
});

export type CredentialCustomField = typeof credentialCustomFields.$inferSelect;
export type InsertCredentialCustomField = z.infer<typeof insertCredentialCustomFieldSchema>;

// --- Credential History ---
export const credentialHistory = pgTable("credential_history", {
  id: serial("id").primaryKey(),
  credentialId: integer("credential_id").notNull().references(() => credentials.id),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // created, updated, password_changed, deleted, restored
  changes: text("changes").notNull(), // JSON diff of changes
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCredentialHistorySchema = createInsertSchema(credentialHistory).omit({ id: true, createdAt: true });
export type CredentialHistory = typeof credentialHistory.$inferSelect;
export type InsertCredentialHistory = z.infer<typeof insertCredentialHistorySchema>;

// --- Credential Documents ---
export const credentialDocuments = pgTable("credential_documents", {
  id: serial("id").primaryKey(),
  credentialId: integer("credential_id").notNull().references(() => credentials.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'file' or 'link'
  fileType: text("file_type"), // pdf, word, excel, zip, etc.
  url: text("url").notNull(), // file path or external URL
  size: integer("size"), // file size in bytes
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCredentialDocumentSchema = z.object({
  credentialId: z.number(),
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(['file', 'link']),
  fileType: z.string().nullable(),
  url: z.string().min(1, "URL é obrigatória"),
  size: z.number().nullable(),
});
export type CredentialDocument = typeof credentialDocuments.$inferSelect;
export type InsertCredentialDocument = z.infer<typeof insertCredentialDocumentSchema>;

export const credentialDocumentsRelations = relations(credentialDocuments, ({ one }) => ({
  credential: one(credentials, {
    fields: [credentialDocuments.credentialId],
    references: [credentials.id],
  }),
}));

// --- System Settings ---
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// --- Audit Logs ---
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userName: text("user_name"),
  clientId: integer("client_id").references(() => clients.id),
  credentialId: integer("credential_id").references(() => credentials.id),
  entity: text("entity"), // license, client, credential, product
  entityId: integer("entity_id"),
  action: text("action").notNull(),
  resource: text("resource").notNull(), // credential, client, user, document, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"), // JSON string with extra info
  snapshot: text("snapshot"), // JSON with previous data
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// --- Relations for Vault ---
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.profileId],
    references: [profiles.id],
  }),
  credentials: many(credentials),
  auditLogs: many(auditLogs),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  users: many(users),
}));

export const credentialsRelations = relations(credentials, ({ one, many }) => ({
  client: one(clients, {
    fields: [credentials.clientId],
    references: [clients.id],
  }),
  category: one(credentialCategories, {
    fields: [credentials.categoryId],
    references: [credentialCategories.id],
  }),
  responsible: one(users, {
    fields: [credentials.responsibleId],
    references: [users.id],
  }),
  customFields: many(credentialCustomFields),
  history: many(credentialHistory),
  documents: many(credentialDocuments),
}));

export const credentialCategoriesRelations = relations(credentialCategories, ({ many }) => ({
  credentials: many(credentials),
}));

export const credentialCustomFieldsRelations = relations(credentialCustomFields, ({ one }) => ({
  credential: one(credentials, {
    fields: [credentialCustomFields.credentialId],
    references: [credentials.id],
  }),
}));
