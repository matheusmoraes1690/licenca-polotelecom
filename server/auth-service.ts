import crypto from "crypto";
import { db } from "./db";
import { users, profiles, auditLogs, passwordHistory } from "@shared/schema";
import { eq, and, gt, sql, desc } from "drizzle-orm";

const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 30;
const PASSWORD_MAX_AGE_DAYS = 30;
const PASSWORD_HISTORY_LIMIT = 3;

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 10) {
    return { valid: false, error: "A senha deve ter no mínimo 10 caracteres." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "A senha deve conter pelo menos uma letra maiúscula." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "A senha deve conter pelo menos uma letra minúscula." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "A senha deve conter pelo menos um número." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: "A senha deve conter pelo menos um caractere especial." };
  }
  return { valid: true };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split("$");
  if (!salt || !hash) return false;
  const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
}

export async function createUser(data: {
  username: string;
  name: string;
  email?: string;
  password: string;
  profileId?: number;
  role?: string;
}) {
  const strength = validatePasswordStrength(data.password);
  if (!strength.valid) {
    throw new Error(strength.error);
  }
  const passwordHash = hashPassword(data.password);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PASSWORD_MAX_AGE_DAYS);
  const [user] = await db
    .insert(users)
    .values({
      username: data.username,
      name: data.name,
      email: data.email || null,
      passwordHash,
      profileId: data.profileId || null,
      role: data.role || "viewer",
      lastPasswordChangedAt: new Date(),
      passwordExpiresAt: expiresAt,
    })
    .returning();
  // Store initial password in history
  await db.insert(passwordHistory).values({ userId: user.id, passwordHash });
  return user;
}

export async function updateUser(id: number, data: Partial<{
  username: string;
  name: string;
  email: string;
  password: string;
  profileId: number;
  role: string;
  status: string;
}>): Promise<any> {
  const existingUser = await getUserById(id);
  if (!existingUser) return undefined;

  const updates: any = { ...data };
  if (data.password) {
    const strength = validatePasswordStrength(data.password);
    if (!strength.valid) {
      throw new Error(strength.error);
    }

    // Check against last 3 passwords
    const history = await getPasswordHistory(id, PASSWORD_HISTORY_LIMIT);
    for (const entry of history) {
      if (verifyPassword(data.password, entry.passwordHash)) {
        throw new Error("A nova senha não pode ser igual às 3 últimas senhas utilizadas.");
      }
    }

    updates.passwordHash = hashPassword(data.password);
    delete updates.password;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PASSWORD_MAX_AGE_DAYS);
    updates.lastPasswordChangedAt = new Date();
    updates.passwordExpiresAt = expiresAt;

    // Store old password in history
    await db.insert(passwordHistory).values({ userId: id, passwordHash: existingUser.passwordHash });

    // Keep only the last PASSWORD_HISTORY_LIMIT entries
    const allHistory = await getPasswordHistory(id, 1000);
    if (allHistory.length > PASSWORD_HISTORY_LIMIT) {
      const toDelete = allHistory.slice(PASSWORD_HISTORY_LIMIT);
      for (const entry of toDelete) {
        await db.delete(passwordHistory).where(eq(passwordHistory.id, entry.id));
      }
    }
  }
  const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
  if (user && (data.profileId !== undefined || data.role !== undefined)) {
    await invalidateUserSessions(id);
  }
  return user;
}

export async function getPasswordHistory(userId: number, limit = PASSWORD_HISTORY_LIMIT) {
  return db
    .select()
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(limit);
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getUserById(userId);
  if (!user) return { success: false, error: "Usuário não encontrado" };
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { success: false, error: "Senha atual incorreta" };
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return { success: false, error: strength.error };
  }

  // Check against last 3 passwords
  const history = await getPasswordHistory(userId, PASSWORD_HISTORY_LIMIT);
  for (const entry of history) {
    if (verifyPassword(newPassword, entry.passwordHash)) {
      return { success: false, error: "A nova senha não pode ser igual às 3 últimas senhas utilizadas." };
    }
  }

  const newHash = hashPassword(newPassword);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PASSWORD_MAX_AGE_DAYS);

  await db
    .update(users)
    .set({
      passwordHash: newHash,
      lastPasswordChangedAt: new Date(),
      passwordExpiresAt: expiresAt,
    })
    .where(eq(users.id, userId));

  // Store old password in history
  await db.insert(passwordHistory).values({ userId, passwordHash: user.passwordHash });

  // Keep only the last PASSWORD_HISTORY_LIMIT entries
  const allHistory = await getPasswordHistory(userId, 1000);
  if (allHistory.length > PASSWORD_HISTORY_LIMIT) {
    const toDelete = allHistory.slice(PASSWORD_HISTORY_LIMIT);
    for (const entry of toDelete) {
      await db.delete(passwordHistory).where(eq(passwordHistory.id, entry.id));
    }
  }

  invalidateUserSessions(userId);
  return { success: true };
}

