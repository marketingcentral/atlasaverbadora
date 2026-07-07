// Configuração de e-mail dos códigos de confirmação (2FA, primeiro acesso, OTP).
// Suporta dois provedores:
//  - "smtp"   → servidor SMTP (host/porta/usuário/senha/TLS) via cloudflare:sockets.
//  - "resend" → API HTTP do Resend (uma chave de API, sem senha de app; envia pra
//               qualquer destinatário depois que o remetente/dominio estiver ok).
// Config vive em KV_CACHE ("smtp:config"). Segredos (senha SMTP / chave Resend)
// nunca são devolvidos ao front — só flags hasPassword / hasResendKey.

import type { Env } from "../../env.js";

const KV_KEY = "smtp:config";

export type EmailProvider = "smtp" | "resend";

function assertKv(env: Env): KVNamespace {
  const kv = env.KV_CACHE;
  if (!kv) throw new Error("KV_CACHE binding indisponivel — modulo de e-mail precisa de KV");
  return kv;
}

export interface SmtpConfig {
  provider: EmailProvider;
  // SMTP
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean; // TLS/SSL
  // Resend
  resendApiKey: string;
  // Comuns
  fromEmail: string;
  fromName: string;
  /** Se preenchido, TODOS os códigos de confirmação vão para cá (útil quando os
   *  e-mails dos servidores são fictícios). Vazio = e-mail do próprio usuário. */
  notifyEmail: string;
  updatedAt: string;
}

/** Status seguro (sem segredos) para exibir no front. */
export interface SmtpStatus {
  provider: EmailProvider;
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  notifyEmail: string;
  hasPassword: boolean;
  hasResendKey: boolean;
  configured: boolean;
  updatedAt: string | null;
}

async function readConfig(env: Env): Promise<SmtpConfig | null> {
  const raw = await assertKv(env).get(KV_KEY);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<SmtpConfig>;
    return { provider: "smtp", host: "", port: 587, user: "", password: "", secure: true, resendApiKey: "", fromEmail: "", fromName: "", notifyEmail: "", updatedAt: "", ...c } as SmtpConfig;
  } catch {
    return null;
  }
}

function isConfigured(cfg: SmtpConfig | null): boolean {
  if (!cfg) return false;
  return cfg.provider === "resend" ? !!cfg.resendApiKey : !!cfg.host;
}

export async function getSmtpStatus(env: Env): Promise<SmtpStatus> {
  const cfg = await readConfig(env);
  return {
    provider: cfg?.provider ?? "smtp",
    host: cfg?.host ?? "",
    port: cfg?.port ?? 587,
    user: cfg?.user ?? "",
    fromEmail: cfg?.fromEmail ?? "",
    fromName: cfg?.fromName ?? "",
    secure: cfg?.secure ?? true,
    notifyEmail: cfg?.notifyEmail ?? "",
    hasPassword: !!cfg?.password,
    hasResendKey: !!cfg?.resendApiKey,
    configured: isConfigured(cfg),
    updatedAt: cfg?.updatedAt ?? null,
  };
}

export interface SmtpInput {
  provider?: EmailProvider;
  host?: string;
  port?: number;
  user?: string;
  password?: string; // vazio = mantém a senha atual
  secure?: boolean;
  resendApiKey?: string; // vazio = mantém a chave atual
  fromEmail?: string;
  fromName?: string;
  notifyEmail?: string;
}

export async function setSmtpConfig(env: Env, input: SmtpInput): Promise<SmtpStatus> {
  const current = await readConfig(env);
  const cfg: SmtpConfig = {
    provider: input.provider ?? current?.provider ?? "smtp",
    host: (input.host ?? current?.host ?? "").trim(),
    port: input.port ?? current?.port ?? 587,
    user: (input.user ?? current?.user ?? "").trim(),
    // Segredo em branco no PUT = mantém o atual (não obriga re-digitar).
    password: input.password && input.password.length > 0 ? input.password : current?.password ?? "",
    secure: input.secure ?? current?.secure ?? true,
    resendApiKey: input.resendApiKey && input.resendApiKey.length > 0 ? input.resendApiKey.trim() : current?.resendApiKey ?? "",
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

/** Config COMPLETA (com segredos) — uso interno do mailer para enviar. */
export async function getSmtpConfigForSend(env: Env): Promise<SmtpConfig | null> {
  const cfg = await readConfig(env);
  return isConfigured(cfg) ? cfg : null;
}
