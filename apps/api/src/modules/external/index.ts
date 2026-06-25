// External API — público, consumido por parceiros via token Bearer atl_*.
// Separada em 3 camadas por audience:
//   /v1/external/banco/*       (tokens audience=banco)
//   /v1/external/servidor/*    (tokens audience=servidor)
//   /v1/external/averbadora/*  (tokens audience=averbadora)
//
// /v1/external/me — endpoint compartilhado: identifica a camada do token.

import { Hono } from "hono";
import type { Env } from "../../env.js";
import { apiTokenAuth } from "../../middleware/api-token.js";
import { externalBancoRoutes } from "./banco.js";
import { externalServidorRoutes } from "./servidor.js";
import { externalAverbadoraRoutes } from "./averbadora.js";

export const externalRoutes = new Hono<{ Bindings: Env }>()
  .get("/v1/external/me", apiTokenAuth([]), (c) => {
    const t = c.get("apiToken");
    return c.json({
      token_id: t.id,
      name: t.name,
      camada: t.audience,
      partner_id: t.partnerId,
      environment: t.environment,
      scopes: t.scopes,
      base_path: `/v1/external/${t.audience}`,
      created_at: t.createdAt,
      last_used_at: t.lastUsedAt,
    });
  })
  .route("/", externalBancoRoutes)
  .route("/", externalServidorRoutes)
  .route("/", externalAverbadoraRoutes);
