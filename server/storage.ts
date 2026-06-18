import { db } from "./db";
import {
  clients, licenses,
  fornecedores, produtos, clientDocuments,
  users, profiles, credentials, credentialCategories, credentialCustomFields, credentialHistory, credentialDocuments, auditLogs,
  type Client, type ClientResponse, type InsertClient, type UpdateClientRequest,
  type License, type InsertLicense, type UpdateLicenseRequest,
  type Fornecedor, type InsertFornecedor,
  type Produto, type InsertProduto,
  type ClientDocument, type InsertClientDocument,
  type CredentialDocument, type InsertCredentialDocument,
  type User, type InsertUser,
  type Profile, type InsertProfile,
  type Credential, type InsertCredential,
  type CredentialCategory, type InsertCredentialCategory,
  type CredentialCustomField, type InsertCredentialCustomField,
  type CredentialHistory, type InsertCredentialHistory,
  type AuditLog, type InsertAuditLog,
  type DashboardStats,
  type SystemSetting, type InsertSystemSetting,
  systemSettings
} from "@shared/schema";
import { eq, count, sql, and, or, like, desc, gte } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";
import { encrypt, decrypt } from "./encryption";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface IStorage extends IAuthStorage {
  // Clients
  getClients(page?: number, limit?: number, search?: string, status?: string): Promise<PaginatedResult<ClientResponse>>;
  getClient(id: number): Promise<Client | undefined>;
  getClientByMilvusId(milvusId: string): Promise<Client | undefined>;
  getClientByDocument(document: string): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  getClientByName(name: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: UpdateClientRequest): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Licenses
  getLicenses(clientId?: number, status?: string, page?: number, limit?: number): Promise<PaginatedResult<License>>;
  getLicense(id: number): Promise<License | undefined>;
  getLicensesWithDetails(clientId?: number, status?: string, page?: number, limit?: number): Promise<PaginatedResult<any>>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: number, updates: UpdateLicenseRequest): Promise<License>;
  deleteLicense(id: number): Promise<void>;

  // Fornecedores
  getFornecedores(page?: number, limit?: number): Promise<PaginatedResult<Fornecedor>>;
  getFornecedor(id: number): Promise<Fornecedor | undefined>;
  createFornecedor(fornecedor: InsertFornecedor): Promise<Fornecedor>;
  updateFornecedor(id: number, updates: Partial<InsertFornecedor>): Promise<Fornecedor>;
  deleteFornecedor(id: number): Promise<void>;

  // Produtos
  getProdutos(page?: number, limit?: number): Promise<PaginatedResult<Produto>>;
  getProduto(id: number): Promise<Produto | undefined>;
  createProduto(produto: InsertProduto): Promise<Produto>;
  updateProduto(id: number, updates: Partial<InsertProduto>): Promise<Produto>;
  deleteProduto(id: number): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Client Documents
  getClientDocuments(clientId: number): Promise<ClientDocument[]>;
  getClientDocumentById(id: number): Promise<ClientDocument | undefined>;
  createClientDocument(document: InsertClientDocument): Promise<ClientDocument>;
  deleteClientDocument(id: number): Promise<void>;

  // Credential Documents
  getCredentialDocuments(credentialId: number): Promise<CredentialDocument[]>;
  getCredentialDocumentById(id: number): Promise<CredentialDocument | undefined>;
  createCredentialDocument(document: InsertCredentialDocument): Promise<CredentialDocument>;
  deleteCredentialDocument(id: number): Promise<void>;

  // Vault - Credential Categories
  getCredentialCategories(): Promise<CredentialCategory[]>;
  getCredentialCategory(id: number): Promise<CredentialCategory | undefined>;
  createCredentialCategory(category: InsertCredentialCategory): Promise<CredentialCategory>;

  // Vault - Credentials
  getCredentials(filters?: { clientId?: number; categoryId?: number; status?: string; search?: string; deleted?: boolean }, page?: number, limit?: number): Promise<PaginatedResult<Credential>>;
  getCredentialById(id: number): Promise<Credential | undefined>;
  createCredential(credential: InsertCredential & { customFields?: any[] }): Promise<Credential>;
  updateCredential(id: number, data: Partial<InsertCredential> & { customFields?: any[] }, userId: number): Promise<Credential>;
  softDeleteCredential(id: number, userId: number, reason?: string): Promise<void>;
  restoreCredential(id: number, userId: number): Promise<void>;
  permanentDeleteCredential(id: number): Promise<void>;
  revealCredentialPassword(id: number): Promise<string | null>;

  // Vault - Custom Fields
  getCredentialCustomFields(credentialId: number): Promise<CredentialCustomField[]>;

  // Vault - History
  getCredentialHistory(credentialId: number): Promise<CredentialHistory[]>;

  // Audit Logs
  getAuditLogs(filters?: { userId?: number; clientId?: number; credentialId?: number; entity?: string; entityId?: number; action?: string; limit?: number }, page?: number, limit?: number): Promise<PaginatedResult<AuditLog>>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Alerts
  getAlerts(): Promise<any[]>;

  // CSV Export
  getLicensesForExport(): Promise<any[]>;
  getClientsForExport(): Promise<any[]>;

  // System Settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(key: string, value: string): Promise<SystemSetting>;
}