export async function forcePasswordChange(
  userId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getUserById(userId);
  if (!user) return { success: false, error: "Usuário não encontrado" };

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return { success: false, error: strength.error };
  }

  // Check against last 3 passwords
  const history = await getPasswordHistory(userId, PASSWORD_HISTORY_LIMIT);
  for (const entry of history) {
    if (verifyPassword(newPassword, entry.passwordHash)) {
      return { success: false, error: "A nova senha não pode ser igual às 3 últimas senhas utilizadas." };
    }
  }

  const newHash = hashPassword(newPassword);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PASSWORD_MAX_AGE_DAYS);

  await db
    .update(users)
    .set({
      passwordHash: newHash,
      lastPasswordChangedAt: new Date(),
      passwordExpiresAt: expiresAt,
    })
    .where(eq(users.id, userId));

  await db.insert(passwordHistory).values({ userId, passwordHash: user.passwordHash });

  const allHistory = await getPasswordHistory(userId, 1000);
  if (allHistory.length > PASSWORD_HISTORY_LIMIT) {
    const toDelete = allHistory.slice(PASSWORD_HISTORY_LIMIT);
    for (const entry of toDelete) {
      await db.delete(passwordHistory).where(eq(passwordHistory.id, entry.id));
    }
  }

  invalidateUserSessions(userId);
  return { success: true };
}

export async function getUserByUsername(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user;
}

export async function getUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getAllUsers() {
  return await db.select().from(users);
}

export async function getAllProfiles() {
  return await db.select().from(profiles);
}

export async function getProfileById(id: number) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
  return profile;
}

export async function createProfile(data: { name: string; description?: string; permissions?: Record<string, any> }) {
  const [profile] = await db
    .insert(profiles)
    .values({
      name: data.name,
      description: data.description || null,
      permissions: JSON.stringify(data.permissions || {}),
    })
    .returning();
  return profile;
}

export async function updateProfile(id: number, data: Partial<{ name: string; description: string; permissions: Record<string, any> }>) {
  const updates: any = { ...data };
  if (data.permissions) {
    updates.permissions = JSON.stringify(data.permissions);
  }
  const [profile] = await db.update(profiles).set(updates).where(eq(profiles.id, id)).returning();
  return profile;
}

export async function deleteProfile(id: number) {
  await db.delete(profiles).where(eq(profiles.id, id));
}

export async function login(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<{ success: boolean; user?: any; error?: string; requirePasswordChange?: boolean }> {
  const user = await getUserByUsername(username);

  if (!user) {
    return { success: false, error: "Credenciais inválidas" };
  }

  // Check if blocked
  if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
    return { success: false, error: "Conta temporariamente bloqueada. Tente novamente mais tarde." };
  }

  if (user.status !== "active") {
    return { success: false, error: "Conta inativa." };
  }

  const valid = verifyPassword(password, user.passwordHash);

  if (!valid) {
    const newAttempts = (user.loginAttempts || 0) + 1;
    const updates: any = { loginAttempts: newAttempts };

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000);
      updates.blockedUntil = blockedUntil;
    }

    await db.update(users).set(updates).where(eq(users.id, user.id));

    return { success: false, error: "Credenciais inválidas" };
  }

  // Check password expiration
  const now = new Date();
  const passwordExpired = user.passwordExpiresAt ? new Date(user.passwordExpiresAt) <= now : false;

  // Reset attempts and update last login
  await db.update(users).set({ loginAttempts: 0, blockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));

  // Audit log
  await db.insert(auditLogs).values({
    userId: user.id,
    userName: user.name,
    action: "login",
    resource: "auth",
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    details: JSON.stringify({ metodo: "Senha", passwordExpired }),
  });

  return {
    success: true,
    user: { id: user.id, username: user.username, name: user.name, profileId: user.profileId, role: user.role || "viewer" },
    requirePasswordChange: passwordExpired,
  };
}

