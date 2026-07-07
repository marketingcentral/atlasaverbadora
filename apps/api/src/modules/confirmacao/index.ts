// Confirmação por código (step-up) para QUALQUER persona autenticada.
// Quando o operador vai fazer uma ação que exige código (confirmar termo, averbar,
// login do banco, etc.), este endpoint:
//   1. resolve o e-mail CADASTRADO de quem está operando (pelo papel do JWT);
//   2. gera um código de 6 dígitos único (trava anti-reuso de 30 dias);
//   3. envia o código de verdade para esse e-mail (SMTP/Resend configurado);
//   4. devolve o destino pro front avisar "código enviado para <e-mail>".
// A verificação consome o desafio uma única vez (one-time).
//
// Sem provedor de e-mail configurado (ou sem e-mail do operador), cai no modo
// demo: o código volta na resposta (`codigoDemo`) para não travar o fluxo.

import { Hono } from "hono";
import { z } from "zod";
import { Errors } from "../../_shared/errors.js";
import type { Env } from "../../env.js";
import { authRequired, type JwtClaims } from "../../middleware/auth.js";
import { bancos, prefeituras } from "../admin/index.js";
import { getAverbadoraUser } from "../admin/perfis-admin.js";
import { getSmtpConfigForSend } from "../admin/smtp.js";
import { sendMail, codigoEmail } from "../admin/mailer.js";
import { gerarCodigoUnico } from "../admin/codes.js";
import { SERVIDORES_BUSCA_MOCK } from "../portal-banco/fixtures.js";
import { devUserCpfById } from "../auth/index.js";

const TTL_S = 600; // 10 min

interface ConfirmPayload { sub: string; role: string; codigo: string; exp: number; }

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const shown = user.slice(0, Math.min(3, user.length));
  return `${shown}${"*".repeat(Math.max(3, user.length - shown.length))}@${domain}`;
}

/** E-mail cadastrado de quem está operando, resolvido pelo papel do JWT. */
function emailDoOperador(j: JwtClaims): { email: string; nome: string } {
  if (j.role === "averbadora") {
    const u = getAverbadoraUser(Number(j.sub));
    return { email: (u?.email ?? "").trim(), nome: u?.nome ?? "Operador" };
  }
  if (j.role === "banco") {
    const b = bancos.find((x) => x.id === j.banco_id);
    // contatoEmail e o canal oficial de comunicacoes; loginEmail e so p/ autenticar.
    return { email: (b?.contatoEmail || b?.loginEmail || "").trim(), nome: b?.nome ?? "Banco" };
  }
  if (j.role === "prefeitura") {
    const p = prefeituras.find((x) => x.id === j.prefeitura_id);
    return { email: (p?.contatoEmail || p?.loginEmail || "").trim(), nome: p?.nome ?? "Prefeitura" };
  }
  if (j.role === "servidor") {
    // Dois caminhos possiveis pra achar o servidor logado:
    //  (a) login normal — servidor_id = Number(idMatricula.slice(-5)), match derivado
    //  (b) login DEV — servidor_id = DEV_USERS.id (1, 2, ...); casa via CPF
    const target = j.servidor_id;
    let s = SERVIDORES_BUSCA_MOCK.find((x) => {
      const derived = Number(x.idMatricula.replace(/\D/g, "").slice(-5)) || 1;
      return derived === target;
    });
    if (!s) {
      const cpf = devUserCpfById(Number(j.sub));
      if (cpf) s = SERVIDORES_BUSCA_MOCK.find((x) => x.cpf === cpf);
    }
    return { email: (s?.email ?? "").trim(), nome: s?.nome ?? "Servidor" };
  }
  return { email: "", nome: "Operador" };
}

export const confirmacaoRoutes = new Hono<{ Bindings: Env; Variables: { jwt: JwtClaims; trace_id: string } }>()
  .use("/v1/confirmacao/*", authRequired)
  // Solicita um código: envia pro e-mail do operador e devolve o destino.
  .post("/v1/confirmacao/solicitar", async (c) => {
    const j = c.get("jwt");
    const body = z
      .object({ acao: z.string().min(1).max(160), recurso: z.string().max(160).optional() })
      .parse(await c.req.json().catch(() => ({ acao: "confirmar esta ação" })));

    const { email } = emailDoOperador(j);
    // Prioriza o e-mail cadastrado do operador; se não houver, usa o notifyEmail
    // global (útil quando o e-mail do servidor é fictício).
    const smtp = await getSmtpConfigForSend(c.env);
    const notify = (smtp?.notifyEmail ?? "").trim();
    const destino = email || notify;

    const challengeId = crypto.randomUUID();
    const codigo = await gerarCodigoUnico(c.env);
    const payload: ConfirmPayload = { sub: String(j.sub), role: j.role, codigo, exp: Date.now() + TTL_S * 1000 };
    if (c.env.KV_SESSIONS) {
      await c.env.KV_SESSIONS.put(`confirm:${challengeId}`, JSON.stringify(payload), { expirationTtl: TTL_S });
    }

    let enviado = false;
    let motivo: string | undefined;
    if (destino) {
      const { subject, text } = codigoEmail(codigo, body.acao);
      const r = await sendMail(c.env, { to: destino, subject, text });
      enviado = r.sent;
      motivo = r.reason;
    } else {
      motivo = "sem e-mail cadastrado";
    }

    return c.json({
      challengeId,
      // Destino é o e-mail do próprio operador logado — pode ser exibido a ele.
      destino,
      emailMascarado: destino ? maskEmail(destino) : "",
      enviado,
      motivo: enviado ? undefined : motivo,
      // Só revela o código quando NÃO foi enviado (modo demo / fallback).
      codigoDemo: enviado ? "" : codigo,
      expiraEmSegundos: TTL_S,
    });
  })
  // Verifica o código; consome o desafio (one-time).
  .post("/v1/confirmacao/verificar", async (c) => {
    const j = c.get("jwt");
    const { challengeId, codigo } = z
      .object({ challengeId: z.string().min(1), codigo: z.string().min(1) })
      .parse(await c.req.json());
    if (!c.env.KV_SESSIONS) throw Errors.validation({ codigo: "Confirmação indisponível (sem KV)." });
    const raw = await c.env.KV_SESSIONS.get(`confirm:${challengeId}`);
    if (!raw) throw Errors.validation({ codigo: "Código expirado. Solicite um novo." });
    const p = JSON.parse(raw) as ConfirmPayload;
    if (String(p.sub) !== String(j.sub)) throw Errors.validation({ codigo: "Código inválido." });
    if (Date.now() > p.exp) {
      await c.env.KV_SESSIONS.delete(`confirm:${challengeId}`);
      throw Errors.validation({ codigo: "Código expirado. Solicite um novo." });
    }
    if (String(p.codigo) !== String(codigo).replace(/\D/g, "")) {
      throw Errors.validation({ codigo: "Código inválido." });
    }
    await c.env.KV_SESSIONS.delete(`confirm:${challengeId}`);
    return c.json({ ok: true });
  });
