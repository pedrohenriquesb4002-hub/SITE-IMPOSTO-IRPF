import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { declarations, itrDeclarations } from "../drizzle/schema";
import { getDb } from "./db";
import { calculateCommission } from "./commissionCalculator";
import { getAllMonthsCommissions, getTotalCommissions } from "./commissionsByMonth";
import {
  getDeclarationsByMonth,
  createDeclaration,
  updateDeclaration,
  deleteDeclaration,
  getCollaborators,
  addCollaborator,
  removeCollaborator,
  getSettings,
  updateSettings,
  getCommissionsByCollaborator,
  createQuota,
  getQuotasByUser,
  getQuotasByCollaborator,
  updateQuota,
  deleteQuota,
  updateCotasEnviadas,
} from "./db";

const PUBLIC_USER_ID = 1;

// ─── Helpers ITR ────────────────────────────────────────────────────────────

async function getItrDeclarationsByMonth(userId: number, month: 'Agosto' | 'Setembro') {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(itrDeclarations)
    .where(and(eq(itrDeclarations.userId, userId), eq(itrDeclarations.month, month)));
}

async function createItrDeclaration(data: {
  userId: number;
  month: 'Agosto' | 'Setembro';
  collaborator: string;
  cpfCliente?: string;
  cliente: string;
  valorRecebido: number;
  clienteType: 'Sócio' | 'Diversos';
  comissao?: number;
  statusPagamento: 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO';
}) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const [result] = await db.insert(itrDeclarations).values({
    ...data,
    cpfCliente: data.cpfCliente ?? null,
    comissao: data.comissao ?? null,
  }).returning();
  return result;
}

async function updateItrDeclaration(id: number, data: Partial<typeof itrDeclarations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const [result] = await db.update(itrDeclarations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(itrDeclarations.id, id))
    .returning();
  return result;
}

