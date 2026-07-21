import { Hono } from "hono";
import { authRoutes } from "./modules/auth/index.js";
import { meRoutes } from "./modules/me/index.js";
import { healthRoutes } from "./modules/health/index.js";
import { servidoresRoutes } from "./modules/servidores/index.js";
import { portalBancoRoutes } from "./modules/portal-banco/index.js";
import { adminRoutes, csvTemplateRoutes, ensureBancosLoaded, ensureServidoresLoaded, ensurePerfisLoaded, ensureFolhasLoaded, logMutacaoPersistido } from "./modules/admin/index.js";
import { ensureTombamentoLoaded } from "./modules/admin/tombamento.js";
import { ensureContratosLoaded } from "./modules/portal-banco/store.js";
import type { JwtClaims } from "./middleware/auth.js";
import { externalRoutes } from "./modules/external/index.js";
import { confirmacaoRoutes } from "./modules/confirmacao/index.js";
import { prefeituraRoutes, prefeituraPublicRoutes } from "./modules/prefeitura/index.js";
import { errorHandler } from "./middleware/error.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { corsMiddleware } from "./middleware/cors.js";
import { rateLimit } from "./middleware/rate-limit.js";
import type { Env } from "./env.js";

const app = new Hono<{ Bindings: Env; Variables: { jwt?: JwtClaims } }>();

app.use("*", corsMiddleware);
app.use("*", loggerMiddleware);
app.onError(errorHandler);

// Log de auditoria operacional: registra TODA mutação (POST/PATCH/DELETE) no log
// do perfil que a fez (averbadora/banco/prefeitura/servidor). Roda após o handler
// (o jwt já foi resolvido pela rota) — garante que cada alteração apareça no log.
app.use("/v1/*", async (c, next) => {
  await next();
  const m = c.req.method;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return;
  const path = new URL(c.req.url).pathname;
  if (path.startsWith("/v1/auth/")) return; // login/refresh/logout não são alteração de dado
  // Persiste no log compartilhado (app_logs) via waitUntil — a alteração aparece
  // no GET /logs mesmo que ele caia em outro isolate. Nunca quebra a request.
  try { logMutacaoPersistido(c.env, c.executionCtx?.waitUntil?.bind(c.executionCtx), c.get("jwt")?.role, m, path, (c.res?.status ?? 200) < 400); } catch { /* fail-safe */ }
});

app.route("/", healthRoutes);
// Public CSV templates: must be mounted BEFORE the rate-limited / authenticated areas.
app.route("/", csvTemplateRoutes);
app.route("/", prefeituraPublicRoutes);
app.use("/v1/*", rateLimit({ scope: "global", max: 600, perSeconds: 60 }));
// Hidrata os stores persistidos (bancos) do Postgres uma vez por isolate. Fail-safe:
// se o banco estiver indisponível, segue com as fixtures em memória.
app.use("/v1/*", async (c, next) => {
  // ensureServidoresLoaded encadeia prefeituras (FK) antes de servidores.
  await Promise.all([
    ensureBancosLoaded(c.env).catch(() => undefined),
    ensureServidoresLoaded(c.env).catch(() => undefined),
    ensurePerfisLoaded(c.env).catch(() => undefined),
    ensureFolhasLoaded(c.env).catch(() => undefined),
    ensureTombamentoLoaded(c.env).catch(() => undefined),
    ensureContratosLoaded(c.env).catch(() => undefined),
  ]);
  await next();
});
app.route("/", authRoutes);
app.route("/", meRoutes);
app.route("/", servidoresRoutes);
app.route("/", portalBancoRoutes);
app.route("/", adminRoutes);
app.route("/", prefeituraRoutes);
app.route("/", confirmacaoRoutes);
app.route("/", externalRoutes);

app.notFound((c) => c.json({ error: { code: "not_found", message: "Rota nao encontrada" } }, 404));

export default app;
