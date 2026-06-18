import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertCredentialDocumentSchema, createUserSchema, updateUserSchema, createProfileSchema, updateProfileSchema, insertCredentialSchema, insertCredentialCategorySchema } from "@shared/schema";
import { z } from "zod";
import {
  login,
  seedAuth,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword,
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  hasPermission,
  invalidateUserSessions,
} from "./auth-service";
import { encrypt, decrypt } from "./encryption";
import { milvusService } from "./services/milvus-service";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; username: string; name: string; profileId: number | null; role: string };
      sessionId?: string;
    }
  }
}

const isAuthenticated = (req: Request, res: Response, next: any) => {
  const sess = req.session as any;
  if (sess && sess.userId) {
    req.user = { userId: sess.userId, username: sess.username, name: sess.name, profileId: sess.profileId ?? null, role: sess.role || "viewer" };
    req.sessionId = sess.id;
    next();
  } else {
    res.status(401).json({ message: "Não autorizado" });
  }
};

const requireRole = (...roles: string[]) => (req: Request, res: Response, next: any) => {
  if (req.user && roles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: "Acesso negado" });
  }
};

const isAdmin = requireRole("admin");

const requirePermission = (module: string, actions: string[]) => async (req: Request, res: Response, next: any) => {
  if (!req.user) return res.status(401).json({ message: "Não autorizado" });
  const allowed = await hasPermission(req.user, module, actions);
  if (allowed) {
    next();
  } else {
    console.warn(`[PERMISSION BLOCKED] ${req.method} ${req.path} user=${req.user.username} role=${req.user.role} profileId=${req.user.profileId} module=${module} actions=${JSON.stringify(actions)}`);
    res.status(403).json({ message: "Acesso negado" });
  }
};

function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const ALLOWED_FILE_TYPES = ["pdf", "doc", "docx", "xls", "xlsx", "zip", "txt", "png", "jpg", "jpeg"];

function sanitizeFileType(fileType: string | null | undefined): string {
  if (!fileType) return "bin";
  const ft = fileType.toLowerCase().trim();
  return ALLOWED_FILE_TYPES.includes(ft) ? ft : "bin";
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\- ]/g, "_").replace(/\s+/g, " ").trim();
}

