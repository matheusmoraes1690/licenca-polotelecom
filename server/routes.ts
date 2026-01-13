import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // --- Clients ---
  app.get(api.clients.list.path, isAuthenticated, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.get(api.clients.get.path, isAuthenticated, async (req, res) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  });

  app.post(api.clients.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.clients.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.clients.update.input.parse(req.body);
      const client = await storage.updateClient(Number(req.params.id), input);
      if (!client) return res.status(404).json({ message: 'Client not found' });
      res.json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.clients.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteClient(Number(req.params.id));
    res.status(204).send();
  });

  // --- Licenses ---
  app.get(api.licenses.list.path, isAuthenticated, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const status = req.query.status as string | undefined;
    const licenses = await storage.getLicenses(clientId, status);
    res.json(licenses);
  });

  app.get(api.licenses.get.path, isAuthenticated, async (req, res) => {
    const license = await storage.getLicense(Number(req.params.id));
    if (!license) return res.status(404).json({ message: 'License not found' });
    res.json(license);
  });

  app.post(api.licenses.create.path, isAuthenticated, async (req, res) => {
    try {
      // Coerce dates if needed, or rely on frontend sending ISO strings compatible with Zod date/string
      // Zod schema expects Date object for timestamp, but JSON comes as string.
      // Drizzle-zod createInsertSchema usually handles this if configured, but let's ensure.
      // Usually req.body date strings are parsed by driver or we need to coerce.
      // For simplicity, we assume frontend sends compatible format or we let Zod validation run.
      const input = api.licenses.create.input.parse(req.body); 
      const license = await storage.createLicense(input);
      res.status(201).json(license);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.licenses.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.licenses.update.input.parse(req.body);
      const license = await storage.updateLicense(Number(req.params.id), input);
      if (!license) return res.status(404).json({ message: 'License not found' });
      res.json(license);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.licenses.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteLicense(Number(req.params.id));
    res.status(204).send();
  });

  // --- Hardware ---
  app.get(api.hardware.list.path, isAuthenticated, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const status = req.query.status as string | undefined;
    const hardware = await storage.getHardware(clientId, status);
    res.json(hardware);
  });

  app.get(api.hardware.get.path, isAuthenticated, async (req, res) => {
    const item = await storage.getHardwareById(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'Hardware not found' });
    res.json(item);
  });

  app.post(api.hardware.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.hardware.create.input.parse(req.body);
      const item = await storage.createHardware(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.hardware.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.hardware.update.input.parse(req.body);
      const item = await storage.updateHardware(Number(req.params.id), input);
      if (!item) return res.status(404).json({ message: 'Hardware not found' });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.hardware.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteHardware(Number(req.params.id));
    res.status(204).send();
  });

  // --- Dashboard ---
  app.get(api.dashboard.stats.path, isAuthenticated, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // --- Seed Data ---
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const clients = await storage.getClients();
  if (clients.length === 0) {
    const client = await storage.createClient({
      name: "Acme Corp",
      email: "contact@acme.com",
      phone: "555-0123",
      address: "123 Innovation Dr, Tech City",
      status: "active"
    });

    await storage.createLicense({
      name: "Adobe Creative Cloud",
      key: "XXXX-YYYY-ZZZZ-0000",
      type: "subscription",
      status: "active",
      purchaseDate: new Date("2024-01-15"),
      expirationDate: new Date("2025-01-15"),
      clientId: client.id,
      cost: 599.99,
      notes: "Annual subscription for design team"
    });

    await storage.createLicense({
      name: "Microsoft 365 Business",
      key: "MSFT-365-KEY-1234",
      type: "subscription",
      status: "active",
      purchaseDate: new Date("2024-02-01"),
      expirationDate: new Date("2024-02-28"), // Expiring soon!
      clientId: client.id,
      cost: 12.50,
      notes: "Monthly seat"
    });

    await storage.createHardware({
      name: "MacBook Pro 16",
      serialNumber: "C02XYZ123ABC",
      type: "laptop",
      status: "active",
      purchaseDate: new Date("2023-11-20"),
      clientId: client.id,
      cost: 2499.00,
      specs: "M3 Max, 32GB RAM, 1TB SSD"
    });
  }
}
