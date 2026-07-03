// Webhook subscriptions + deliveries — in-memory store.
// Deliveries are sent over HTTP with an HMAC-SHA256 signature (X-Atlas-Signature)
// so the receiver can verify authenticity. Best-effort with a short retry.

import type { ApiEnvironment, ApiAudience } from "./api-tokens.js";

export const WEBHOOK_EVENTS = [
  "proposta.criada",
  "proposta.aprovada",
  "proposta.rejeitada",
  "proposta.expirada",
  "contrato.averbado",
  "contrato.suspenso",
  "contrato.cancelado",
  "contrato.quitado",
  "contrato.alongado",
  "contrato.alterado",
  "folha.sincronizada",
  "folha.fechada",
  "servidor.bloqueado",
  "servidor.desbloqueado",
  "comunicado.publicado",
  "portabilidade.solicitada",
  "portabilidade.concluida",
  "webhook.test",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookEndpoint {
  id: string;
  audience: ApiAudience;
  partnerId: number;
  environment: ApiEnvironment;
  url: string;
  secretPrefix: string; // for display only — store first 12 chars
  secretHash: string;   // SHA-256 hex of the actual secret
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  status: "pending" | "success" | "failed";
  httpStatus?: number;
  attempt: number;
  scheduledAt: string;
  deliveredAt?: string;
  error?: string;
  payloadPreview: string;
}

const _endpoints = new Map<string, WebhookEndpoint>();
/** Raw signing secrets, kept out of WebhookEndpoint so they never get serialized. */
const _secrets = new Map<string, string>();
const _deliveries: WebhookDelivery[] = [];
let _wSeq = 1;
let _dSeq = 1;

const DELIVERY_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;

function genId(prefix: string, n: number): string {
  return `${prefix}_${n.toString().padStart(6, "0")}`;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

/** HMAC-SHA256(secret, body) as hex — what the receiver recomputes to verify. */
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return toHex(sig);
}

export interface CreateWebhookInput {
  audience: ApiAudience;
  partnerId: number;
  environment: ApiEnvironment;
  url: string;
  events: WebhookEvent[];
  createdBy: string;
}

export async function createWebhook(input: CreateWebhookInput): Promise<{ webhook: WebhookEndpoint; secret: string }> {
  const secret = `whsec_${randomHex(24)}`;
  const id = genId("wh", _wSeq++);
  const wh: WebhookEndpoint = {
    id,
    audience: input.audience,
    partnerId: input.partnerId,
    environment: input.environment,
    url: input.url,
    secretPrefix: secret.slice(0, 12) + "…",
    secretHash: await sha256(secret),
    events: input.events,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };
  _endpoints.set(wh.id, wh);
  _secrets.set(wh.id, secret);
  return { webhook: wh, secret };
}

export function listWebhooks(filter?: { audience?: ApiAudience; partnerId?: number; environment?: ApiEnvironment }): WebhookEndpoint[] {
  ensureSeeded();
  return Array.from(_endpoints.values())
    .filter((w) => (!filter?.audience || w.audience === filter.audience)
      && (filter?.partnerId == null || w.partnerId === filter.partnerId)
      && (!filter?.environment || w.environment === filter.environment))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getWebhook(id: string): WebhookEndpoint | null {
  return _endpoints.get(id) ?? null;
}

/** Liga/desliga um webhook específico (self-service do banco na API externa).
 *  Soft — reversível, nunca apaga. */
export function toggleWebhook(id: string): WebhookEndpoint | null {
  const w = _endpoints.get(id);
  if (!w) return null;
  w.active = !w.active;
  return w;
}

/** Desativa (soft) um webhook específico — para de receber eventos, registro fica. */
export function deactivateWebhook(id: string): WebhookEndpoint | null {
  const w = _endpoints.get(id);
  if (!w) return null;
  w.active = false;
  return w;
}

/**
 * Pausa/retoma em cascata todos os webhooks de um parceiro conforme o status do
 * banco. `active=false` = pausado (para de receber eventos), mas o registro
 * NUNCA é apagado. Chamado quando o banco é desativado/reativado. Retorna
 * quantos webhooks mudaram de estado.
 */
export function setWebhooksPausedForPartner(audience: ApiAudience, partnerId: number, paused: boolean): number {
  ensureSeeded();
  const shouldActive = !paused;
  let changed = 0;
  for (const w of _endpoints.values()) {
    if (w.audience !== audience || w.partnerId !== partnerId) continue;
    if (w.active === shouldActive) continue;
    w.active = shouldActive;
    changed++;
  }
  return changed;
}

export function listDeliveries(webhookId?: string, limit = 50): WebhookDelivery[] {
  const all = webhookId ? _deliveries.filter((d) => d.webhookId === webhookId) : _deliveries.slice();
  return all.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).slice(0, limit);
}

/** Build the JSON envelope a receiver gets. The signature is computed over this exact string. */
function buildBody(delivery: WebhookDelivery, w: WebhookEndpoint, event: WebhookEvent, payload: unknown): string {
  return JSON.stringify({
    id: delivery.id,
    event,
    environment: w.environment,
    webhook_id: w.id,
    created_at: delivery.scheduledAt,
    data: payload,
  });
}

/** POST the body to the webhook URL with signature headers; one attempt. */
async function attemptDelivery(w: WebhookEndpoint, delivery: WebhookDelivery, bodyStr: string, signature: string): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const res = await fetch(w.url, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Atlas-Webhooks/1.0",
        "X-Atlas-Event": delivery.event,
        "X-Atlas-Delivery": delivery.id,
        "X-Atlas-Webhook-Id": w.id,
        "X-Atlas-Signature": `sha256=${signature}`,
      },
      body: bodyStr,
    });
    delivery.httpStatus = res.status;
    delivery.deliveredAt = new Date().toISOString();
    if (res.ok) {
      delivery.status = "success";
      delivery.error = undefined;
    } else {
      delivery.status = "failed";
      delivery.error = `HTTP ${res.status}`;
    }
  } catch (err) {
    delivery.deliveredAt = new Date().toISOString();
    delivery.status = "failed";
    delivery.error = err instanceof Error ? (err.name === "AbortError" ? "timeout" : err.message) : "fetch_error";
  } finally {
    clearTimeout(timer);
  }
}

