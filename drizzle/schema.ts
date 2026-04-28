import { pgTable, serial, text, integer, timestamp, varchar, pgEnum, index, unique } from "drizzle-orm/pg-core";

// Definição dos Enums para o PostgreSQL
export const monthEnum = pgEnum('month', ['Março', 'Abril', 'Maio']);
export const clienteTypeEnum = pgEnum('clienteType', ['Sócio', 'Diversos']);
export const statusPagamentoEnum = pgEnum('statusPagamento', ['PAGO', 'AGUARDANDO', 'DOAÇÃO']);
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const meioEnvioEnum = pgEnum('meioEnvio', ['WhatsApp', 'Email', 'SMS', 'Presencial', 'Outro']);

/**
 * Tabela de Usuários
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de Declarações
 */
export const declarations = pgTable('declarations', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull().references(() => users.id),
  month: monthEnum('month').notNull(),
  collaborator: varchar('collaborator', { length: 255 }).notNull(),
  cpfCliente: varchar('cpfCliente', { length: 20 }),
  cliente: varchar('cliente', { length: 255 }).notNull(),
  valorRecebido: integer('valorRecebido').notNull(),
  clienteType: clienteTypeEnum('clienteType').notNull(),
  comissao: integer('comissao'),
  statusPagamento: statusPagamentoEnum('statusPagamento').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  idxUserMonth: index('idx_user_month').on(table.userId, table.month),
  idxUserCollaborator: index('idx_user_collaborator').on(table.userId, table.collaborator),
  idxUserStatus: index('idx_user_status').on(table.userId, table.statusPagamento),
}));

export type Declaration = typeof declarations.$inferSelect;
export type InsertDeclaration = typeof declarations.$inferInsert;

/**
 * Tabela de Colaboradores
 */
export const collaborators = pgTable('collaborators', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  uniqueUserCollaborator: unique().on(table.userId, table.name),
}));

/**
 * Tabela de Configurações
 */
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull().references(() => users.id).unique(),
  percentualDiversos: integer('percentualDiversos').notNull().default(10),
  valorFixoSocio: integer('valorFixoSocio').notNull().default(500),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

/**
 * Tabela de Cotas
 */
export const quotas = pgTable('quotas', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull().references(() => users.id),
  collaborator: varchar('collaborator', { length: 255 }).notNull(),
  cliente: varchar('cliente', { length: 255 }).notNull(),
  quantidadeCotas: integer('quantidadeCotas').notNull(),
  cotasEnviadas: integer('cotasEnviadas').notNull().default(0),
  meioEnvio: meioEnvioEnum('meioEnvio').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  idxUserCollaborator: index('idx_quotas_user_collaborator').on(table.userId, table.collaborator),
}));

/**
 * Rastreio de Cotas
 */
export const quotaTracking = pgTable('quotaTracking', {
  id: serial('id').primaryKey(),
  quotaId: integer('quotaId').notNull().references(() => quotas.id),
  cotaNumero: integer('cotaNumero').notNull(),
  dataEnvio: timestamp('dataEnvio').defaultNow().notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  idxQuotaId: index('idx_quota_tracking_quota_id').on(table.quotaId),
}));