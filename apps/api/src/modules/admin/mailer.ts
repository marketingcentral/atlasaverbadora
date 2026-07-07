// Envio REAL de e-mail a partir do Cloudflare Workers via SMTP.
// Workers não abre socket TCP comum, mas expõe `cloudflare:sockets` (connect +
// startTls), então dá pra falar o protocolo SMTP de verdade com a config que a
// averbadora preenche em /averbadora/configuracoes (host/porta/usuário/senha/TLS).
//
// - porta 465  -> TLS implícito (connect { secure: true })
// - porta 587/25 (secure) -> conecta em claro e sobe STARTTLS
// - AUTH LOGIN (usuário/senha em base64)
//
// sendMail NUNCA lança: retorna { sent, error? }. Assim, se o SMTP não estiver
// configurado ou falhar, o chamador cai no modo teste (código na resposta) sem
// quebrar o fluxo.

import { connect } from "cloudflare:sockets";
import type { Env } from "../../env.js";
import { getSmtpConfigForSend } from "./smtp.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

interface SmtpSocket {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  startTls(): SmtpSocket;
  close(): Promise<void>;
}

class SmtpSession {
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private buf = "";
  constructor(private socket: SmtpSocket) {
    this.writer = socket.writable.getWriter();
    this.reader = socket.readable.getReader();
  }
  async send(line: string): Promise<void> {
    await this.writer.write(enc.encode(line));
  }
  /** Lê uma resposta SMTP completa (última linha no formato "NNN " com espaço). */
  async read(): Promise<{ code: number; text: string }> {
    for (;;) {
      const lines = this.buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i]!)) {
          const resp = lines.slice(0, i + 1);
          this.buf = lines.slice(i + 1).join("\r\n");
          const code = parseInt(resp[resp.length - 1]!.slice(0, 3), 10);
          return { code, text: resp.join("\n") };
        }
      }
      const { value, done } = await this.reader.read();
      if (done) throw new Error("SMTP: conexão encerrada pelo servidor");
      this.buf += dec.decode(value);
    }
  }
  /** Envia comando e valida que a resposta bate o(s) código(s) esperado(s). */
  async cmd(line: string, ...expect: number[]): Promise<{ code: number; text: string }> {
    if (line) await this.send(line);
    const r = await this.read();
    if (expect.length && !expect.includes(r.code)) {
      throw new Error(`SMTP ${r.code} (esperado ${expect.join("/")}): ${r.text.split("\n")[0]}`);
    }
    return r;
  }
  release(): void {
    try { this.writer.releaseLock(); } catch { /* ignore */ }
    try { this.reader.releaseLock(); } catch { /* ignore */ }
  }
}

interface SmtpConfigFull {
  host: string; port: number; user: string; password: string;
  fromEmail: string; fromName: string; secure: boolean;
}

function buildMessage(cfg: SmtpConfigFull, to: string, subject: string, text: string, dateStr: string): string {
  // dot-stuffing: linha iniciada com "." recebe um "." extra (RFC 5321).
  const body = text.replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..");
  const from = cfg.fromName ? `${cfg.fromName} <${cfg.fromEmail}>` : cfg.fromEmail;
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${dateStr}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
}

async function deliver(cfg: SmtpConfigFull, to: string, subject: string, text: string, dateStr: string): Promise<void> {
  const implicitTls = cfg.port === 465;
  // secureTransport: "on" = TLS implícito (465); "starttls" = sobe TLS depois (587);
  // "off" = sem TLS.
  const secureTransport: "on" | "starttls" | "off" = implicitTls ? "on" : cfg.secure ? "starttls" : "off";
  let socket = connect({ hostname: cfg.host, port: cfg.port }, { secureTransport, allowHalfOpen: false }) as unknown as SmtpSocket;
  let s = new SmtpSession(socket);
  try {
    await s.cmd("", 220); // greeting
    await s.cmd(`EHLO atlas.io\r\n`, 250);
    if (!implicitTls && cfg.secure) {
      await s.cmd(`STARTTLS\r\n`, 220);
      s.release();
      socket = socket.startTls();
      s = new SmtpSession(socket);
      await s.cmd(`EHLO atlas.io\r\n`, 250);
    }
    await s.cmd(`AUTH LOGIN\r\n`, 334);
    await s.cmd(`${btoa(cfg.user)}\r\n`, 334);
    await s.cmd(`${btoa(cfg.password)}\r\n`, 235);
    await s.cmd(`MAIL FROM:<${cfg.fromEmail}>\r\n`, 250);
    await s.cmd(`RCPT TO:<${to}>\r\n`, 250, 251);
    await s.cmd(`DATA\r\n`, 354);
    await s.cmd(`${buildMessage(cfg, to, subject, text, dateStr)}\r\n.\r\n`, 250);
    try { await s.cmd(`QUIT\r\n`, 221); } catch { /* alguns servidores fecham antes */ }
  } finally {
    s.release();
    try { await socket.close(); } catch { /* ignore */ }
  }
}

export interface SendResult {
  sent: boolean;
  reason?: string;
}

/**
 * Envia um e-mail via SMTP configurado. Best-effort com timeout: nunca lança.
 * Se o SMTP não estiver configurado, retorna { sent: false, reason: "not_configured" }.
 */
export async function sendMail(
  env: Env,
  mail: { to: string; subject: string; text: string },
): Promise<SendResult> {
  try {
    const cfg = await getSmtpConfigForSend(env);
    if (!cfg || !cfg.host || !cfg.fromEmail) return { sent: false, reason: "not_configured" };
    if (!mail.to) return { sent: false, reason: "no_recipient" };
    const dateStr = new Date().toUTCString().replace("GMT", "+0000");
    // Timeout de guarda: envio de e-mail não pode segurar a request.
    await Promise.race([
      deliver(cfg, mail.to, mail.subject, mail.text, dateStr),
      new Promise((_r, rej) => setTimeout(() => rej(new Error("SMTP timeout (12s)")), 12_000)),
    ]);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "erro" };
  }
}

/**
 * Envia um código de confirmação. O destino é o `notifyEmail` do SMTP (se
 * configurado — útil quando os e-mails dos servidores são fictícios); senão, o
 * `destinoPadrao` (e-mail do próprio usuário). Retorna também o destino real.
 */
export async function enviarCodigo(
  env: Env,
  opts: { destinoPadrao?: string; contexto: string; codigo: string },
): Promise<SendResult & { destino: string }> {
  const cfg = await getSmtpConfigForSend(env);
  const destino = (cfg?.notifyEmail && cfg.notifyEmail.trim()) || opts.destinoPadrao || "";
  if (!destino) return { sent: false, reason: "sem destino", destino: "" };
  const { subject, text } = codigoEmail(opts.codigo, opts.contexto);
  const r = await sendMail(env, { to: destino, subject, text });
  return { ...r, destino };
}

/** E-mail padrão de código de confirmação. */
export function codigoEmail(codigo: string, contexto: string): { subject: string; text: string } {
  return {
    subject: `Atlas — código de confirmação: ${codigo}`,
    text:
      `Seu código de confirmação Atlas é: ${codigo}\n\n` +
      `Use este código para ${contexto}. Ele expira em 10 minutos.\n\n` +
      `Se você não solicitou, ignore este e-mail.\n\n— Atlas Averbadora`,
  };
}
