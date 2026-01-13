import { pgTable, text, serial, timestamp, boolean, integer, date, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export auth models first
export * from "./models/auth";

// --- Clients ---
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  status: text("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// --- Licenses ---
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  type: text("type").notNull(), // subscription, perpetual
  status: text("status").default("active"), // active, expired, suspended
  purchaseDate: timestamp("purchase_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  clientId: integer("client_id").references(() => clients.id),
  cost: doublePrecision("cost"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({ id: true, createdAt: true });
export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;

// --- Hardware ---
export const hardware = pgTable("hardware", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serialNumber: text("serial_number").notNull(),
  type: text("type").notNull(), // laptop, desktop, mobile, server
  status: text("status").default("active"), // active, maintenance, retired
  purchaseDate: timestamp("purchase_date").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  specs: text("specs"),
  cost: doublePrecision("cost"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHardwareSchema = createInsertSchema(hardware).omit({ id: true, createdAt: true });
export type Hardware = typeof hardware.$inferSelect;
export type InsertHardware = z.infer<typeof insertHardwareSchema>;

// --- Relations ---
export const clientsRelations = relations(clients, ({ many }) => ({
  licenses: many(licenses),
  hardware: many(hardware),
}));

export const licensesRelations = relations(licenses, ({ one }) => ({
  client: one(clients, {
    fields: [licenses.clientId],
    references: [clients.id],
  }),
}));

export const hardwareRelations = relations(hardware, ({ one }) => ({
  client: one(clients, {
    fields: [hardware.clientId],
    references: [clients.id],
  }),
}));

// --- API Types ---
export type CreateClientRequest = InsertClient;
export type UpdateClientRequest = Partial<InsertClient>;
export type ClientResponse = Client & { licenseCount?: number; hardwareCount?: number };

export type CreateLicenseRequest = InsertLicense;
export type UpdateLicenseRequest = Partial<InsertLicense>;
export type LicenseResponse = License & { clientName?: string };

export type CreateHardwareRequest = InsertHardware;
export type UpdateHardwareRequest = Partial<InsertHardware>;
export type HardwareResponse = Hardware & { clientName?: string };

export interface DashboardStats {
  totalClients: number;
  totalLicenses: number;
  activeLicenses: number;
  expiringLicenses: number;
  totalHardware: number;
  hardwareValue: number;
}