function validateCsrf(req: Request, res: Response, next: any) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const tokenFromCookie = req.cookies?.csrfToken;
  const tokenFromHeader = req.headers["x-csrf-token"] as string | undefined;
  if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
    console.warn(`[CSRF BLOCKED] ${req.method} ${req.path} cookie=${!!tokenFromCookie} header=${!!tokenFromHeader}`);
    return res.status(403).json({ message: "CSRF token inválido" });
  }
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedAuth();

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await login(username, password, req.ip, req.headers["user-agent"] as string);
      if (result.success && result.user) {
        const sess = req.session as any;
        sess.userId = result.user.id;
        sess.username = result.user.username;
        sess.name = result.user.name;
        sess.profileId = result.user.profileId;
        sess.role = result.user.role;
        const csrfToken = generateCsrfToken();
        res.cookie("csrfToken", csrfToken, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ id: result.user.id, username: result.user.username, name: result.user.name, profileId: result.user.profileId, role: result.user.role, csrfToken });
      } else {
        return res.status(401).json({ message: result.error || "Credenciais inválidas" });
      }
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Erro no servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy(() => {});
    res.clearCookie("sessionId");
    res.json({ message: "Logout realizado com sucesso" });
  });

  app.get("/api/auth/user", (req, res) => {
    const sess = req.session as any;
    if (sess && sess.userId) {
      if (!req.cookies?.csrfToken) {
        const csrfToken = generateCsrfToken();
        res.cookie("csrfToken", csrfToken, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 });
      }
      res.json({ id: sess.userId, username: sess.username, name: sess.name, profileId: sess.profileId, role: sess.role || "viewer" });
    } else {
      res.status(401).json({ message: "Não autorizado" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Campos obrigatórios ausentes" });
      if (newPassword.length < 6) return res.status(400).json({ message: "Nova senha deve ter ao menos 6 caracteres" });
      const result = await changePassword(req.user!.userId, currentPassword, newPassword);
      if (!result.success) return res.status(400).json({ message: result.error });
      res.json({ message: "Senha alterada com sucesso" });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/auth/csrf", (req, res) => {
    const csrfToken = generateCsrfToken();
    res.cookie("csrfToken", csrfToken, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 });
    res.json({ csrfToken });
  });

  // CSRF protection for all state-changing API routes
  app.use("/api", validateCsrf);

  // Users & Profiles
  app.get("/api/users", isAuthenticated, async (req, res) => {
    const users = await getAllUsers();
    res.json(users.map(u => ({ ...u, passwordHash: undefined })));
  });

  app.post("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const input = createUserSchema.parse(req.body);
      const user = await createUser(input);
      res.status(201).json({ ...user, passwordHash: undefined });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: (err as any).message });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (req.user?.userId !== id && req.user?.role !== "admin") return res.status(403).json({ message: "Acesso negado" });
      const input = updateUserSchema.parse(req.body);
      const user = await updateUser(id, input);
      res.json({ ...user, passwordHash: undefined });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: (err as any).message });
    }
  });

  app.get("/api/profiles", isAuthenticated, async (req, res) => { res.json(await getAllProfiles()); });

  app.post("/api/profiles", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const input = createProfileSchema.parse(req.body);
      const profile = await createProfile(input);
      res.status(201).json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: (err as any).message });
    }
  });

  app.put("/api/profiles/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const input = updateProfileSchema.parse(req.body);
      res.json(await updateProfile(Number(req.params.id), input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: (err as any).message });
    }
  });

  app.delete("/api/profiles/:id", isAuthenticated, isAdmin, async (req, res) => {
    const profileId = Number(req.params.id);
    // Invalidar sessões dos usuários vinculados a este perfil
    const usersWithProfile = await getAllUsers();
    for (const user of usersWithProfile) {
      if (user.profileId === profileId) {
        await invalidateUserSessions(user.id);
      }
    }
    await deleteProfile(profileId); res.status(204).send();
  });

  // Credential Categories
  app.get("/api/credential-categories", isAuthenticated, async (req, res) => { res.json(await storage.getCredentialCategories()); });

  app.post("/api/credential-categories", isAuthenticated, requirePermission("credentials", ["create"]), async (req, res) => {
    try {
      const input = insertCredentialCategorySchema.parse(req.body);
      res.status(201).json(await storage.createCredentialCategory(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: (err as any).message });
    }
  });

  // Credentials
  app.get("/api/credentials", isAuthenticated, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const credentials = await storage.getCredentials({
      clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      deleted: req.query.deleted === "true",
    }, page, limit);
    res.json(credentials);
  });

  app.get("/api/credentials/:id", isAuthenticated, async (req, res) => {
    const credential = await storage.getCredentialById(Number(req.params.id));
    if (!credential) return res.status(404).json({ message: "Credencial não encontrada" });
    res.json(credential);
  });

  app.post("/api/credentials", isAuthenticated, requirePermission("credentials", ["create"]), async (req, res) => {
    try {
      const input = insertCredentialSchema.parse(req.body);
      const credential = await storage.createCredential(input);
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, clientId: credential.clientId, credentialId: credential.id, action: "create", resource: "credential", ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null, details: JSON.stringify({ title: credential.title }) });
      res.status(201).json(credential);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: (err as any).message });
    }
  });

  app.put("/api/credentials/:id", isAuthenticated, requirePermission("credentials", ["edit"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = insertCredentialSchema.partial().parse(req.body);
      const previous = await storage.getCredentialById(id);
      const credential = await storage.updateCredential(id, input, req.user!.userId);
      const snapshot = previous ? JSON.stringify(previous) : null;
      const changedFields = previous ? Object.entries(input as any).filter(([k, v]) => (previous as any)[k] !== v).map(([k]) => k) : [];
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, clientId: credential.clientId, credentialId: credential.id, action: "update", resource: "credential", entity: "credential", entityId: credential.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null, snapshot, details: JSON.stringify({ title: credential.title, changedFields }) });
      res.json(credential);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(400).json({ message: (err as any).message });
    }
  });

  app.delete("/api/credentials/:id", isAuthenticated, requirePermission("credentials", ["delete"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const reason = req.query.reason as string | undefined;
      await storage.softDeleteCredential(id, req.user!.userId, reason);
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, credentialId: id, action: "delete", resource: "credential", ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null, details: JSON.stringify({ reason: reason || "Sem motivo informado" }) });
      res.status(204).send();
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.post("/api/credentials/:id/restore", isAuthenticated, requirePermission("credentials", ["edit"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.restoreCredential(id, req.user!.userId);
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, credentialId: id, action: "restore", resource: "credential", ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null });
      res.json({ message: "Restaurado com sucesso" });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.delete("/api/credentials/:id/permanent", isAuthenticated, requirePermission("credentials", ["delete"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.permanentDeleteCredential(id);
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, credentialId: null, action: "permanent_delete", resource: "credential", details: JSON.stringify({ credentialId: id }), ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null });
      res.status(204).send();
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.post("/api/credentials/:id/reveal", isAuthenticated, requirePermission("credentials", ["reveal"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const password = await storage.revealCredentialPassword(id);
      if (password === null) return res.status(404).json({ message: "Senha não encontrada" });
      res.json({ password });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  app.post("/api/credentials/:id/copy-password", isAuthenticated, requirePermission("credentials", ["copy", "reveal"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const password = await storage.revealCredentialPassword(id);
      if (password === null) return res.status(404).json({ message: "Senha não encontrada" });
      res.json({ password });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // Custom Fields & History
  app.get("/api/credentials/:id/custom-fields", isAuthenticated, async (req, res) => { res.json(await storage.getCredentialCustomFields(Number(req.params.id))); });
  app.get("/api/credentials/:id/history", isAuthenticated, async (req, res) => { res.json(await storage.getCredentialHistory(Number(req.params.id))); });

  // Audit Logs
  app.get("/api/audit-logs", isAuthenticated, requirePermission("audit", ["view"]), async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(await storage.getAuditLogs({
      entity: req.query.entity as string | undefined,
      entityId: req.query.entityId ? Number(req.query.entityId) : undefined,
    }, page, limit));
  });

  // Alerts
  app.get("/api/alerts", isAuthenticated, async (req, res) => {
    res.json(await storage.getAlerts());
  });

  // CSV Export
  app.get("/api/export/licenses.csv", isAuthenticated, requirePermission("export", ["execute"]), async (req, res) => {
    const data = await storage.getLicensesForExport();
    const headers = ["ID", "Chave", "Cliente", "Produto", "Fornecedor", "Tipo Contrato", "Renovação", "Categoria Serviço", "Status", "Data Expiração", "Notas", "Criado Em"];
    const rows = data.map(l => [
      l.id, l.key, l.client, l.product, l.supplier, l.contractType, l.renewalType, l.serviceCategory || "", l.status, l.expirationDate ? new Date(l.expirationDate).toISOString() : "", l.notes || "", l.createdAt ? new Date(l.createdAt).toISOString() : ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=licenses.csv");
    res.send(csv);
  });

  app.get("/api/export/clients.csv", isAuthenticated, requirePermission("export", ["execute"]), async (req, res) => {
    const data = await storage.getClientsForExport();
    const headers = ["ID", "Nome", "Email", "Telefone", "Endereço", "Documento", "Status", "Licenças", "Credenciais", "Criado Em"];
    const rows = data.map(c => [
      c.id, c.name, c.email || "", c.phone || "", c.address || "", c.document || "", c.status, c.licenseCount, c.credentialCount, c.createdAt ? new Date(c.createdAt).toISOString() : ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=clients.csv");
    res.send(csv);
  });

  // Clients
  app.get(api.clients.list.path, isAuthenticated, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    res.json(await storage.getClients(page, limit, search, status));
  });
  app.get(api.clients.get.path, isAuthenticated, async (req, res) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });
  app.post(api.clients.create.path, isAuthenticated, requirePermission("clients", ["create"]), async (req, res) => {
    try {
      const { licenseIds, ...clientData } = req.body;
      const input = api.clients.create.input.parse(clientData);
      const client = await storage.createClient(input);
      if (licenseIds && Array.isArray(licenseIds)) for (const lid of licenseIds) await storage.updateLicense(lid, { clientId: client.id });
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, clientId: client.id, action: "create", resource: "client", entity: "client", entityId: client.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null });
      res.status(201).json(client);
    } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.put(api.clients.update.path, isAuthenticated, requirePermission("clients", ["edit"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.clients.update.input.parse(req.body);
      const previous = await storage.getClient(id);
      const client = await storage.updateClient(id, input);
      if (!client) return res.status(404).json({ message: "Client not found" });
      const snapshot = previous ? JSON.stringify(previous) : null;
      const changedFields = previous ? Object.entries(input as any).filter(([k, v]) => (previous as any)[k] !== v).map(([k]) => k) : [];
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, clientId: client.id, action: "update", resource: "client", entity: "client", entityId: client.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null, snapshot, details: JSON.stringify({ name: client.name, changedFields }) });
      res.json(client);
    } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.delete(api.clients.delete.path, isAuthenticated, requirePermission("clients", ["delete"]), async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteClient(id);
    await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, clientId: id, action: "delete", resource: "client", entity: "client", entityId: id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null });
    res.status(204).send();
  });

  // Licenses
  app.get(api.licenses.list.path, isAuthenticated, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(await storage.getLicenses(req.query.clientId ? Number(req.query.clientId) : undefined, req.query.status as string | undefined, page, limit));
  });
  app.get("/api/licenses/with-details", isAuthenticated, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(await storage.getLicensesWithDetails(req.query.clientId ? Number(req.query.clientId) : undefined, req.query.status as string | undefined, page, limit));
  });
  app.get(api.licenses.get.path, isAuthenticated, async (req, res) => { const license = await storage.getLicense(Number(req.params.id)); if (!license) return res.status(404).json({ message: "License not found" }); res.json(license); });
  app.post(api.licenses.create.path, isAuthenticated, requirePermission("licenses", ["create"]), async (req, res) => { try { const input = api.licenses.create.input.parse(req.body); const license = await storage.createLicense(input); await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, clientId: license.clientId, action: "create", resource: "license", entity: "license", entityId: license.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null }); res.status(201).json(license); } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, errors: err.errors }); throw err; } });
  app.put(api.licenses.update.path, isAuthenticated, requirePermission("licenses", ["edit"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.licenses.update.input.parse(req.body);
      const previous = await storage.getLicense(id);
      const license = await storage.updateLicense(id, input);
      if (!license) return res.status(404).json({ message: "License not found" });
      const snapshot = previous ? JSON.stringify(previous) : null;
      const changedFields = previous ? Object.entries(input as any).filter(([k, v]) => (previous as any)[k] !== v).map(([k]) => k) : [];
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, clientId: license.clientId, action: "update", resource: "license", entity: "license", entityId: license.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null, snapshot, details: JSON.stringify({ key: license.key, changedFields }) });
      res.json(license);
    } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.delete(api.licenses.delete.path, isAuthenticated, requirePermission("licenses", ["delete"]), async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteLicense(id);
    await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, action: "delete", resource: "license", entity: "license", entityId: id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null });
    res.status(204).send();
  });

  // Fornecedores
  app.get(api.fornecedores.list.path, isAuthenticated, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(await storage.getFornecedores(page, limit));
  });
  app.get(api.fornecedores.get.path, isAuthenticated, async (req, res) => { const f = await storage.getFornecedor(Number(req.params.id)); if (!f) return res.status(404).json({ message: "Fornecedor not found" }); res.json(f); });
  app.post(api.fornecedores.create.path, isAuthenticated, requirePermission("fornecedores", ["create"]), async (req, res) => { try { const input = api.fornecedores.create.input.parse(req.body); const f = await storage.createFornecedor(input); await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, action: "create", resource: "fornecedor", entity: "fornecedor", entityId: f.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null }); res.status(201).json(f); } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; } });
  app.put(api.fornecedores.update.path, isAuthenticated, requirePermission("fornecedores", ["edit"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.fornecedores.update.input.parse(req.body);
      const previous = await storage.getFornecedor(id);
      const f = await storage.updateFornecedor(id, input);
      if (!f) return res.status(404).json({ message: "Fornecedor not found" });
      const snapshot = previous ? JSON.stringify(previous) : null;
      const changedFields = previous ? Object.entries(input as any).filter(([k, v]) => (previous as any)[k] !== v).map(([k]) => k) : [];
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, action: "update", resource: "fornecedor", entity: "fornecedor", entityId: f.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null, snapshot, details: JSON.stringify({ nome: f.nome, changedFields }) });
      res.json(f);
    } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.delete(api.fornecedores.delete.path, isAuthenticated, requirePermission("fornecedores", ["delete"]), async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteFornecedor(id);
    await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, action: "delete", resource: "fornecedor", entity: "fornecedor", entityId: id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null });
    res.status(204).send();
  });

  // Produtos
  app.get(api.produtos.list.path, isAuthenticated, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(await storage.getProdutos(page, limit));
  });
  app.get(api.produtos.get.path, isAuthenticated, async (req, res) => { const p = await storage.getProduto(Number(req.params.id)); if (!p) return res.status(404).json({ message: "Produto not found" }); res.json(p); });
  app.post(api.produtos.create.path, isAuthenticated, requirePermission("produtos", ["create"]), async (req, res) => { try { const input = api.produtos.create.input.parse(req.body); const p = await storage.createProduto(input); await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, action: "create", resource: "produto", entity: "produto", entityId: p.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null }); res.status(201).json(p); } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; } });
  app.put(api.produtos.update.path, isAuthenticated, requirePermission("produtos", ["edit"]), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.produtos.update.input.parse(req.body);
      const previous = await storage.getProduto(id);
      const p = await storage.updateProduto(id, input);
      if (!p) return res.status(404).json({ message: "Produto not found" });
      const snapshot = previous ? JSON.stringify(previous) : null;
      const changedFields = previous ? Object.entries(input as any).filter(([k, v]) => (previous as any)[k] !== v).map(([k]) => k) : [];
      await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, action: "update", resource: "produto", entity: "produto", entityId: p.id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null, snapshot, details: JSON.stringify({ nome: p.nome, changedFields }) });
      res.json(p);
    } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; }
  });
  app.delete(api.produtos.delete.path, isAuthenticated, requirePermission("produtos", ["delete"]), async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteProduto(id);
    await storage.createAuditLog({ userId: req.user!.userId, userName: req.user!.name, action: "delete", resource: "produto", entity: "produto", entityId: id, ipAddress: req.ip || null, userAgent: req.headers["user-agent"] || null });
    res.status(204).send();
  });

  // Dashboard
  app.get(api.dashboard.stats.path, isAuthenticated, async (req, res) => { res.json(await storage.getDashboardStats()); });

  // Client Documents
  app.get("/api/clients/:clientId/documents", isAuthenticated, async (req, res) => { res.json(await storage.getClientDocuments(Number(req.params.clientId))); });
  app.post("/api/clients/:clientId/documents", isAuthenticated, requirePermission("documents", ["create"]), async (req, res) => { try { const input = api.clientDocuments.create.input.parse({ ...req.body, clientId: Number(req.params.clientId) }); res.status(201).json(await storage.createClientDocument(input)); } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; } });
  app.delete("/api/clients/:clientId/documents/:id", isAuthenticated, requirePermission("documents", ["delete"]), async (req, res) => { await storage.deleteClientDocument(Number(req.params.id)); res.status(204).send(); });

  // Credential Documents
  app.get("/api/credentials/:credentialId/documents", isAuthenticated, async (req, res) => { res.json(await storage.getCredentialDocuments(Number(req.params.credentialId))); });
  app.post("/api/credentials/:credentialId/documents", isAuthenticated, requirePermission("documents", ["create"]), async (req, res) => { try { const input = insertCredentialDocumentSchema.parse({ ...req.body, credentialId: Number(req.params.credentialId) }); res.status(201).json(await storage.createCredentialDocument(input)); } catch (err) { if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message }); throw err; } });
  app.delete("/api/credentials/:credentialId/documents/:id", isAuthenticated, requirePermission("documents", ["delete"]), async (req, res) => { await storage.deleteCredentialDocument(Number(req.params.id)); res.status(204).send(); });

  // Credential Document file
  app.get("/api/credential-documents/:id/file", isAuthenticated, requirePermission("credentials", ["view"]), async (req, res) => {
    try {
      const document = await storage.getCredentialDocumentById(Number(req.params.id));
      if (!document) return res.status(404).json({ message: "Document not found" });
      // Verify ownership: ensure credential exists
      const credential = await storage.getCredentialById(document.credentialId);
      if (!credential) return res.status(404).json({ message: "Credential not found" });
      if (document.type === "link") {
        return res.json({ redirectUrl: document.url });
      }
      const base64Data = document.url.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const ft = sanitizeFileType(document.fileType);
      const mimeType = ft === "pdf" ? "application/pdf" : ft === "doc" ? "application/msword" : ft === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : ft === "xls" ? "application/vnd.ms-excel" : ft === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : ft === "zip" ? "application/zip" : "application/octet-stream";
      const safeName = sanitizeFileName(document.name);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("X-Content-Type-Options", "nosniff");
      const disposition = ft === "pdf" ? `inline; filename="${safeName}"` : `attachment; filename="${safeName}"`;
      res.setHeader("Content-Disposition", disposition);
      res.send(buffer);
    } catch (error) { console.error("Error serving document:", error); res.status(500).json({ message: "Error serving document" }); }
  });

  // Document file
  app.get("/api/documents/:id/file", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getClientDocumentById(Number(req.params.id));
      if (!document) return res.status(404).json({ message: "Document not found" });
      // Verify ownership: ensure client exists
      const client = await storage.getClient(document.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (document.type === "link") {
        return res.json({ redirectUrl: document.url });
      }
      const base64Data = document.url.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const ft = sanitizeFileType(document.fileType);
      const mimeType = ft === "pdf" ? "application/pdf" : ft === "doc" ? "application/msword" : ft === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : ft === "xls" ? "application/vnd.ms-excel" : ft === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : ft === "zip" ? "application/zip" : "application/octet-stream";
      const safeName = sanitizeFileName(document.name);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("X-Content-Type-Options", "nosniff");
      const disposition = ft === "pdf" ? `inline; filename="${safeName}"` : `attachment; filename="${safeName}"`;
      res.setHeader("Content-Disposition", disposition);
      res.send(buffer);
    } catch (error) { console.error("Error serving document:", error); res.status(500).json({ message: "Error serving document" }); }
  });

  // Milvus Integration
  app.get("/api/integrations/milvus/clients/search", isAuthenticated, async (req, res) => {
    try {
      const documento = req.query.documento as string | undefined;
      const nome_fantasia = req.query.nome_fantasia as string | undefined;
      const status = req.query.status as string | undefined;

      const results = await milvusService.searchClients({ documento, nome_fantasia, status });

      // Enriquecer com informação de existência local
      const enriched = await Promise.all(
        results.map(async (mClient) => {
          const normalized = milvusService.normalizeClient(mClient);
          const existing =
            (normalized.milvusId ? await storage.getClientByMilvusId(normalized.milvusId) : undefined) ||
            (normalized.document ? await storage.getClientByDocument(normalized.document) : undefined) ||
            (normalized.email ? await storage.getClientByEmail(normalized.email) : undefined) ||
            (normalized.name ? await storage.getClientByName(normalized.name) : undefined);

          return {
            ...mClient,
            _localClientId: existing?.id || null,
            _alreadyExists: !!existing,
          };
        })
      );

      res.json(enriched);
    } catch (err: any) {
      console.error("Milvus search error:", err);
      res.status(502).json({ message: err.message || "Erro ao consultar Milvus" });
    }
  });

  app.post("/api/integrations/milvus/clients/import", isAuthenticated, async (req, res) => {
    try {
      const milvusClient = req.body as import("./services/milvus-service").MilvusClient;
      if (!milvusClient || !milvusClient.id) {
        return res.status(400).json({ message: "Dados do cliente Milvus são obrigatórios" });
      }

      const normalized = milvusService.normalizeClient(milvusClient);

      // Verificar duplicidade
      const existing =
        (normalized.milvusId ? await storage.getClientByMilvusId(normalized.milvusId) : undefined) ||
        (normalized.document ? await storage.getClientByDocument(normalized.document) : undefined) ||
        (normalized.email ? await storage.getClientByEmail(normalized.email) : undefined) ||
        (normalized.name ? await storage.getClientByName(normalized.name) : undefined);

      if (existing) {
        return res.status(409).json({ message: "Cliente já existe no sistema", clientId: existing.id });
      }

      const client = await storage.createClient(normalized);

      await storage.createAuditLog({
        userId: req.user!.userId,
        userName: req.user!.name,
        clientId: client.id,
        action: "import",
        resource: "client",
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
        details: JSON.stringify({ source: "milvus", milvusId: milvusClient.id }),
      });

      res.status(201).json(client);
    } catch (err: any) {
      console.error("Milvus import error:", err);
      res.status(500).json({ message: err.message || "Erro ao importar cliente" });
    }
  });

  app.post("/api/integrations/milvus/clients/sync/:milvusId", isAuthenticated, async (req, res) => {
    try {
      const milvusId = req.params.milvusId;
      const milvusClient = await milvusService.getClientById(milvusId);
      if (!milvusClient) {
        return res.status(404).json({ message: "Cliente não encontrado no Milvus" });
      }

      const normalized = milvusService.normalizeClient(milvusClient);

      const existing =
        (await storage.getClientByMilvusId(milvusId)) ||
        (normalized.document ? await storage.getClientByDocument(normalized.document) : undefined) ||
        (normalized.email ? await storage.getClientByEmail(normalized.email) : undefined) ||
        (normalized.name ? await storage.getClientByName(normalized.name) : undefined);

      if (!existing) {
        return res.status(404).json({ message: "Cliente não existe no sistema local. Use import primeiro." });
      }

      const client = await storage.updateClient(existing.id, normalized);

      await storage.createAuditLog({
        userId: req.user!.userId,
        userName: req.user!.name,
        clientId: client.id,
        action: "sync",
        resource: "client",
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
        details: JSON.stringify({ source: "milvus", milvusId }),
      });

      res.json(client);
    } catch (err: any) {
      console.error("Milvus sync error:", err);
      res.status(500).json({ message: err.message || "Erro ao sincronizar cliente" });
    }
  });

  app.post("/api/integrations/milvus/clients/import-all", isAuthenticated, async (req, res) => {
    try {
      const dryRun = req.query.dryRun === "true";
      const milvusClients = await milvusService.getAllClients();

      const summary = {
        totalFromMilvus: milvusClients.length,
        created: 0,
        updated: 0,
        skipped: 0,
        conflicts: 0,
        errors: 0,
        details: [] as any[],
      };

      for (const mClient of milvusClients) {
        try {
          const normalized = milvusService.normalizeClient(mClient);

          const existingByMilvusId = normalized.milvusId
            ? await storage.getClientByMilvusId(normalized.milvusId)
            : undefined;
          const existingByDocument = !existingByMilvusId && normalized.document
            ? await storage.getClientByDocument(normalized.document)
            : undefined;
          const existingByEmail = !existingByMilvusId && !existingByDocument && normalized.email
            ? await storage.getClientByEmail(normalized.email)
            : undefined;
          const existingByName = !existingByMilvusId && !existingByDocument && !existingByEmail && normalized.name
            ? await storage.getClientByName(normalized.name)
            : undefined;

          const existing = existingByMilvusId || existingByDocument || existingByEmail || existingByName;

          if (existing) {
            const matchMethod = existingByMilvusId
              ? "milvusId"
              : existingByDocument
                ? "document"
                : existingByEmail
                  ? "email"
                  : "name";

            if (existing.milvusId && existing.milvusId !== normalized.milvusId) {
              summary.conflicts++;
              summary.details.push({
                milvusId: normalized.milvusId,
                name: normalized.name,
                action: "conflict",
                reason: `Cliente local #${existing.id} já vinculado a outro milvusId (${existing.milvusId})`,
              });
              continue;
            }

            if (!dryRun) {
              await storage.updateClient(existing.id, {
                name: normalized.name || existing.name,
                email: normalized.email || existing.email,
                phone: normalized.phone || existing.phone,
                address: normalized.address || existing.address,
                document: normalized.document || existing.document,
                status: normalized.status,
                milvusId: normalized.milvusId,
                source: "milvus",
                lastSyncAt: new Date(),
                syncStatus: "synced",
                milvusUpdatedAt: new Date(),
              });

              await storage.createAuditLog({
                userId: req.user!.userId,
                userName: req.user!.name,
                clientId: existing.id,
                action: "sync",
                resource: "client",
                ipAddress: req.ip || null,
                userAgent: req.headers["user-agent"] || null,
                details: JSON.stringify({ source: "milvus", milvusId: normalized.milvusId, method: matchMethod }),
              });
            }

            summary.updated++;
            summary.details.push({
              milvusId: normalized.milvusId,
              name: normalized.name,
              action: "updated",
              localId: existing.id,
              matchedBy: matchMethod,
            });
          } else {
            if (!dryRun) {
              const created = await storage.createClient(normalized);

              await storage.createAuditLog({
                userId: req.user!.userId,
                userName: req.user!.name,
                clientId: created.id,
                action: "import",
                resource: "client",
                ipAddress: req.ip || null,
                userAgent: req.headers["user-agent"] || null,
                details: JSON.stringify({ source: "milvus", milvusId: normalized.milvusId }),
              });
            }

            summary.created++;
            summary.details.push({
              milvusId: normalized.milvusId,
              name: normalized.name,
              action: "created",
            });
          }
        } catch (itemErr: any) {
          summary.errors++;
          summary.details.push({
            milvusId: String(mClient.id),
            name: mClient.razao_social || mClient.nome_fantasia,
            action: "error",
            reason: itemErr.message,
          });
        }
      }

      res.json(summary);
    } catch (err: any) {
      console.error("Milvus import-all error:", err);
      res.status(500).json({ message: err.message || "Erro ao importar clientes do Milvus" });
    }
  });

  // Public branding endpoint (used by login page, no auth required)
  app.get("/api/branding", async (req, res) => {
    const setting = await storage.getSystemSetting("branding");
    if (!setting) return res.json({ key: "branding", value: JSON.stringify({ sidebarLogo: null, favicon: null, loginHeroImage: null, appName: "Polo Telecom" }) });
    res.json(setting);
  });

  // System Settings
  app.get("/api/settings/:key", isAuthenticated, async (req, res) => {
    const setting = await storage.getSystemSetting(req.params.key);
    if (!setting) return res.status(404).json({ message: "Setting not found" });
    res.json(setting);
  });

  app.put("/api/settings/:key", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { value } = req.body;
      if (typeof value !== "string") return res.status(400).json({ message: "Value must be a string" });
      const setting = await storage.setSystemSetting(req.params.key, value);
      res.json(setting);
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });

  // Seed Data
  await seedDatabase();
  return httpServer;
}

