import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Intercepta qualquer resposta que o Express tente enviar como texto puro
// e converte para JSON — evita o "A server e... is not valid JSON" no cliente
app.use((req, res, next) => {
  const originalSend = res.send.bind(res);
  res.send = function (body: any) {
    if (typeof body === "string" && !res.headersSent) {
      const ct = res.getHeader("content-type");
      const isJson = typeof ct === "string" && ct.includes("application/json");
      if (!isJson) {
        res.setHeader("content-type", "application/json");
        return originalSend(JSON.stringify({ error: body }));
      }
    }
    return originalSend(body);
  };
  next();
});

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[tRPC Error] /${path}:`, error);
    },
  })
);

// Fallback: captura erros não tratados e retorna JSON válido
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Unhandled Error]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", message: err?.message });
    }
  }
);

export default app;