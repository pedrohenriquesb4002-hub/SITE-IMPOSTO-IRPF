import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, users, declarations, collaborators, settings, quotas, quotaTracking, 
  InsertDeclaration, InsertSetting, InsertQuota, InsertQuotaTracking 
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Configuração do cliente Postgres (Neon)
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // O prepare: false é importante para o Neon (pgbouncer) não dar erro
      const client = postgres(process.env.DATABASE_URL, { prepare: false });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Falha ao conectar:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) return;

  try {
    const values: any = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? (user.openId === ENV.ownerOpenId ? 'admin' : 'user'),
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };

    // No Postgres usamos onConflictDoUpdate em vez de onDuplicateKeyUpdate
    await db.insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: {
          name: values.name,
          email: values.email,
          loginMethod: values.loginMethod,
          role: values.role,
          lastSignedIn: values.lastSignedIn,
        }
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Declarations queries
export async function getDeclarationsByMonth(userId: number, month: any) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(declarations).where(
    and(eq(declarations.userId, userId), eq(declarations.month, month))
  );
}

export async function createDeclaration(data: InsertDeclaration) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.insert(declarations).values(data).returning();
}

export async function updateDeclaration(id: number, data: Partial<InsertDeclaration>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.update(declarations).set(data).where(eq(declarations.id, id)).returning();
  return result[0];
}

export async function deleteDeclaration(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.delete(declarations).where(eq(declarations.id, id));
}

// Collaborators
export async function getCollaborators(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collaborators).where(eq(collaborators.userId, userId)).orderBy(collaborators.name);
}

export async function addCollaborator(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.insert(collaborators).values({ userId, name });
}

export async function removeCollaborator(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.delete(collaborators).where(eq(collaborators.id, id));
}

// Settings
export async function getSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSettings(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await getSettings(userId);
  if (existing) {
    return db.update(settings).set(data).where(eq(settings.userId, userId));
  } else {
    return db.insert(settings).values({ userId, ...data });
  }
}

// Quotas
export async function createQuota(data: InsertQuota) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.insert(quotas).values(data);
}

export async function getQuotasByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotas).where(eq(quotas.userId, userId));
}

export async function getQuotasByCollaborator(userId: number, collaboratorName: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotas).where(
    and(eq(quotas.userId, userId), eq(quotas.collaborator, collaboratorName))
  );
}

export async function updateQuota(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.update(quotas).set(data).where(eq(quotas.id, id));
}

export async function deleteQuota(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.delete(quotas).where(eq(quotas.id, id));
}

export async function updateCotasEnviadas(quotaId: number, cotasEnviadas: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.update(quotas).set({ cotasEnviadas }).where(eq(quotas.id, quotaId));
}

// Commission calculations
export async function getCommissionsByCollaborator(userId: number, collaboratorName: string) {
  const db = await getDb();
  if (!db) return { quantity: 0, totalValue: 0, totalCommission: 0 };
  
  const declarations_list = await db.select().from(declarations).where(
    and(eq(declarations.userId, userId), eq(declarations.collaborator, collaboratorName))
  );
  
  const quantity = declarations_list.length;
  const totalValue = declarations_list.reduce((sum, d) => sum + (d.valorRecebido || 0), 0);
  const totalCommission = declarations_list
    .filter(d => d.statusPagamento === 'PAGO')
    .reduce((sum, d) => sum + (d.comissao || 0), 0);
  
  return { quantity, totalValue, totalCommission };
}