-- ============================================================
-- SQL para Neon (PostgreSQL)
-- Sistema IRPF/ITR - Execute este SQL no seu projeto Neon
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE month AS ENUM ('Março', 'Abril', 'Maio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "itrMonth" AS ENUM ('Agosto', 'Setembro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "clienteType" AS ENUM ('Sócio', 'Diversos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "statusPagamento" AS ENUM ('PAGO', 'AGUARDANDO', 'DOAÇÃO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "meioEnvio" AS ENUM ('WhatsApp', 'Email', 'SMS', 'Presencial', 'Outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de usuários (login)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name TEXT,
  email VARCHAR(320),
  role role DEFAULT 'user' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastSignedIn" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Declarações IRPF
CREATE TABLE IF NOT EXISTS declarations (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  month month NOT NULL,
  collaborator VARCHAR(255) NOT NULL,
  "cpfCliente" VARCHAR(30),
  cliente VARCHAR(255) NOT NULL,
  "valorRecebido" INTEGER NOT NULL,
  "clienteType" "clienteType" NOT NULL,
  comissao INTEGER,
  "statusPagamento" "statusPagamento" NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_month ON declarations("userId", month);
CREATE INDEX IF NOT EXISTS idx_user_collaborator ON declarations("userId", collaborator);
CREATE INDEX IF NOT EXISTS idx_user_status ON declarations("userId", "statusPagamento");

-- Declarações ITR
CREATE TABLE IF NOT EXISTS "itrDeclarations" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  month "itrMonth" NOT NULL,
  collaborator VARCHAR(255) NOT NULL,
  "cpfCliente" VARCHAR(30),
  cliente VARCHAR(255) NOT NULL,
  "valorRecebido" INTEGER NOT NULL,
  "clienteType" "clienteType" NOT NULL,
  comissao INTEGER,
  "statusPagamento" "statusPagamento" NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_itr_user_month ON "itrDeclarations"("userId", month);
CREATE INDEX IF NOT EXISTS idx_itr_user_collaborator ON "itrDeclarations"("userId", collaborator);
CREATE INDEX IF NOT EXISTS idx_itr_user_status ON "itrDeclarations"("userId", "statusPagamento");

-- Colaboradores
CREATE TABLE IF NOT EXISTS collaborators (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_collaborator_user_name UNIQUE("userId", name)
);

-- Configurações de comissão
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  "percentualDiversos" INTEGER NOT NULL DEFAULT 10,
  "valorFixoSocio" INTEGER NOT NULL DEFAULT 500,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Quotas
CREATE TABLE IF NOT EXISTS quotas (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  collaborator VARCHAR(255) NOT NULL,
  cliente VARCHAR(255) NOT NULL,
  "quantidadeCotas" INTEGER NOT NULL,
  "cotasEnviadas" INTEGER NOT NULL DEFAULT 0,
  "meioEnvio" "meioEnvio" NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quotas_user_collaborator ON quotas("userId", collaborator);

-- Rastreio de Quotas
CREATE TABLE IF NOT EXISTS "quotaTracking" (
  id SERIAL PRIMARY KEY,
  "quotaId" INTEGER NOT NULL REFERENCES quotas(id) ON DELETE CASCADE,
  "cotaNumero" INTEGER NOT NULL,
  "dataEnvio" TIMESTAMP DEFAULT NOW() NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quota_tracking_quota_id ON "quotaTracking"("quotaId");

-- Sessions (para autenticação JWT não precisamos, mas guardamos refresh info)
-- Insira o primeiro usuário admin depois de rodar o sistema:
-- O hash abaixo é bcrypt de 'admin123' - TROQUE A SENHA DEPOIS!
-- INSERT INTO users (username, password_hash, name, email, role)
-- VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgC2OQ6G1S4kX1kGSqQfma', 'Administrador', 'admin@sistema.com', 'admin');

-- ============================================================
-- Para criar seu usuário admin, rode no terminal após subir:
-- curl -X POST https://SEU-SITE.vercel.app/api/auth/register \
--   -H "Content-Type: application/json" \
--   -d '{"username":"admin","password":"SUA_SENHA_AQUI","name":"Administrador"}'
-- ============================================================
