// Configuração SMTP para envio dos códigos de confirmação (2FA, primeiro acesso, OTP).
// Fala SMTP nativo via cloudflare:sockets (host/porta/usuário/senha/TLS) — sem serviço
// externo, sem custo. Config vive em KV_CACHE ("smtp:config"). A senha nunca é devolvida
// ao front — só a flag `hasPassword`.

import type { Env } from "../../env.js";

const KV_KEY = "smtp:config";

function assertKv(env: Env): KVNamespace {
  const kv = env.KV_CACHE;
  if (!kv) throw new Error("KV_CACHE binding indisponivel — modulo de e-mail precisa de KV");
  return kv;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean; // TLS/SSL
  fromEmail: string;
  fromName: string;
  /** Se preenchido, TODOS os códigos de confirmação vão para cá (útil quando os
   *  e-mails dos servidores são fictícios). Vazio = e-mail do próprio usuário. */
  notifyEmail: string;
  updatedAt: string;
}

/** Status seguro (sem segredos) para exibir no front. */
export interface SmtpStatus {
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  notifyEmail: string;
  hasPassword: boolean;
  configured: boolean;
  updatedAt: string | null;
}

async function readConfig(env: Env): Promise<SmtpConfig | null> {
  const raw = await assertKv(env).get(KV_KEY);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<SmtpConfig>;
    return { host: "", port: 587, user: "", password: "", secure: true, fromEmail: "", fromName: "", notifyEmail: "", updatedAt: "", ...c } as SmtpConfig;
  } catch {
    return null;
  }
}

function isConfigured(cfg: SmtpConfig | null): boolean {
  return !!(cfg && cfg.host && cfg.password);
}

export async function getSmtpStatus(env: Env): Promise<SmtpStatus> {
  const cfg = await readConfig(env);
  return {
    host: cfg?.host ?? "",
    port: cfg?.port ?? 587,
    user: cfg?.user ?? "",
    fromEmail: cfg?.fromEmail ?? "",
    fromName: cfg?.fromName ?? "",
    secure: cfg?.secure ?? true,
    notifyEmail: cfg?.notifyEmail ?? "",
    hasPassword: !!cfg?.password,
    configured: isConfigured(cfg),
    updatedAt: cfg?.updatedAt ?? null,
  };
}

export interface SmtpInput {
  host?: string;
  port?: number;
  user?: string;
  password?: string; // vazio = mantém a senha atual
  secure?: boolean;
  fromEmail?: string;
  fromName?: string;
  notifyEmail?: string;
}

export async function setSmtpConfig(env: Env, input: SmtpInput): Promise<SmtpStatus> {
  const current = await readConfig(env);
  const cfg: SmtpConfig = {
    host: (input.host ?? current?.host ?? "").trim(),
    port: input.port ?? current?.port ?? 587,
    user: (input.user ?? current?.user ?? "").trim(),
    // Segredo em branco no PUT = mantém a senha atual (não obriga re-digitar).
    password: input.password && input.password.length > 0 ? input.password : current?.password ?? "",
    secure: input.secure ?? current?.secure ?? true,
    fromEmail: (input.fromEmail ?? current?.fromEmail ?? "").trim(),
    fromName: (input.fromName ?? current?.fromName ?? "Atlas Averbadora").trim(),
    notifyEmail: (input.notifyEmail ?? current?.notifyEmail ?? "").trim(),
    updatedAt: new Date().toISOString(),
  };
  await assertKv(env).put(KV_KEY, JSON.stringify(cfg));
  return getSmtpStatus(env);
}

export async function clearSmtpConfig(env: Env): Promise<void> {
  await assertKv(env).delete(KV_KEY);
}

/** Config COMPLETA (com senha) — uso interno do mailer para enviar. */
export async function getSmtpConfigForSend(env: Env): Promise<SmtpConfig | null> {
  const cfg = await readConfig(env);
  return isConfigured(cfg) ? cfg : null;
}