export class DatabaseStorage implements IStorage {
  // Auth methods delegated to authStorage
  getUser(id: string) { return authStorage.getUser(id); }
  upsertUser(user: any) { return authStorage.upsertUser(user); }

  // Clients
  async getClients(page?: number, limit?: number, search?: string, status?: string): Promise<PaginatedResult<ClientResponse>> {
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const offset = (pageNum - 1) * pageSize;

    const conditions = [];
    if (search) {
      const term = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${clients.name}) LIKE ${term}`,
          sql`LOWER(${clients.email}) LIKE ${term}`
        )
      );
    }
    if (status && status !== "all") {
      conditions.push(eq(clients.status, status));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(clients).where(whereClause);
    const total = totalResult.count;

    const result = await db.select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      address: clients.address,
      status: clients.status,
      milvusId: clients.milvusId,
      document: clients.document,
      source: clients.source,
      lastSyncAt: clients.lastSyncAt,
      syncStatus: clients.syncStatus,
      milvusUpdatedAt: clients.milvusUpdatedAt,
      createdAt: clients.createdAt,
      activeLicenseCount: sql<number>`COALESCE((SELECT COUNT(*) FROM ${licenses} WHERE ${licenses.clientId} = ${clients.id} AND ${licenses.status} = 'active'), 0)`.mapWith(Number),
    }).from(clients).where(whereClause).orderBy(desc(clients.createdAt)).limit(pageSize).offset(offset);

    return { data: result as ClientResponse[], total };
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByMilvusId(milvusId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.milvusId, milvusId));
    return client;
  }

  async getClientByDocument(document: string): Promise<Client | undefined> {
    if (!document) return undefined;
    const [client] = await db.select().from(clients).where(eq(clients.document, document));
    return client;
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    if (!email) return undefined;
    const [client] = await db.select().from(clients).where(eq(clients.email, email));
    return client;
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    if (!name) return undefined;
    const [client] = await db.select().from(clients).where(eq(clients.name, name));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, updates: UpdateClientRequest): Promise<Client> {
    const [client] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    return client;
  }

  async deleteClient(id: number): Promise<void> {
    const clientCredentials = await db.select({ id: credentials.id }).from(credentials).where(eq(credentials.clientId, id));
    const credIds = clientCredentials.map((c) => c.id);

    if (credIds.length > 0) {
      for (const credId of credIds) {
        await db.delete(credentialCustomFields).where(eq(credentialCustomFields.credentialId, credId));
        await db.delete(credentialHistory).where(eq(credentialHistory.credentialId, credId));
        await db.update(auditLogs).set({ credentialId: null }).where(eq(auditLogs.credentialId, credId));
      }
      await db.delete(credentials).where(eq(credentials.clientId, id));
    }

    await db.delete(auditLogs).where(eq(auditLogs.clientId, id));
    await db.delete(clientDocuments).where(eq(clientDocuments.clientId, id));
    await db.update(licenses).set({ clientId: null }).where(eq(licenses.clientId, id));
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Licenses
  async getLicenses(clientId?: number, status?: string, page?: number, limit?: number): Promise<PaginatedResult<License>> {
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const offset = (pageNum - 1) * pageSize;

    let conditions = [];
    if (clientId) conditions.push(eq(licenses.clientId, clientId));
    if (status) conditions.push(eq(licenses.status, status));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(licenses).where(whereClause);
    const total = totalResult.count;

    const data = await db.select().from(licenses)
      .where(whereClause)
      .orderBy(desc(licenses.dataAtualizacao))
      .limit(pageSize)
      .offset(offset);

    return { data, total };
  }

  async getLicense(id: number): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    return license;
  }

  async createLicense(insertLicense: InsertLicense): Promise<License> {
    const values: any = { ...insertLicense };
    if (values.expirationDate && typeof values.expirationDate === 'string') {
      values.expirationDate = new Date(values.expirationDate);
    }
    if (values.renewalType === 'annual' && values.alertDaysBefore == null) {
      values.alertDaysBefore = 30;
    } else if (values.renewalType === 'monthly' && values.alertDaysBefore == null) {
      values.alertDaysBefore = 7;
    }
    const [license] = await db.insert(licenses).values(values).returning();
    return license;
  }

  async updateLicense(id: number, updates: UpdateLicenseRequest): Promise<License> {
    const values: any = { ...updates };
    if (values.expirationDate && typeof values.expirationDate === 'string') {
      values.expirationDate = new Date(values.expirationDate);
    }
    if (values.renewalType === 'none') {
      values.expirationDate = null;
      values.alertDaysBefore = null;
    } else if (values.renewalType === 'annual' && values.alertDaysBefore == null) {
      values.alertDaysBefore = 30;
    } else if (values.renewalType === 'monthly' && values.alertDaysBefore == null) {
      values.alertDaysBefore = 7;
    }
    const [license] = await db.update(licenses).set(values).where(eq(licenses.id, id)).returning();
    return license;
  }

  async getLicensesWithDetails(clientId?: number, status?: string, page?: number, limit?: number): Promise<PaginatedResult<any>> {
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const offset = (pageNum - 1) * pageSize;

    let conditions = [];
    if (clientId) conditions.push(eq(licenses.clientId, clientId));
    if (status) conditions.push(eq(licenses.status, status));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(licenses).where(whereClause);
    const total = totalResult.count;

    const licenseList = await db.select().from(licenses)
      .where(whereClause)
      .orderBy(desc(licenses.dataAtualizacao))
      .limit(pageSize)
      .offset(offset);

    const fornecedoresResult = await this.getFornecedores();
    const produtosResult = await this.getProdutos();
    const clientsResult = await this.getClients();

    const data = licenseList.map(license => ({
      ...license,
      fornecedor: fornecedoresResult.data.find((f: any) => f.id === license.fornecedorId),
      produto: produtosResult.data.find((p: any) => p.id === license.produtoId),
      client: clientsResult.data.find((c: any) => c.id === license.clientId),
    }));

    return { data, total };
  }

  async deleteLicense(id: number): Promise<void> {
    await db.delete(licenses).where(eq(licenses.id, id));
  }

  // Fornecedores
  async getFornecedores(page?: number, limit?: number): Promise<PaginatedResult<Fornecedor>> {
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const offset = (pageNum - 1) * pageSize;

    const [totalResult] = await db.select({ count: count() }).from(fornecedores);
    const total = totalResult.count;

    const data = await db.select().from(fornecedores).orderBy(desc(fornecedores.createdAt)).limit(pageSize).offset(offset);
    return { data, total };
  }

  async getFornecedor(id: number): Promise<Fornecedor | undefined> {
    const [fornecedor] = await db.select().from(fornecedores).where(eq(fornecedores.id, id));
    return fornecedor;
  }

  async createFornecedor(insertFornecedor: InsertFornecedor): Promise<Fornecedor> {
    const [fornecedor] = await db.insert(fornecedores).values(insertFornecedor).returning();
    return fornecedor;
  }

  async updateFornecedor(id: number, updates: Partial<InsertFornecedor>): Promise<Fornecedor> {
    const [fornecedor] = await db.update(fornecedores).set(updates).where(eq(fornecedores.id, id)).returning();
    return fornecedor;
  }

  async deleteFornecedor(id: number): Promise<void> {
    await db.delete(fornecedores).where(eq(fornecedores.id, id));
  }

  // Produtos
  async getProdutos(page?: number, limit?: number): Promise<PaginatedResult<Produto>> {
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const offset = (pageNum - 1) * pageSize;

    const [totalResult] = await db.select({ count: count() }).from(produtos);
    const total = totalResult.count;

    const data = await db.select().from(produtos).orderBy(desc(produtos.createdAt)).limit(pageSize).offset(offset);
    return { data, total };
  }

  async getProduto(id: number): Promise<Produto | undefined> {
    const [produto] = await db.select().from(produtos).where(eq(produtos.id, id));
    return produto;
  }

  async createProduto(insertProduto: InsertProduto): Promise<Produto> {
    const [produto] = await db.insert(produtos).values(insertProduto).returning();
    return produto;
  }

  async updateProduto(id: number, updates: Partial<InsertProduto>): Promise<Produto> {
    const [produto] = await db.update(produtos).set(updates).where(eq(produtos.id, id)).returning();
    return produto;
  }

  async deleteProduto(id: number): Promise<void> {
    await db.delete(produtos).where(eq(produtos.id, id));
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const [totalClients] = await db.select({ count: count() }).from(clients);
    const [totalLicenses] = await db.select({ count: count() }).from(licenses);
    const [activeLicenses] = await db.select({ count: count() }).from(licenses).where(eq(licenses.status, 'active'));
    const [expiringLicenses] = await db.select({ count: count() }).from(licenses).where(eq(licenses.status, 'expired'));
    const [perpetualLicenses] = await db.select({ count: count() }).from(licenses).where(eq(licenses.renewalType, 'none'));

    const [totalCredentials] = await db.select({ count: count() }).from(credentials).where(sql`${credentials.status} != 'deleted'`);
    const [activeCredentials] = await db.select({ count: count() }).from(credentials).where(eq(credentials.status, 'active'));
    const [inactiveCredentials] = await db.select({ count: count() }).from(credentials).where(eq(credentials.status, 'inactive'));
    const [recentAuditEvents] = await db.select({ count: count() }).from(auditLogs).where(gte(auditLogs.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    return {
      totalClients: totalClients?.count || 0,
      totalLicenses: totalLicenses?.count || 0,
      activeLicenses: activeLicenses?.count || 0,
      expiringLicenses: expiringLicenses?.count || 0,
      perpetualLicenses: perpetualLicenses?.count || 0,
      totalCredentials: totalCredentials?.count || 0,
      activeCredentials: activeCredentials?.count || 0,
      inactiveCredentials: inactiveCredentials?.count || 0,
      recentAuditEvents: recentAuditEvents?.count || 0,
    };
  }

  // Client Documents
  async getClientDocuments(clientId: number): Promise<ClientDocument[]> {
    return await db.select().from(clientDocuments).where(eq(clientDocuments.clientId, clientId)).orderBy(clientDocuments.createdAt);
  }

  async getClientDocumentById(id: number): Promise<ClientDocument | undefined> {
    const [document] = await db.select().from(clientDocuments).where(eq(clientDocuments.id, id));
    return document;
  }

  async createClientDocument(insertDocument: InsertClientDocument): Promise<ClientDocument> {
    const [document] = await db.insert(clientDocuments).values(insertDocument).returning();
    return document;
  }

  async deleteClientDocument(id: number): Promise<void> {
    await db.delete(clientDocuments).where(eq(clientDocuments.id, id));
  }

  // Credential Documents
  async getCredentialDocuments(credentialId: number): Promise<CredentialDocument[]> {
    return await db.select().from(credentialDocuments).where(eq(credentialDocuments.credentialId, credentialId)).orderBy(credentialDocuments.createdAt);
  }

  async getCredentialDocumentById(id: number): Promise<CredentialDocument | undefined> {
    const [document] = await db.select().from(credentialDocuments).where(eq(credentialDocuments.id, id));
    return document;
  }

  async createCredentialDocument(insertDocument: InsertCredentialDocument): Promise<CredentialDocument> {
    const [document] = await db.insert(credentialDocuments).values(insertDocument).returning();
    return document;
  }

  async deleteCredentialDocument(id: number): Promise<void> {
    await db.delete(credentialDocuments).where(eq(credentialDocuments.id, id));
  }

  // --- Vault - Credential Categories ---
  async getCredentialCategories(): Promise<CredentialCategory[]> {
    return await db.select().from(credentialCategories).orderBy(credentialCategories.name);
  }

  async getCredentialCategory(id: number): Promise<CredentialCategory | undefined> {
    const [category] = await db.select().from(credentialCategories).where(eq(credentialCategories.id, id));
    return category;
  }

  async createCredentialCategory(category: InsertCredentialCategory): Promise<CredentialCategory> {
    const [newCategory] = await db.insert(credentialCategories).values(category).returning();
    return newCategory;
  }

  // --- Vault - Credentials ---
  async getCredentials(filters?: { clientId?: number; categoryId?: number; status?: string; search?: string; deleted?: boolean }, page?: number, limit?: number): Promise<PaginatedResult<Credential>> {
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const offset = (pageNum - 1) * pageSize;

    let conditions = [];
    if (filters?.clientId) conditions.push(eq(credentials.clientId, filters.clientId));
    if (filters?.categoryId) conditions.push(eq(credentials.categoryId, filters.categoryId));
    if (filters?.status) conditions.push(eq(credentials.status, filters.status));
    if (filters?.deleted) {
      conditions.push(eq(credentials.status, "deleted"));
    } else {
      conditions.push(sql`${credentials.status} != 'deleted'`);
    }
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        sql`(${credentials.title} LIKE ${searchTerm} OR ${credentials.username} LIKE ${searchTerm} OR ${credentials.url} LIKE ${searchTerm} OR ${credentials.tags} LIKE ${searchTerm})`
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(credentials).where(whereClause);
    const total = totalResult.count;

    const data = await db.select().from(credentials)
      .where(whereClause)
      .orderBy(desc(credentials.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return { data, total };
  }

  async getCredentialById(id: number): Promise<Credential | undefined> {
    const [credential] = await db.select().from(credentials).where(eq(credentials.id, id));
    return credential;
  }

  async createCredential(data: InsertCredential & { customFields?: any[] }): Promise<Credential> {
    const { customFields, password, notes, ...credentialData } = data as any;

    const [credential] = await db.insert(credentials).values({
      ...credentialData,
      encryptedPassword: password ? encrypt(password) : null,
      encryptedNotes: notes ? encrypt(notes) : null,
      updatedAt: new Date(),
    }).returning();

    if (customFields && customFields.length > 0) {
      for (const field of customFields) {
        await db.insert(credentialCustomFields).values({
          credentialId: credential.id,
          name: field.name,
          value: field.isEncrypted && field.value ? encrypt(field.value) : field.value,
          isEncrypted: field.isEncrypted || false,
          order: field.order || 0,
        });
      }
    }

    return credential;
  }

  async updateCredential(id: number, data: Partial<InsertCredential> & { customFields?: any[] }, userId: number): Promise<Credential> {
    const { customFields, password, notes, ...credentialData } = data as any;

    const existing = await this.getCredentialById(id);
    if (!existing) throw new Error("Credential not found");

    const updates: any = { ...credentialData, updatedAt: new Date() };
    if (password !== undefined) updates.encryptedPassword = password ? encrypt(password) : null;
    if (notes !== undefined) updates.encryptedNotes = notes ? encrypt(notes) : null;

    const [credential] = await db.update(credentials).set(updates).where(eq(credentials.id, id)).returning();

    // Track history
    const changes: any = {};
    if (credentialData.title && credentialData.title !== existing.title) changes.title = { old: existing.title, new: credentialData.title };
    if (credentialData.username && credentialData.username !== existing.username) changes.username = { old: existing.username, new: credentialData.username };
    if (credentialData.url && credentialData.url !== existing.url) changes.url = { old: existing.url, new: credentialData.url };
    if (password !== undefined) changes.password = { old: "***", new: "***" };
    if (credentialData.categoryId && credentialData.categoryId !== existing.categoryId) changes.categoryId = { old: existing.categoryId, new: credentialData.categoryId };

    if (Object.keys(changes).length > 0) {
      await db.insert(credentialHistory).values({
        credentialId: id,
        userId,
        action: "updated",
        changes: JSON.stringify(changes),
      });
    }

    // Update custom fields if provided
    if (customFields) {
      await db.delete(credentialCustomFields).where(eq(credentialCustomFields.credentialId, id));
      for (const field of customFields) {
        await db.insert(credentialCustomFields).values({
          credentialId: id,
          name: field.name,
          value: field.isEncrypted && field.value ? encrypt(field.value) : field.value,
          isEncrypted: field.isEncrypted || false,
          order: field.order || 0,
        });
      }
    }

    return credential;
  }

  async softDeleteCredential(id: number, userId: number, reason?: string): Promise<void> {
    await db.update(credentials).set({
      status: "deleted",
      deletedAt: new Date(),
      deletedBy: userId,
      deleteReason: reason || null,
      updatedAt: new Date(),
    }).where(eq(credentials.id, id));

    await db.insert(credentialHistory).values({
      credentialId: id,
      userId,
      action: "deleted",
      changes: JSON.stringify({ reason: reason || "Sem motivo informado" }),
    });
  }

  async restoreCredential(id: number, userId: number): Promise<void> {
    await db.update(credentials).set({
      status: "active",
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
      updatedAt: new Date(),
    }).where(eq(credentials.id, id));

    await db.insert(credentialHistory).values({
      credentialId: id,
      userId,
      action: "restored",
      changes: JSON.stringify({ restored: true }),
    });
  }

  async permanentDeleteCredential(id: number): Promise<void> {
    await db.delete(credentialCustomFields).where(eq(credentialCustomFields.credentialId, id));
    await db.delete(credentialHistory).where(eq(credentialHistory.credentialId, id));
    await db.delete(auditLogs).where(eq(auditLogs.credentialId, id));
    await db.delete(credentials).where(eq(credentials.id, id));
  }

  async revealCredentialPassword(id: number): Promise<string | null> {
    const [credential] = await db.select({ encryptedPassword: credentials.encryptedPassword }).from(credentials).where(eq(credentials.id, id));
    return credential ? decrypt(credential.encryptedPassword) : null;
  }

  // --- Vault - Custom Fields ---
  async getCredentialCustomFields(credentialId: number): Promise<CredentialCustomField[]> {
    return await db.select().from(credentialCustomFields)
      .where(eq(credentialCustomFields.credentialId, credentialId))
      .orderBy(credentialCustomFields.order);
  }

  // --- Vault - History ---
  async getCredentialHistory(credentialId: number): Promise<CredentialHistory[]> {
    return await db.select().from(credentialHistory)
      .where(eq(credentialHistory.credentialId, credentialId))
      .orderBy(desc(credentialHistory.createdAt));
  }

  // --- Audit Logs ---
  async getAuditLogs(filters?: { userId?: number; clientId?: number; credentialId?: number; entity?: string; entityId?: number; action?: string; limit?: number }, page?: number, limit?: number): Promise<PaginatedResult<AuditLog>> {
    const pageNum = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const offset = (pageNum - 1) * pageSize;

    let conditions = [];
    if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters?.clientId) conditions.push(eq(auditLogs.clientId, filters.clientId));
    if (filters?.credentialId) conditions.push(eq(auditLogs.credentialId, filters.credentialId));
    if (filters?.entity) conditions.push(eq(auditLogs.entity, filters.entity));
    if (filters?.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId));
    if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(auditLogs).where(whereClause);
    const total = totalResult.count;

    const query = db.select().from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset);

    const data = await query;
    return { data, total };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  // Alerts
  async getAlerts(): Promise<any[]> {
    const now = new Date();
    const allLicenses = await db.select().from(licenses).where(and(
      sql`${licenses.renewalType} != 'none'`,
      sql`${licenses.expirationDate} IS NOT NULL`
    ));

    const alerts = [];
    for (const license of allLicenses) {
      if (!license.expirationDate || !license.alertDaysBefore) continue;
      const exp = new Date(license.expirationDate);
      const diffMs = exp.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining <= license.alertDaysBefore) {
        const severity = daysRemaining <= 7 ? "critical" : "warning";
        const client = await this.getClient(license.clientId || 0);
        alerts.push({
          licenseId: license.id,
          licenseKey: license.key,
          clientName: client?.name || "Cliente não vinculado",
          expirationDate: license.expirationDate,
          daysRemaining,
          renewalType: license.renewalType,
          severity,
        });
      }
    }
    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // CSV Export
  async getLicensesForExport(): Promise<any[]> {
    const licenseList = await db.select().from(licenses).orderBy(licenses.createdAt);
    const fornecedoresList = await db.select().from(fornecedores);
    const produtosList = await db.select().from(produtos);
    const clientsList = await db.select().from(clients);
    return licenseList.map(l => ({
      id: l.id,
      key: l.key,
      client: clientsList.find(c => c.id === l.clientId)?.name || "",
      product: produtosList.find(p => p.id === l.produtoId)?.nome || "",
      supplier: fornecedoresList.find(f => f.id === l.fornecedorId)?.nome || "",
      contractType: l.contractType,
      renewalType: l.renewalType,
      serviceCategory: l.serviceCategory,
      status: l.status,
      expirationDate: l.expirationDate,
      notes: l.notes,
      createdAt: l.createdAt,
    }));
  }

  async getClientsForExport(): Promise<any[]> {
    const clientList = await db.select().from(clients).orderBy(clients.createdAt);
    return Promise.all(clientList.map(async c => {
      const licenseCount = await db.select({ count: count() }).from(licenses).where(eq(licenses.clientId, c.id));
      const credCount = await db.select({ count: count() }).from(credentials).where(and(eq(credentials.clientId, c.id), sql`${credentials.status} != 'deleted'`));
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        document: c.document,
        status: c.status,
        licenseCount: licenseCount[0]?.count || 0,
        credentialCount: credCount[0]?.count || 0,
        createdAt: c.createdAt,
      };
    }));
  }

  // System Settings
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting;
  }

  async setSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const existing = await this.getSystemSetting(key);
    if (existing) {
      const [updated] = await db.update(systemSettings).set({ value, updatedAt: new Date() }).where(eq(systemSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(systemSettings).values({ key, value }).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
