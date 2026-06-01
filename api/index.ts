import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      // Loga o erro real no servidor para debug
      console.error(`[tRPC Error] /${path}:`, error);
    },
  })
);

// Fallback: captura erros não tratados e retorna JSON válido
// (evita o "A server e... is not valid JSON" no cliente)
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Unhandled Error]", err);
    res.status(500).json({ error: "Internal server error", message: err?.message });
  }
);

export default app;