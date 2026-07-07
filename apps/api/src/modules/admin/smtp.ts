// Módulo SMTP — configuração do servidor de e-mail usado para enviar os e-mails
// de confirmação (2FA, primeiro acesso, OTP). Mesma abordagem do módulo IA: a
// config vive em KV_CACHE sob "smtp:config". A senha nunca é devolvida ao front
// (só um flag hasPassword). O envio real usa um provedor HTTP (ex.: MailChannels/
// Resend) — aqui guardamos a configuração; o wiring do envio é separado.

import type { Env } from "../../env.js";

const KV_KEY = "smtp:config";

function assertKv(env: Env): KVNamespace {
  const kv = env.KV_CACHE;
  if (!kv) throw new Error("KV_CACHE binding indisponivel — modulo SMTP precisa de KV");
  return kv;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  secure: boolean; // TLS/SSL
  /** Se preenchido, TODOS os e-mails de código de confirmação vão para cá (útil
   *  quando os e-mails dos servidores são fictícios). Vazio = e-mail do próprio usuário. */
  notifyEmail: string;
  updatedAt: string;
}

/** Status seguro (sem a senha) para exibir no front. */
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
    return JSON.parse(raw) as SmtpConfig;
  } catch {
    return null;
  }
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
    configured: !!cfg?.host,
    updatedAt: cfg?.updatedAt ?? null,
  };
}

export interface SmtpInput {
  host: string;
  port: number;
  user: string;
  password?: string; // opcional: se ausente, mantém a senha atual
  fromEmail: string;
  fromName?: string;
  secure?: boolean;
  notifyEmail?: string;
}

export async function setSmtpConfig(env: Env, input: SmtpInput): Promise<SmtpStatus> {
  const current = await readConfig(env);
  const cfg: SmtpConfig = {
    host: input.host.trim(),
    port: input.port,
    user: input.user.trim(),
    // Senha em branco no PUT = mantém a atual (não obriga re-digitar).
    password: input.password && input.password.length > 0 ? input.password : current?.password ?? "",
    fromEmail: input.fromEmail.trim(),
    fromName: (input.fromName ?? current?.fromName ?? "Atlas Averbadora").trim(),
    secure: input.secure ?? current?.secure ?? true,
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
  return cfg && cfg.host ? cfg : null;
}