/** Deliver one event to one webhook, retrying on failure up to MAX_ATTEMPTS. */
async function deliver(w: WebhookEndpoint, event: WebhookEvent, payload: unknown): Promise<WebhookDelivery> {
  const delivery: WebhookDelivery = {
    id: genId("dlv", _dSeq++),
    webhookId: w.id,
    event,
    status: "pending",
    attempt: 0,
    scheduledAt: new Date().toISOString(),
    payloadPreview: JSON.stringify(payload).slice(0, 200),
  };
  _deliveries.push(delivery);

  const bodyStr = buildBody(delivery, w, event, payload);
  const secret = _secrets.get(w.id) ?? "";
  const signature = secret ? await hmacSha256Hex(secret, bodyStr) : "";

  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    delivery.attempt = i;
    await attemptDelivery(w, delivery, bodyStr, signature);
    if (delivery.status === "success") break;
    // Don't retry client errors (4xx) — they won't succeed on a repeat. Only
    // retry transient failures: network errors/timeouts (no httpStatus) or 5xx.
    const http = delivery.httpStatus;
    if (http != null && http >= 400 && http < 500) break;
  }
  return delivery;
}

/**
 * Fire an event to all subscribed + active webhooks. Awaits the HTTP deliveries
 * (with timeout/retry) so the caller gets real outcomes back.
 */
export async function fireEvent(event: WebhookEvent, payload: unknown, filter?: { audience?: ApiAudience; partnerId?: number; environment?: ApiEnvironment }): Promise<WebhookDelivery[]> {
  const targets = listWebhooks(filter).filter((w) => w.active && w.events.includes(event));
  return Promise.all(targets.map((w) => deliver(w, event, payload)));
}

/** Representative sample payload per event family, so n8n receives realistic data. */
function samplePayload(event: WebhookEvent): Record<string, unknown> {
  const base = { ts: new Date().toISOString(), _sample: true };
  const suffix = event.split(".")[1] ?? "";
  if (event.startsWith("proposta")) return { ...base, propostaId: "PRO-9821", matricula: "852029100", valor: 25000, parcelas: 48, situacao: suffix };
  if (event.startsWith("contrato")) return { ...base, adf: "9001234", matricula: "852029100", valorParcela: 750, situacao: suffix };
  if (event.startsWith("folha")) return { ...base, competencia: "2026-06", prefeituraId: 1, status: suffix };
  if (event.startsWith("servidor")) return { ...base, matricula: "852029100", motivo: suffix };
  if (event.startsWith("portabilidade")) return { ...base, portabilidadeId: "PORT-001", adf: "9001234", situacao: suffix };
  if (event.startsWith("comunicado")) return { ...base, comunicadoId: "COM-001", titulo: "Comunicado de teste" };
  return { ...base, message: "Ping de teste do Atlas. Se você recebeu isto, o webhook está funcionando." };
}

/**
 * Test a webhook by delivering EACH event it is subscribed to (the exact ones
 * the user selected), so they appear individually in the receiver. Falls back
 * to a single webhook.test ping when the webhook has no events.
 */
export async function testWebhookEvents(webhookId: string): Promise<WebhookDelivery[] | null> {
  const w = _endpoints.get(webhookId);
  if (!w) return null;
  const events: WebhookEvent[] = w.events.length ? w.events : ["webhook.test"];
  const out: WebhookDelivery[] = [];
  for (const ev of events) {
    out.push(await deliver(w, ev, samplePayload(ev)));
  }
  return out;
}

// Lazy seed — runs on first request (never at module/global scope, where Workers
// forbids crypto/random). Adds one demo webhook + two synthetic deliveries.
let _seeded = false;
function ensureSeeded(): void {
  if (_seeded) return;
  _seeded = true;
  const secret = `whsec_${randomHex(24)}`;
  const id = genId("wh", _wSeq++);
  const wh: WebhookEndpoint = {
    id,
    audience: "banco",
    partnerId: 1,
    environment: "sandbox",
    url: "https://webhook.site/atlas-demo",
    secretPrefix: secret.slice(0, 12) + "…",
    secretHash: "", // demo only; not used for signing the synthetic rows below
    events: ["proposta.criada", "contrato.averbado", "contrato.cancelado"],
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: "seed",
  };
  _endpoints.set(id, wh);
  _secrets.set(id, secret);
  for (const [event, payload] of [
    ["proposta.criada", { propostaId: "PRO-9821", valor: 25000 }],
    ["contrato.averbado", { adf: "9001234", valorParcela: 750 }],
  ] as [WebhookEvent, unknown][]) {
    _deliveries.push({
      id: genId("dlv", _dSeq++),
      webhookId: id,
      event,
      status: "success",
      httpStatus: 200,
      attempt: 1,
      scheduledAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      payloadPreview: JSON.stringify(payload).slice(0, 200),
    });
  }
}
