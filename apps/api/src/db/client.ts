import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import type { Env } from "../env.js";

export type Db = PostgresJsDatabase<typeof schema>;

// Cache só faz sentido para DATABASE_URL direto (dev local). Com Hyperdrive,
// o pool/cache vive no edge da Cloudflare e cachear local introduz bugs de
// conexão "stale" — recomendação oficial é criar por request.
let cachedDirect: { url: string; db: Db; client: postgres.Sql } | null = null;

/**
 * Returns a Drizzle client connected to Postgres.
 *  1. `env.HYPERDRIVE` binding (prod / preview) — nova conexão por request (Hyperdrive faz o pool no edge)
 *  2. `env.DATABASE_URL` (local dev) — conexão cacheada por isolate
 */
export function getDb(env: Env): Db {
  if (env.HYPERDRIVE) {
    const client = postgres(env.HYPERDRIVE.connectionString, {
      max: 5,
      fetch_types: false,
      prepare: false,
    });
    return drizzle(client, { schema });
  }
  const url = env.DATABASE_URL;
  if (!url) throw new Error("missing_database_url");
  if (cachedDirect && cachedDirect.url === url) return cachedDirect.db;
  const client = postgres(url, { max: 1, fetch_types: false, prepare: false, idle_timeout: 20 });
  const db = drizzle(client, { schema });
  cachedDirect = { url, db, client };
  return db;
}

export async function closeDb(): Promise<void> {
  if (!cachedDirect) return;
  await cachedDirect.client.end({ timeout: 5 });
  cachedDirect = null;
}
