import { Hono } from "hono";
import { authRoutes } from "./modules/auth/index.js";
import { healthRoutes } from "./modules/health/index.js";
import { servidoresRoutes } from "./modules/servidores/index.js";
import { portalBancoRoutes } from "./modules/portal-banco/index.js";
import { adminRoutes, csvTemplateRoutes, ensureBancosLoaded, ensureServidoresLoaded } from "./modules/admin/index.js";
import { ensureTombamentoLoaded } from "./modules/admin/tombamento.js";
import { externalRoutes } from "./modules/external/index.js";
import { prefeituraRoutes, prefeituraPublicRoutes } from "./modules/prefeitura/index.js";
import { errorHandler } from "./middleware/error.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { corsMiddleware } from "./middleware/cors.js";
import { rateLimit } from "./middleware/rate-limit.js";
import type { Env } from "./env.js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", corsMiddleware);
app.use("*", loggerMiddleware);
app.onError(errorHandler);

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
    ensureTombamentoLoaded(c.env).catch(() => undefined),
  ]);
  await next();
});
app.route("/", authRoutes);
app.route("/", servidoresRoutes);
app.route("/", portalBancoRoutes);
app.route("/", adminRoutes);
app.route("/", prefeituraRoutes);
app.route("/", externalRoutes);

app.notFound((c) => c.json({ error: { code: "not_found", message: "Rota nao encontrada" } }, 404));

export default app;