async function seedDatabase() {
  // Seed categories
  const categories = await storage.getCredentialCategories();
  if (categories.length === 0) {
    const defaultCategories = [
      "Servidor",
      "Painel de Controle",
      "VPN",
      "E-mail",
      "Banco de Dados",
      "Rede",
      "Outro",
    ];
    for (const name of defaultCategories) {
      await storage.createCredentialCategory({ name });
    }
  }

  const fornecedores = await storage.getFornecedores();
  if (fornecedores.data.length === 0) {
    await storage.createFornecedor({ nome: "3CX", status: "active" });
  }

  const produtos = await storage.getProdutos();
  if (produtos.data.length === 0) {
    await storage.createProduto({ nome: "Ramais Administrativos", status: "active" });
  }

  const licensesList = await storage.getLicenses();
  if (licensesList.data.length === 0) {
    const fornecedor = (await storage.getFornecedores()).data[0];
    const produto = (await storage.getProdutos()).data[0];
    if (fornecedor && produto) {
      await storage.createLicense({ key: "3CX-ADMIN-001", fornecedorId: fornecedor.id, produtoId: produto.id, contractType: "new", renewalType: "annual", status: "active", notes: "Licença para ramais administrativos", serviceCategory: "Locação PABX" });
      await storage.createLicense({ key: "3CX-ADMIN-002", fornecedorId: fornecedor.id, produtoId: produto.id, contractType: "new", renewalType: "none", status: "active", notes: "Licença adicional para expansão", serviceCategory: "Locação PABX" });
    }
  }

  const clientsList = await storage.getClients();
  if (clientsList.data.length === 0) {
    await storage.createClient({ name: "Acme Corp", email: "contact@acme.com", phone: "555-0123", address: "123 Innovation Dr, Tech City", status: "active" });
  }
}
