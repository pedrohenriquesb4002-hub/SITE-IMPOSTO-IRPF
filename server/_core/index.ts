import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";
import { users, settings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Garante que o usuário público (id=1) e as configurações existem no banco
async function initPublicUser() {
  try {
    const db = await getDb();
    if (!db) return;

    // Criar usuário público se não existir
    const existing = await db.select().from(users).where(eq(users.id, 1)).limit(1);
    if (existing.length === 0) {
      await db.execute(
        `INSERT INTO users (id, "openId", name, role, "createdAt", "updatedAt", "lastSignedIn")
         VALUES (1, 'public-user', 'Painel Público', 'admin', NOW(), NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`
      );
      console.log('[Init] Usuário público criado (id=1)');
    }

    // Criar configurações padrão se não existir
    const existingSettings = await db.select().from(settings).where(eq(settings.userId, 1)).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(settings).values({
        userId: 1,
        percentualDiversos: 10,
        valorFixoSocio: 500,
      });
      console.log('[Init] Configurações padrão criadas');
    }
  } catch (e) {
    console.warn('[Init] Aviso ao inicializar usuário público:', e);
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Inicializar usuário público e configurações
  await initPublicUser();

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