async function deleteItrDeclaration(id: number) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.delete(itrDeclarations).where(eq(itrDeclarations.id, id));
  return { success: true };
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(() => ({ id: PUBLIC_USER_ID, username: "admin", name: "Painel Público" })),
    logout: publicProcedure.mutation(({ ctx }: any) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  declarations: router({
    listByMonth: publicProcedure
      .input(z.enum(['Março', 'Abril', 'Maio']))
      .query(async ({ input }: any) => {
        return getDeclarationsByMonth(PUBLIC_USER_ID, input);
      }),

    create: publicProcedure
      .input(z.object({
        month: z.enum(['Março', 'Abril', 'Maio']),
        collaborator: z.string().min(1),
        cpfCliente: z.string().optional(),
        cliente: z.string().min(1),
        valorRecebido: z.number().int().nonnegative(),
        clienteType: z.enum(['Sócio', 'Diversos']),
        statusPagamento: z.enum(['PAGO', 'AGUARDANDO', 'DOAÇÃO']),
      }))
      .mutation(async ({ input }: any) => {
        const comissao = calculateCommission(input.valorRecebido, input.clienteType, input.statusPagamento);
        return createDeclaration({
          userId: PUBLIC_USER_ID,
          month: input.month,
          collaborator: input.collaborator,
          cpfCliente: input.cpfCliente,
          cliente: input.cliente,
          valorRecebido: input.valorRecebido,
          clienteType: input.clienteType,
          comissao,
          statusPagamento: input.statusPagamento,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().int(),
        month: z.enum(['Março', 'Abril', 'Maio']).optional(),
        collaborator: z.string().min(1).optional(),
        cpfCliente: z.string().optional(),
        cliente: z.string().min(1).optional(),
        valorRecebido: z.number().int().nonnegative().optional(),
        clienteType: z.enum(['Sócio', 'Diversos']).optional(),
        statusPagamento: z.enum(['PAGO', 'AGUARDANDO', 'DOAÇÃO']).optional(),
      }))
      .mutation(async ({ input }: any) => {
        const { id, ...inputData } = input;
        const data: Record<string, any> = inputData;
        const db = await getDb();
        if (db && (data.valorRecebido !== undefined || data.clienteType !== undefined || data.statusPagamento !== undefined)) {
          const result = await db.select().from(declarations).where(eq(declarations.id, id)).limit(1);
          const existing = result[0];
          data.comissao = calculateCommission(
            data.valorRecebido ?? existing?.valorRecebido ?? 0,
            data.clienteType ?? existing?.clienteType ?? 'Diversos',
            data.statusPagamento ?? existing?.statusPagamento ?? 'AGUARDANDO'
          );
        }
        return updateDeclaration(id, data);
      }),

    delete: publicProcedure.input(z.number().int()).mutation(async ({ input }: any) => deleteDeclaration(input)),

    deleteByCollaborator: publicProcedure
      .input(z.object({ collaborator: z.string().min(1) }))
      .mutation(async ({ input }: any) => {
        const db = await getDb();
        if (!db) return { success: false };
        try {
          await db.delete(declarations).where(eq(declarations.collaborator, input.collaborator));
          return { success: true };
        } catch { return { success: false }; }
      }),

    exportToExcel: publicProcedure.query(async () => {
      const months = ['Março', 'Abril', 'Maio'] as const;
      const allDeclarations: any = {};
      for (const month of months) {
        allDeclarations[month] = await getDeclarationsByMonth(PUBLIC_USER_ID, month);
      }
      const commissionsByCollab: any = {};
      for (const month of months) {
        for (const decl of allDeclarations[month]) {
          if (!commissionsByCollab[decl.collaborator]) {
            commissionsByCollab[decl.collaborator] = {
              collaborator: decl.collaborator,
              marco: { quantidade: 0, valor: 0, comissao: 0 },
              abril: { quantidade: 0, valor: 0, comissao: 0 },
              maio: { quantidade: 0, valor: 0, comissao: 0 },
              total: { quantidade: 0, valor: 0, comissao: 0 },
            };
          }
          const mKey = month === 'Março' ? 'marco' : month.toLowerCase();
          commissionsByCollab[decl.collaborator][mKey].quantidade++;
          commissionsByCollab[decl.collaborator][mKey].valor += (decl.valorRecebido || 0);
          if (decl.statusPagamento === 'PAGO') commissionsByCollab[decl.collaborator][mKey].comissao += (decl.comissao || 0);
          commissionsByCollab[decl.collaborator].total.quantidade++;
          commissionsByCollab[decl.collaborator].total.valor += (decl.valorRecebido || 0);
          if (decl.statusPagamento === 'PAGO') commissionsByCollab[decl.collaborator].total.comissao += (decl.comissao || 0);
        }
      }
      return { declarations: allDeclarations, commissions: Object.values(commissionsByCollab) };
    }),
  }),

  // ─── ITR ──────────────────────────────────────────────────────────────────
  itr: router({
    listByMonth: publicProcedure
      .input(z.enum(['Agosto', 'Setembro']))
      .query(async ({ input }: any) => {
        return getItrDeclarationsByMonth(PUBLIC_USER_ID, input);
      }),

    create: publicProcedure
      .input(z.object({
        month: z.enum(['Agosto', 'Setembro']),
        collaborator: z.string().min(1),
        cpfCliente: z.string().optional(),
        cliente: z.string().min(1),
        valorRecebido: z.number().int().nonnegative(),
        clienteType: z.enum(['Sócio', 'Diversos']),
        statusPagamento: z.enum(['PAGO', 'AGUARDANDO', 'DOAÇÃO']),
      }))
      .mutation(async ({ input }: any) => {
        const comissao = calculateCommission(input.valorRecebido, input.clienteType, input.statusPagamento);
        return createItrDeclaration({
          userId: PUBLIC_USER_ID,
          month: input.month,
          collaborator: input.collaborator,
          cpfCliente: input.cpfCliente,
          cliente: input.cliente,
          valorRecebido: input.valorRecebido,
          clienteType: input.clienteType,
          comissao,
          statusPagamento: input.statusPagamento,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number().int(),
        collaborator: z.string().min(1).optional(),
        cpfCliente: z.string().optional(),
        cliente: z.string().min(1).optional(),
        valorRecebido: z.number().int().nonnegative().optional(),
        clienteType: z.enum(['Sócio', 'Diversos']).optional(),
        statusPagamento: z.enum(['PAGO', 'AGUARDANDO', 'DOAÇÃO']).optional(),
      }))
      .mutation(async ({ input }: any) => {
        const { id, ...data } = input;
        const db = await getDb();
        if (db && (data.valorRecebido !== undefined || data.clienteType !== undefined || data.statusPagamento !== undefined)) {
          const result = await db.select().from(itrDeclarations).where(eq(itrDeclarations.id, id)).limit(1);
          const existing = result[0];
          data.comissao = calculateCommission(
            data.valorRecebido ?? existing?.valorRecebido ?? 0,
            data.clienteType ?? existing?.clienteType ?? 'Diversos',
            data.statusPagamento ?? existing?.statusPagamento ?? 'AGUARDANDO'
          );
        }
        return updateItrDeclaration(id, data);
      }),

    delete: publicProcedure
      .input(z.number().int())
      .mutation(async ({ input }: any) => deleteItrDeclaration(input)),
  }),

  collaborators: router({
    list: publicProcedure.query(async () => getCollaborators(PUBLIC_USER_ID)),
    add: publicProcedure.input(z.object({ name: z.string().min(1) })).mutation(async ({ input }: any) => addCollaborator(PUBLIC_USER_ID, input.name)),
    remove: publicProcedure.input(z.number().int()).mutation(async ({ input }: any) => removeCollaborator(input)),
  }),

  settings: router({
    get: publicProcedure.query(async () => (await getSettings(PUBLIC_USER_ID)) || { percentualDiversos: 10, valorFixoSocio: 0 }),
    update: publicProcedure.input(z.object({ percentualDiversos: z.number().optional(), valorFixoSocio: z.number().optional() })).mutation(async ({ input }: any) => updateSettings(PUBLIC_USER_ID, input)),
  }),

  commissions: router({
    getByCollaborator: publicProcedure.input(z.string()).query(async ({ input }: any) => getCommissionsByCollaborator(PUBLIC_USER_ID, input)),
    listAll: publicProcedure.query(async () => {
      const collabs = await getCollaborators(PUBLIC_USER_ID);
      return Promise.all(collabs.map(async (c) => ({ collaborator: c.name, ...(await getCommissionsByCollaborator(PUBLIC_USER_ID, c.name)) })));
    }),
    byMonth: publicProcedure.query(async () => getAllMonthsCommissions(PUBLIC_USER_ID)),
    total: publicProcedure.query(async () => getTotalCommissions(PUBLIC_USER_ID)),
  }),

  importData: router({
    importExcel: publicProcedure
      .input(z.object({
        declarations: z.array(z.any()),
        collaborators: z.array(z.string()),
      }))
      .mutation(async ({ input }: any) => {
        let collaboratorsImported = 0;
        for (const name of input.collaborators) {
          try {
            await addCollaborator(PUBLIC_USER_ID, name);
            collaboratorsImported++;
          } catch {
            // Colaborador já existe, ignora
          }
        }

        let declarationsImported = 0;
        const errors: string[] = [];

        for (const row of input.declarations) {
          try {
            const mappedData = {
              userId: PUBLIC_USER_ID,
              month: row.month as 'Março' | 'Abril' | 'Maio',
              collaborator: row.collaborator,
              cpfCliente: row.cpfCliente || "",
              cliente: row.cliente,
              valorRecebido: Number(row.valorRecebido || 0),
              clienteType: row.clienteType as 'Sócio' | 'Diversos',
              statusPagamento: row.statusPagamento as 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO',
            };

            const comissao = calculateCommission(
              mappedData.valorRecebido,
              mappedData.clienteType,
              mappedData.statusPagamento
            );

            await createDeclaration({ ...mappedData, comissao });
            declarationsImported++;
          } catch (e: any) {
            errors.push(`Erro na linha ${declarationsImported + errors.length + 1}: ${e?.message || 'Erro desconhecido'}`);
          }
        }

        return { success: true, declarationsImported, collaboratorsImported, errors };
      }),
  }),

  quotas: router({
    list: publicProcedure.query(async () => getQuotasByUser(PUBLIC_USER_ID)),
    listByCollaborator: publicProcedure.input(z.string()).query(async ({ input }: any) => getQuotasByCollaborator(PUBLIC_USER_ID, input)),
    create: publicProcedure.input(z.any()).mutation(async ({ input }: any) => createQuota({ ...input, userId: PUBLIC_USER_ID })),
    update: publicProcedure.input(z.any()).mutation(async ({ input }: any) => updateQuota(input.id, input)),
    delete: publicProcedure.input(z.number().int()).mutation(async ({ input }: any) => deleteQuota(input)),
    updateCotasEnviadas: publicProcedure.input(z.any()).mutation(async ({ input }: any) => updateCotasEnviadas(input.quotaId, input.cotasEnviadas)),
  }),

  summary: router({
    getByMonth: publicProcedure.input(z.enum(['Março', 'Abril', 'Maio'])).query(async ({ input }: any) => {
      const decls = await getDeclarationsByMonth(PUBLIC_USER_ID, input);
      return {
        month: input,
        totalQuantity: decls.length,
        totalValue: decls.reduce((s, d) => s + (d.valorRecebido || 0), 0),
        totalCommission: decls.filter(d => d.statusPagamento === 'PAGO').reduce((s, d) => s + (d.comissao || 0), 0),
      };
    }),
    getAll: publicProcedure.query(async () => {
      const mList: ('Março' | 'Abril' | 'Maio')[] = ['Março', 'Abril', 'Maio'];
      return Promise.all(mList.map(async (m) => {
        const decls = await getDeclarationsByMonth(PUBLIC_USER_ID, m);
        return {
          month: m,
          totalQuantity: decls.length,
          totalValue: decls.reduce((s, d) => s + (d.valorRecebido || 0), 0),
          totalCommission: decls.filter(d => d.statusPagamento === 'PAGO').reduce((s, d) => s + (d.comissao || 0), 0),
        };
      }));
    }),
  }),
});

export type AppRouter = typeof appRouter;