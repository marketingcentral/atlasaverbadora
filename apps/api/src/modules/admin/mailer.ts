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

// dot-stuffing: linha iniciada com "." recebe um "." extra (RFC 5321).
const dotStuff = (s: string) => s.replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..");

function buildMessage(cfg: SmtpConfigFull, to: string, subject: string, text: string, dateStr: string, html?: string): string {
  const from = cfg.fromName ? `${cfg.fromName} <${cfg.fromEmail}>` : cfg.fromEmail;
  const headers = [`From: ${from}`, `To: ${to}`, `Subject: ${subject}`, `Date: ${dateStr}`, "MIME-Version: 1.0"];
  if (html) {
    // multipart/alternative: cliente escolhe HTML (com o rodapé/logo Atlas) ou texto puro.
    const boundary = "atlas_alt_boundary_2026";
    return [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      dotStuff(text),
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      dotStuff(html),
      "",
      `--${boundary}--`,
    ].join("\r\n");
  }
  return [...headers, 'Content-Type: text/plain; charset="utf-8"', "Content-Transfer-Encoding: 8bit", "", dotStuff(text)].join("\r\n");
}

async function deliver(cfg: SmtpConfigFull, to: string, subject: string, text: string, dateStr: string, html?: string): Promise<void> {
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
    await s.cmd(`${buildMessage(cfg, to, subject, text, dateStr, html)}\r\n.\r\n`, 250);
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
  mail: { to: string; subject: string; text: string; html?: string },
): Promise<SendResult> {
  try {
    const cfg = await getSmtpConfigForSend(env);
    if (!cfg) return { sent: false, reason: "not_configured" };
    if (!mail.to) return { sent: false, reason: "no_recipient" };
    if (!cfg.host || !cfg.fromEmail) return { sent: false, reason: "not_configured" };
    const dateStr = new Date().toUTCString().replace("GMT", "+0000");
    // Timeout de guarda: envio de e-mail não pode segurar a request.
    await Promise.race([
      deliver(cfg, mail.to, mail.subject, mail.text, dateStr, mail.html),
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
  opts: {
    destinoPadrao?: string;
    contexto: string;
    codigo: string;
    /** true (padrao) = notifyEmail global ganha do destinoPadrao — util pra testar
     *  perfis admin (banco/prefeitura/averbadora) com contas ficticias.
     *  false = manda DIRETO pro destinoPadrao (fluxos de servidor: primeiro-acesso,
     *  esqueci-senha, editar contato — o proprio dono da conta e quem tem que receber). */
    respeitaOverride?: boolean;
    /** Se presente, tenta primeiro o template editavel em /averbadora/emails/*.
     *  Se nao houver template ativo com esse filtro, cai no email hardcoded acima. */
    templateFiltro?: Parameters<typeof dispatchTemplateEmail>[1];
    /** Vars extras para o template (codigo ja e mesclado automaticamente). */
    templateVars?: Record<string, string>;
    /** Nome amigavel do destinatario (usado como {{nome}} se templateVars nao trouxer). */
    nome?: string;
  },
): Promise<SendResult & { destino: string }> {
  const cfg = await getSmtpConfigForSend(env);
  const notify = (cfg?.notifyEmail ?? "").trim();
  const padrao = (opts.destinoPadrao ?? "").trim();
  const respeita = opts.respeitaOverride ?? true;
  const destino = respeita ? (notify || padrao) : (padrao || notify);
  if (!destino) return { sent: false, reason: "sem destino", destino: "" };
  // Tenta template editavel primeiro (se filtro fornecido).
  if (opts.templateFiltro) {
    const vars = { codigo: opts.codigo, nome: opts.nome ?? "", ...(opts.templateVars ?? {}) };
    const r = await dispatchTemplateEmail(env, opts.templateFiltro, destino, vars);
    if (r.usouTemplate) return { sent: r.sent, reason: r.reason, destino };
  }
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

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);

/** Rodapé HTML com a marca Atlas (wordmark + tagline). Renderiza em qualquer cliente. */
function atlasFooter(): string {
  return (
    `<div style="margin-top:32px;padding-top:20px;border-top:1px solid #E7E5E0;text-align:center">` +
    `<div style="font-size:24px;font-weight:800;letter-spacing:8px;color:#16181C">ATLAS</div>` +
    `<div style="display:inline-block;font-size:11px;letter-spacing:5px;color:#6B7078;margin-top:2px;border-top:1px solid #E7E5E0;padding-top:4px">AVERBADORA</div>` +
    `<div style="font-size:12px;color:#6B7078;margin-top:12px">Empréstimo consignado público — direto da sua margem.</div>` +
    `<div style="font-size:11px;color:#9aa0a8;margin-top:8px">Este é um e-mail automático de notificação. Por favor, não responda.</div>` +
    `</div>`
  );
}

/** E-mail de movimentação de proposta/contrato (in-app + este e-mail vêm da mesma ação). */
export function movimentacaoEmail(
  titulo: string,
  mensagem: string,
  detalhes: { label: string; valor: string }[] = [],
): { subject: string; text: string; html: string } {
  const linhasTexto = detalhes.map((d) => `  ${d.label}: ${d.valor}`).join("\n");
  const text =
    `${titulo}\n\n${mensagem}\n\n` +
    (detalhes.length ? `${linhasTexto}\n\n` : "") +
    `Acompanhe pelo app Atlas Servidor.\n\n— Atlas Averbadora`;
  const linhasHtml = detalhes
    .map(
      (d) =>
        `<tr><td style="padding:4px 0;color:#6B7078;font-size:13px">${esc(d.label)}</td>` +
        `<td style="padding:4px 0;color:#16181C;font-size:13px;font-weight:600;text-align:right">${esc(d.valor)}</td></tr>`,
    )
    .join("");
  // Quebra em várias linhas (cada uma < 998 chars — limite SMTP RFC 5321). HTML ignora
  // o whitespace entre as tags, então é seguro juntar com \r\n.
  const html = [
    `<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F6F5F2;padding:24px;border-radius:16px">`,
    `<div style="background:#12936A;color:#fff;padding:14px 20px;border-radius:12px 12px 0 0;font-weight:800;font-size:15px">Atlas — atualização da sua solicitação</div>`,
    `<div style="background:#fff;padding:22px 20px;border-radius:0 0 12px 12px;border:1px solid #E7E5E0;border-top:0">`,
    `<div style="font-size:18px;font-weight:800;color:#16181C">${esc(titulo)}</div>`,
    `<div style="font-size:14px;color:#3a3f47;margin-top:8px;line-height:1.5">${esc(mensagem)}</div>`,
    detalhes.length
      ? `<table style="width:100%;margin-top:16px;border-top:1px solid #E7E5E0;padding-top:8px">${linhasHtml}</table>`
      : "",
    `</div>`,
    atlasFooter(),
    `</div>`,
  ].join("\r\n");
  return { subject: `Atlas — ${titulo}`, text, html };
}

/**
 * Envia uma notificação de movimentação por e-mail. Mesmo esquema de destino do
 * `enviarCodigo`: usa o `notifyEmail` global se configurado (override de teste),
 * senão o e-mail real do servidor (`destinoPadrao`). Best-effort — nunca lança.
 */
export async function enviarNotificacao(
  env: Env,
  opts: { destinoPadrao?: string; titulo: string; mensagem: string; detalhes?: { label: string; valor: string }[] },
): Promise<SendResult & { destino: string }> {
  const cfg = await getSmtpConfigForSend(env);
  const destino = (cfg?.notifyEmail ?? "").trim() || (opts.destinoPadrao ?? "").trim();
  if (!destino) return { sent: false, reason: "sem destino", destino: "" };
  const { subject, text, html } = movimentacaoEmail(opts.titulo, opts.mensagem, opts.detalhes ?? []);
  const r = await sendMail(env, { to: destino, subject, text, html });
  return { ...r, destino };
}

/**
 * Envia e-mail via TEMPLATE editavel do consultor (/averbadora/emails). O
 * chamador passa o filtro (evento + publico + eventuais subtipos) e as
 * variaveis pra substituicao. Se nao houver template ATIVO que case, o
 * chamador deve cair pro texto hardcoded (helper retorna { sent: false,
 * reason: "no_template" } — nunca lança).
 *
 * Sempre manda DIRETO pro destinatario passado (nao usa o override
 * notifyEmail global — esse override e' so pra codigos de teste).
 */
export async function dispatchTemplateEmail(
  env: Env,
  filtro: {
    evento: "primeiro_acesso" | "recuperar_senha" | "redefinir_senha" | "simulacao" | "beneficio";
    publico: "servidor" | "banco" | "prefeitura" | "averbadora";
    simulacaoTipo?: "emprestimo" | "cartao_consignado" | "cartao_beneficio" | "portabilidade";
    simulacaoStatus?: "enviada" | "aprovada" | "recusada" | "averbada";
    beneficioId?: string;
  },
  destino: string,
  vars: Record<string, string>,
): Promise<SendResult & { destino: string; usouTemplate: boolean }> {
  if (!destino) return { sent: false, reason: "no_recipient", destino: "", usouTemplate: false };
  // Import lazy pra evitar ciclo (mailer <-> email-templates via admin index).
  const { findTemplate, renderTemplate } = await import("./email-templates.js");
  const t = await findTemplate(env, filtro);
  if (!t) return { sent: false, reason: "no_template", destino, usouTemplate: false };
  const { assunto, corpo } = renderTemplate(t, vars);
  const { subject, text, html } = movimentacaoEmail(assunto, corpo, [
    { label: "Template", valor: `${t.nome} (${t.id})` },
  ]);
  const r = await sendMail(env, { to: destino, subject, text, html });
  return { ...r, destino, usouTemplate: true };
}
