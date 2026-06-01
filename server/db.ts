import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { TRPCError } from "@trpc/server";
import {
  InsertUser,
  users,
  declarations,
  collaborators,
  settings,
  quotas,
  quotaTracking,
  InsertDeclaration,
  InsertSetting,
  InsertQuota,
  InsertQuotaTracking,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// ─── Conexão ──────────────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { prepare: false });
      _db = drizzle(client);
    } catch (error) {
      console.error("[Database] Falha ao conectar:", error);
      _db = null;
    }
  }
  return _db;
}

// Lança TRPCError (e não Error genérico) quando o banco não está disponível.
// Isso garante que o tRPC serializa o erro corretamente como JSON em vez de
// retornar "A server error occurred" como texto puro.
function requireDb(db: ReturnType<typeof drizzle> | null) {
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Banco de dados indisponível. Verifique se DATABASE_URL está configurado nas variáveis de ambiente.",
    });
  }
  return db;
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new TRPCError({ code: "BAD_REQUEST", message: "openId obrigatório" });
  const db = requireDb(await getDb());
  const values: any = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      role: values.role,
      lastSignedIn: values.lastSignedIn,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Declarações ──────────────────────────────────────────────────────────────

export async function getDeclarationsByMonth(userId: number, month: any) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(declarations)
    .where(and(eq(declarations.userId, userId), eq(declarations.month, month)));
}

export async function createDeclaration(data: InsertDeclaration) {
  const db = requireDb(await getDb());
  const result = await db.insert(declarations).values(data).returning();
  return result[0];
}

export async function updateDeclaration(id: number, data: Partial<InsertDeclaration>) {
  const db = requireDb(await getDb());
  const result = await db
    .update(declarations)
    .set(data)
    .where(eq(declarations.id, id))
    .returning();
  return result[0];
}

export async function deleteDeclaration(id: number) {
  const db = requireDb(await getDb());
  await db.delete(declarations).where(eq(declarations.id, id));
  return { success: true };
}

// ─── Colaboradores ────────────────────────────────────────────────────────────

export async function getCollaborators(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(collaborators)
    .where(eq(collaborators.userId, userId))
    .orderBy(collaborators.name);
}

export async function addCollaborator(userId: number, name: string) {
  const db = requireDb(await getDb());
  try {
    const result = await db
      .insert(collaborators)
      .values({ userId, name })
      .returning();
    return result[0];
  } catch (e: any) {
    // Violação de unique constraint = colaborador já existe
    if (e?.code === "23505" || e?.message?.includes("unique")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Colaborador "${name}" já existe.`,
      });
    }
    throw e;
  }
}

export async function removeCollaborator(id: number) {
  const db = requireDb(await getDb());
  await db.delete(collaborators).where(eq(collaborators.id, id));
  return { success: true };
}

// ─── Configurações ────────────────────────────────────────────────────────────

export async function getSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSettings(userId: number, data: any) {
  const db = requireDb(await getDb());
  const existing = await getSettings(userId);
  if (existing) {
    const result = await db
      .update(settings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(settings.userId, userId))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(settings)
      .values({ userId, ...data })
      .returning();
    return result[0];
  }
}

// ─── Cotas ────────────────────────────────────────────────────────────────────

export async function createQuota(data: InsertQuota) {
  const db = requireDb(await getDb());
  const result = await db.insert(quotas).values(data).returning();
  return result[0];
}

export async function getQuotasByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotas).where(eq(quotas.userId, userId));
}

export async function getQuotasByCollaborator(userId: number, collaboratorName: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(quotas)
    .where(and(eq(quotas.userId, userId), eq(quotas.collaborator, collaboratorName)));
}

export async function updateQuota(id: number, data: any) {
  const db = requireDb(await getDb());
  const result = await db
    .update(quotas)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(quotas.id, id))
    .returning();
  return result[0];
}

export async function deleteQuota(id: number) {
  const db = requireDb(await getDb());
  await db.delete(quotas).where(eq(quotas.id, id));
  return { success: true };
}

export async function updateCotasEnviadas(quotaId: number, cotasEnviadas: number) {
  const db = requireDb(await getDb());
  const result = await db
    .update(quotas)
    .set({ cotasEnviadas, updatedAt: new Date() })
    .where(eq(quotas.id, quotaId))
    .returning();
  return result[0];
}

// ─── Comissões ────────────────────────────────────────────────────────────────

export async function getCommissionsByCollaborator(userId: number, collaboratorName: string) {
  const db = await getDb();
  if (!db) return { quantity: 0, totalValue: 0, totalCommission: 0 };

  const list = await db
    .select()
    .from(declarations)
    .where(
      and(
        eq(declarations.userId, userId),
        eq(declarations.collaborator, collaboratorName)
      )
    );

  return {
    quantity: list.length,
    totalValue: list.reduce((s, d) => s + (d.valorRecebido || 0), 0),
    totalCommission: list
      .filter((d) => d.statusPagamento === "PAGO")
      .reduce((s, d) => s + (d.comissao || 0), 0),
  };
}