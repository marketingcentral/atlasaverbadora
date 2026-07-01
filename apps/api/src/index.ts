import { Hono } from "hono";
import { authRoutes } from "./modules/auth/index.js";
import { healthRoutes } from "./modules/health/index.js";
import { servidoresRoutes } from "./modules/servidores/index.js";
import { portalBancoRoutes } from "./modules/portal-banco/index.js";
import { adminRoutes, csvTemplateRoutes } from "./modules/admin/index.js";
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
app.route("/", authRoutes);
app.route("/", servidoresRoutes);
app.route("/", portalBancoRoutes);
app.route("/", adminRoutes);
app.route("/", prefeituraRoutes);
app.route("/", externalRoutes);

app.notFound((c) => c.json({ error: { code: "not_found", message: "Rota nao encontrada" } }, 404));

export default app;
