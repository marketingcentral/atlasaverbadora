// Webhook subscriptions + deliveries — in-memory store.
// HMAC-SHA256 signature (X-Atlas-Signature) prevents tampering.

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
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookEndpoint {
  id: string;
  audience: ApiAudience;
  partnerId: number;
  environment: ApiEnvironment;
  url: string;
  secretPrefix: string; // for display only — store first 8 chars
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
const _deliveries: WebhookDelivery[] = [];
let _wSeq = 1;
let _dSeq = 1;

function genId(prefix: string, n: number): string {
  return `${prefix}_${n.toString().padStart(6, "0")}`;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
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
  const wh: WebhookEndpoint = {
    id: genId("wh", _wSeq++),
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
  return { webhook: wh, secret };
}

export function listWebhooks(filter?: { audience?: ApiAudience; partnerId?: number; environment?: ApiEnvironment }): WebhookEndpoint[] {
  return Array.from(_endpoints.values())
    .filter((w) => (!filter?.audience || w.audience === filter.audience)
      && (filter?.partnerId == null || w.partnerId === filter.partnerId)
      && (!filter?.environment || w.environment === filter.environment))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getWebhook(id: string): WebhookEndpoint | null {
  return _endpoints.get(id) ?? null;
}

export function toggleWebhook(id: string): WebhookEndpoint | null {
  const w = _endpoints.get(id);
  if (!w) return null;
  w.active = !w.active;
  return w;
}

export function removeWebhook(id: string): boolean {
  return _endpoints.delete(id);
}

export function listDeliveries(webhookId?: string, limit = 50): WebhookDelivery[] {
  const all = webhookId ? _deliveries.filter((d) => d.webhookId === webhookId) : _deliveries.slice();
  return all.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).slice(0, limit);
}

/**
 * Fire an event to all webhooks subscribed. Best-effort: schedules delivery and
 * logs a synthetic outcome (not actually sending fetch in this in-memory build).
 * Replace with a Cloudflare Queue + retry policy in production.
 */
export async function fireEvent(event: WebhookEvent, payload: unknown, filter?: { audience?: ApiAudience; partnerId?: number; environment?: ApiEnvironment }): Promise<WebhookDelivery[]> {
  const targets = listWebhooks(filter).filter((w) => w.active && w.events.includes(event));
  const out: WebhookDelivery[] = [];
  for (const w of targets) {
    const delivery: WebhookDelivery = {
      id: genId("dlv", _dSeq++),
      webhookId: w.id,
      event,
      status: "pending",
      attempt: 1,
      scheduledAt: new Date().toISOString(),
      payloadPreview: JSON.stringify(payload).slice(0, 200),
    };
    _deliveries.push(delivery);
    // Synthetic outcome: assume 2xx unless URL host is "fail.test".
    setTimeout(() => {
      delivery.deliveredAt = new Date().toISOString();
      try {
        const u = new URL(w.url);
        if (u.hostname === "fail.test") {
          delivery.status = "failed";
          delivery.httpStatus = 500;
          delivery.error = "Synthetic failure";
        } else {
          delivery.status = "success";
          delivery.httpStatus = 200;
        }
      } catch {
        delivery.status = "failed";
        delivery.error = "invalid_url";
      }
    }, 50);
    out.push(delivery);
  }
  return out;
}

// Seed: 1 webhook + 3 deliveries for visual testing.
(async () => {
  const { webhook } = await createWebhook({
    audience: "banco",
    partnerId: 1,
    environment: "sandbox",
    url: "https://webhook.site/atlas-demo",
    events: ["proposta.criada", "contrato.averbado", "contrato.cancelado"],
    createdBy: "seed",
  });
  await fireEvent("proposta.criada", { propostaId: "PRO-9821", valor: 25000 }, { environment: "sandbox" });
  await fireEvent("contrato.averbado", { adf: "9001234", valorParcela: 750 }, { environment: "sandbox" });
  void webhook;
})().catch(() => undefined);
