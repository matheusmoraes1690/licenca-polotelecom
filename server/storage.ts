import { db } from "./db";
import {
  clients, licenses, hardware,
  type Client, type InsertClient, type UpdateClientRequest,
  type License, type InsertLicense, type UpdateLicenseRequest,
  type Hardware, type InsertHardware, type UpdateHardwareRequest,
  type DashboardStats
} from "@shared/schema";
import { eq, count, sql, and, lt } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage"; // Import auth storage

export interface IStorage extends IAuthStorage { // Extend IAuthStorage
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: UpdateClientRequest): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Licenses
  getLicenses(clientId?: number, status?: string): Promise<License[]>;
  getLicense(id: number): Promise<License | undefined>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: number, updates: UpdateLicenseRequest): Promise<License>;
  deleteLicense(id: number): Promise<void>;

  // Hardware
  getHardware(clientId?: number, status?: string): Promise<Hardware[]>;
  getHardware(id: number): Promise<Hardware | undefined>; // Overload fix
  getHardwareById(id: number): Promise<Hardware | undefined>; // Explicit method
  createHardware(hardware: InsertHardware): Promise<Hardware>;
  updateHardware(id: number, updates: UpdateHardwareRequest): Promise<Hardware>;
  deleteHardware(id: number): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  // Auth methods delegated to authStorage
  getUser(id: string) { return authStorage.getUser(id); }
  upsertUser(user: any) { return authStorage.upsertUser(user); }

  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(clients.createdAt);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
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
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Licenses
  async getLicenses(clientId?: number, status?: string): Promise<License[]> {
    let conditions = [];
    if (clientId) conditions.push(eq(licenses.clientId, clientId));
    if (status) conditions.push(eq(licenses.status, status));

    return await db.select().from(licenses)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(licenses.expirationDate);
  }

  async getLicense(id: number): Promise<License | undefined> {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    return license;
  }

  async createLicense(insertLicense: InsertLicense): Promise<License> {
    const [license] = await db.insert(licenses).values(insertLicense).returning();
    return license;
  }

  async updateLicense(id: number, updates: UpdateLicenseRequest): Promise<License> {
    const [license] = await db.update(licenses).set(updates).where(eq(licenses.id, id)).returning();
    return license;
  }

  async deleteLicense(id: number): Promise<void> {
    await db.delete(licenses).where(eq(licenses.id, id));
  }

  // Hardware
  async getHardware(clientId?: number, status?: string): Promise<Hardware[]> { // Implementation for list
     // This method signature in interface is a bit tricky with overloads in TS interfaces vs classes,
     // but let's implement the list logic here.
     // In JS/TS implementation, the first argument being number vs undefined determines the call,
     // but typically we separate getHardware (list) and getHardwareById (single) to avoid confusion.
     // I'll assume this is the list method for now based on arguments.
     if (typeof clientId === 'number' && arguments.length === 1 && status === undefined) {
         // This *could* be getById if I wasn't careful, but let's use getHardwareById for single item.
         // Let's stick to the interface definition: getHardware(clientId?: number, status?: string)
         // If clientId is provided as ID for fetching single, we have a conflict.
         // Better to rename single fetch to getHardwareById in interface.
         // I updated interface above to include getHardwareById.
     }

    let conditions = [];
    if (clientId) conditions.push(eq(hardware.clientId, clientId));
    if (status) conditions.push(eq(hardware.status, status));

    return await db.select().from(hardware)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(hardware.purchaseDate);
  }

  async getHardwareById(id: number): Promise<Hardware | undefined> {
    const [item] = await db.select().from(hardware).where(eq(hardware.id, id));
    return item;
  }

  async createHardware(insertHardware: InsertHardware): Promise<Hardware> {
    const [item] = await db.insert(hardware).values(insertHardware).returning();
    return item;
  }

  async updateHardware(id: number, updates: UpdateHardwareRequest): Promise<Hardware> {
    const [item] = await db.update(hardware).set(updates).where(eq(hardware.id, id)).returning();
    return item;
  }

  async deleteHardware(id: number): Promise<void> {
    await db.delete(hardware).where(eq(hardware.id, id));
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const [totalClients] = await db.select({ count: count() }).from(clients);
    const [totalLicenses] = await db.select({ count: count() }).from(licenses);
    const [activeLicenses] = await db.select({ count: count() }).from(licenses).where(eq(licenses.status, 'active'));
    
    // Expiring in next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const [expiringLicenses] = await db.select({ count: count() }).from(licenses)
      .where(and(
        eq(licenses.status, 'active'),
        lt(licenses.expirationDate, thirtyDaysFromNow)
      ));

    const [totalHardware] = await db.select({ count: count() }).from(hardware);
    const [hardwareValue] = await db.select({ value: sql<number>`sum(${hardware.cost})` }).from(hardware);

    return {
      totalClients: totalClients?.count || 0,
      totalLicenses: totalLicenses?.count || 0,
      activeLicenses: activeLicenses?.count || 0,
      expiringLicenses: expiringLicenses?.count || 0,
      totalHardware: totalHardware?.count || 0,
      hardwareValue: hardwareValue?.value || 0,
    };
  }
}

export const storage = new DatabaseStorage();