export async function hasPermission(userSession: any, module: string, actions: string[]): Promise<boolean> {
  if (!userSession) return false;
  if (userSession.role === "admin" || userSession.username === "admin") return true;
  if (!userSession.profileId) return false;
  const profile = await getProfileById(userSession.profileId);
  if (!profile) return false;
  const perms = JSON.parse(profile.permissions || "{}");
  if (!Array.isArray(actions)) {
    return Array.isArray(perms[module]) && perms[module].includes(actions);
  }
  return actions.some((action) => Array.isArray(perms[module]) && perms[module].includes(action));
}

export async function invalidateUserSessions(userId: number) {
  // Deleta todas as sessões do connect-pg-simple cujo JSON contenha o userId
  await db.execute(
    sql`DELETE FROM app_sessions WHERE (sess::jsonb)->>'userId' = ${String(userId)}`
  );
}

// Seed default profiles and admin user
export async function seedAuth() {
  const existingProfiles = await getAllProfiles();
  if (existingProfiles.length === 0) {
    await db.insert(profiles).values([
      {
        name: "Administrador",
        description: "Acesso total ao sistema",
        isBuiltIn: true,
        permissions: JSON.stringify({
          clients: ["view", "create", "edit", "delete"],
          licenses: ["view", "create", "edit", "delete"],
          fornecedores: ["view", "create", "edit", "delete"],
          produtos: ["view", "create", "edit", "delete"],
          credentials: ["view", "create", "edit", "delete", "copy", "reveal"],
          audit: ["view"],
          users: ["view", "create", "edit", "delete"],
          profiles: ["view", "create", "edit", "delete"],
          documents: ["view", "create", "edit", "delete"],
          export: ["execute"],
        }),
      },
      {
        name: "Gerente",
        description: "Gestão de clientes e credenciais",
        isBuiltIn: true,
        permissions: JSON.stringify({
          clients: ["view", "create", "edit"],
          licenses: ["view", "create", "edit"],
          fornecedores: ["view", "create", "edit"],
          produtos: ["view", "create", "edit"],
          credentials: ["view", "create", "edit", "copy", "reveal"],
          audit: ["view"],
          users: ["view"],
          documents: ["view", "create", "edit"],
          export: ["execute"],
        }),
      },
      {
        name: "Técnico",
        description: "Acesso técnico às credenciais",
        isBuiltIn: true,
        permissions: JSON.stringify({
          clients: ["view"],
          licenses: ["view"],
          fornecedores: ["view"],
          produtos: ["view"],
          credentials: ["view", "copy", "reveal"],
          documents: ["view"],
        }),
      },
      {
        name: "Comercial",
        description: "Acesso comercial sem visualização de senhas",
        isBuiltIn: true,
        permissions: JSON.stringify({
          clients: ["view", "create", "edit"],
          licenses: ["view", "create", "edit"],
          fornecedores: ["view", "create", "edit"],
          produtos: ["view", "create", "edit"],
          credentials: ["view"],
          documents: ["view"],
        }),
      },
      {
        name: "Auditor",
        description: "Visualização de logs e auditoria",
        isBuiltIn: true,
        permissions: JSON.stringify({
          clients: ["view"],
          licenses: ["view"],
          fornecedores: ["view"],
          produtos: ["view"],
          credentials: ["view"],
          audit: ["view"],
        }),
      },
      {
        name: "Somente Leitura",
        description: "Apenas visualização",
        isBuiltIn: true,
        permissions: JSON.stringify({
          clients: ["view"],
          licenses: ["view"],
          fornecedores: ["view"],
          produtos: ["view"],
          credentials: ["view"],
          documents: ["view"],
        }),
      },
    ]);
  }

  const existingUsers = await getAllUsers();
  if (existingUsers.length === 0) {
    const adminProfile = await getAllProfiles().then(p => p.find(pr => pr.name === "Administrador"));
    if (adminProfile) {
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
      if (!initialPassword) {
        console.warn("[SECURITY] ADMIN_INITIAL_PASSWORD não está definida. Usuário admin não será criado automaticamente. Defina a variável e reinicie.");
        return;
      }
      const adminUser = await createUser({
        username: "admin",
        name: "Administrador",
        password: initialPassword,
        profileId: adminProfile.id,
        role: "admin",
      });
      // Seed auth already calls createUser which sets expiration, but ensure it's correct
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + PASSWORD_MAX_AGE_DAYS);
      await db.update(users)
        .set({ lastPasswordChangedAt: new Date(), passwordExpiresAt: expiresAt })
        .where(eq(users.id, adminUser.id));
      console.log("[SECURITY] Usuário admin criado com sucesso. Remova ou altere ADMIN_INITIAL_PASSWORD após o primeiro acesso.");
    }
  }
}
