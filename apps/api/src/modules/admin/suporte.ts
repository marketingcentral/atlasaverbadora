// Configuracao das informacoes de suporte exibidas ao servidor (Conta > Suporte).
// Averbadora edita em /averbadora/suporte; servidor le via /me/suporte.
// Vive no KV_CACHE ("suporte:config"). Editar sem redeploy.

import type { Env } from "../../env.js";

const KV_KEY = "suporte:config";

function assertKv(env: Env): KVNamespace {
  const kv = env.KV_CACHE;
  if (!kv) throw new Error("KV_CACHE binding indisponivel — modulo de suporte precisa de KV");
  return kv;
}

export interface SuporteConfig {
  /** Ex.: "suporte@atlasaverbadora.com.br" */
  email: string;
  /** So digitos com DDI+DDD, ex.: "5511999999999". Vazio = esconde o item. */
  whatsapp: string;
  /** Ex.: "segunda a sexta, 09h as 18h" — livre. */
  horario: string;
  /** Frase de abertura ("Fale com a gente:"). Editavel pra cliente adaptar tom. */
  mensagem: string;
  updatedAt: string;
}

const DEFAULT: SuporteConfig = {
  email: "suporte@atlasaverbadora.com.br",
  whatsapp: "5511999999999",
  horario: "segunda a sexta, 09h às 18h",
  mensagem: "Fale com a gente:",
  updatedAt: new Date(0).toISOString(),
};

export async function getSuporteConfig(env: Env): Promise<SuporteConfig> {
  const raw = await assertKv(env).get(KV_KEY, "json");
  if (!raw || typeof raw !== "object") return DEFAULT;
  const c = raw as Partial<SuporteConfig>;
  return {
    email: (c.email ?? DEFAULT.email).trim(),
    whatsapp: (c.whatsapp ?? DEFAULT.whatsapp).replace(/\D/g, ""),
    horario: (c.horario ?? DEFAULT.horario).trim(),
    mensagem: (c.mensagem ?? DEFAULT.mensagem).trim(),
    updatedAt: c.updatedAt ?? DEFAULT.updatedAt,
  };
}

export async function setSuporteConfig(env: Env, patch: Partial<Omit<SuporteConfig, "updatedAt">>): Promise<SuporteConfig> {
  const atual = await getSuporteConfig(env);
  const proximo: SuporteConfig = {
    email: (patch.email ?? atual.email).trim(),
    whatsapp: (patch.whatsapp ?? atual.whatsapp).replace(/\D/g, ""),
    horario: (patch.horario ?? atual.horario).trim(),
    mensagem: (patch.mensagem ?? atual.mensagem).trim(),
    updatedAt: new Date().toISOString(),
  };
  await assertKv(env).put(KV_KEY, JSON.stringify(proximo));
  return proximo;
}
