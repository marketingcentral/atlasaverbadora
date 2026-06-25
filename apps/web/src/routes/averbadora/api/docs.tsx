import { useMemo, useState } from "react";
import { Button, Card, Pill, Tabs } from "@atlas/ui/web";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface Endpoint {
  method: Method;
  path: string;
  summary: string;
  scope: string;
  exampleBody?: unknown;
  examplePathParam?: string;
}

interface Section {
  key: string;
  label: string;
  description: string;
  endpoints: Endpoint[];
}

interface Layer {
  key: "banco" | "servidor" | "averbadora";
  label: string;
  blurb: string;
  tokenPrefix: string;
  sections: Section[];
}

const LAYERS: Layer[] = [
  {
    key: "banco",
    label: "Banco",
    blurb: "Consumido por bancos parceiros. Consulta de margem, averbação/reserva de contratos, ações e webhooks.",
    tokenPrefix: "atl_test_… (camada banco)",
    sections: [
      {
        key: "banco-id", label: "Identidade", description: "Detalhes do token banco.",
        endpoints: [{ method: "GET", path: "/v1/external/banco/me", summary: "Token + banco associado", scope: "banco:read" }],
      },
      {
        key: "banco-margem", label: "Margem & Convênios", description: "Convênios do banco e consulta de margem de colaboradores.",
        endpoints: [
          { method: "GET", path: "/v1/external/banco/convenios", summary: "Convênios do banco", scope: "banco:read" },
          { method: "GET", path: "/v1/external/banco/margem?cpf=00011122233", summary: "Margem por CPF ou matrícula", scope: "banco:read" },
        ],
      },
      {
        key: "banco-contratos", label: "Contratos", description: "Listar, detalhar, averbar/reservar e operar contratos.",
        endpoints: [
          { method: "GET", path: "/v1/external/banco/contratos", summary: "Listar contratos do banco", scope: "banco:read" },
          { method: "GET", path: "/v1/external/banco/contratos/{adf}", summary: "Detalhe + parcelas", scope: "banco:read", examplePathParam: "9000000" },
          { method: "POST", path: "/v1/external/banco/contratos/averbar", summary: "Averbar / reservar contrato", scope: "banco:write", exampleBody: { matricula: "852029100", convenio_id: "CONV-001", tipo_contrato: "EMPRESTIMO", valor_financiado: 10000, parcelas: 48, taxa_am: 0.0179, reserva: false } },
          { method: "POST", path: "/v1/external/banco/contratos/{adf}/acao", summary: "Quitar / suspender / cancelar / alongar", scope: "banco:write", examplePathParam: "9000000", exampleBody: { acao: "quitar", motivo: "Liquidação antecipada" } },
        ],
      },
      {
        key: "banco-webhooks", label: "Webhooks", description: "Endpoints HTTPS do banco para receber eventos.",
        endpoints: [
          { method: "GET", path: "/v1/external/banco/webhooks", summary: "Listar webhooks", scope: "banco:webhooks" },
          { method: "POST", path: "/v1/external/banco/webhooks", summary: "Criar webhook", scope: "banco:webhooks", exampleBody: { url: "https://api.banco.com/atlas/webhook", events: ["contrato.averbado", "contrato.cancelado"] } },
          { method: "PATCH", path: "/v1/external/banco/webhooks/{id}/toggle", summary: "Pausar/retomar", scope: "banco:webhooks", examplePathParam: "wh_000001" },
          { method: "DELETE", path: "/v1/external/banco/webhooks/{id}", summary: "Remover", scope: "banco:webhooks", examplePathParam: "wh_000001" },
          { method: "GET", path: "/v1/external/banco/webhooks/{id}/deliveries", summary: "Log de entregas", scope: "banco:webhooks", examplePathParam: "wh_000001" },
        ],
      },
    ],
  },
  {
    key: "servidor",
    label: "Servidor",
    blurb: "Consumido pelo app do servidor (cada token representa um servidor). Margem, ofertas, simulação, propostas e contratos próprios.",
    tokenPrefix: "atl_test_… (camada servidor)",
    sections: [
      {
        key: "srv-id", label: "Identidade", description: "Dados do servidor que o token representa.",
        endpoints: [{ method: "GET", path: "/v1/external/servidor/me", summary: "Servidor do token", scope: "servidor:read" }],
      },
      {
        key: "srv-margem", label: "Margem & Ofertas", description: "Margem disponível e ofertas pré-aprovadas.",
        endpoints: [
          { method: "GET", path: "/v1/external/servidor/margem", summary: "Margem por tipo", scope: "servidor:read" },
          { method: "GET", path: "/v1/external/servidor/ofertas", summary: "Ofertas pré-aprovadas", scope: "servidor:read" },
        ],
      },
      {
        key: "srv-prop", label: "Simulação & Propostas", description: "Simular crédito e acompanhar propostas.",
        endpoints: [
          { method: "POST", path: "/v1/external/servidor/propostas/simular", summary: "Simular (parcela + CET + cabe na margem)", scope: "servidor:write", exampleBody: { valor: 15000, parcelas: 48, taxa_am: 0.0179 } },
          { method: "GET", path: "/v1/external/servidor/propostas", summary: "Histórico de propostas", scope: "servidor:read" },
          { method: "GET", path: "/v1/external/servidor/contratos", summary: "Contratos ativos/quitados", scope: "servidor:read" },
        ],
      },
    ],
  },
  {
    key: "averbadora",
    label: "Averbadora",
    blurb: "Operar o sistema inteiro via API: bancos, prefeituras, convênios, servidores e disparo de eventos.",
    tokenPrefix: "atl_test_… (camada averbadora)",
    sections: [
      {
        key: "avb-id", label: "Identidade & Dashboard", description: "Token e visão consolidada.",
        endpoints: [
          { method: "GET", path: "/v1/external/averbadora/me", summary: "Token averbadora", scope: "averbadora:read" },
          { method: "GET", path: "/v1/external/averbadora/dashboard", summary: "KPIs consolidados", scope: "averbadora:read" },
        ],
      },
      {
        key: "avb-bancos", label: "Bancos", description: "Listar e criar/atualizar bancos parceiros.",
        endpoints: [
          { method: "GET", path: "/v1/external/averbadora/bancos", summary: "Listar bancos", scope: "averbadora:read" },
          { method: "POST", path: "/v1/external/averbadora/bancos", summary: "Criar/atualizar banco", scope: "averbadora:write", exampleBody: { nome: "Novo Banco S.A.", status: "ativo", adapter: "sandbox", contatoEmail: "ti@novo.com.br" } },
        ],
      },
      {
        key: "avb-pref", label: "Prefeituras & Convênios", description: "Gestão de prefeituras e leitura de convênios.",
        endpoints: [
          { method: "GET", path: "/v1/external/averbadora/prefeituras", summary: "Listar prefeituras", scope: "averbadora:read" },
          { method: "POST", path: "/v1/external/averbadora/prefeituras", summary: "Criar/atualizar prefeitura", scope: "averbadora:write", exampleBody: { nome: "Itajaí", uf: "SC", municipioIbge: 4208203, modoIntegracao: "REST" } },
          { method: "GET", path: "/v1/external/averbadora/convenios", summary: "Listar convênios", scope: "averbadora:read" },
        ],
      },
      {
        key: "avb-srv", label: "Servidores & Eventos", description: "Consultar servidores e disparar eventos para webhooks.",
        endpoints: [
          { method: "GET", path: "/v1/external/averbadora/servidores?q=", summary: "Buscar servidores", scope: "averbadora:read" },
          { method: "GET", path: "/v1/external/averbadora/webhooks", summary: "Todos os webhooks", scope: "averbadora:webhooks" },
          { method: "POST", path: "/v1/external/averbadora/eventos/disparar", summary: "Disparar evento", scope: "averbadora:webhooks", exampleBody: { event: "contrato.averbado", payload: { adf: "9000000" } } },
        ],
      },
    ],
  },
];

export function AverbadoraApiDocs() {
  const [layerKey, setLayerKey] = useState<Layer["key"]>("banco");
  const layer = LAYERS.find((l) => l.key === layerKey)!;
  const [section, setSection] = useState<string>(layer.sections[0]!.key);

  const current = layer.sections.find((s) => s.key === section) ?? layer.sections[0]!;

  function switchLayer(k: Layer["key"]) {
    setLayerKey(k);
    const l = LAYERS.find((x) => x.key === k)!;
    setSection(l.sections[0]!.key);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>API</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Documentação interativa</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4, maxWidth: 720 }}>
            API separada em 3 camadas. Cada token pertence a uma e só acessa o seu namespace
            <code> /v1/external/&lt;camada&gt;/*</code>. Use <b>atl_test_*</b> para homologar e <b>atl_live_*</b> em produção.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <BaseUrlBadge />
          <a href="/averbadora/api/tokens" style={{ color: "var(--accent)", fontSize: 13 }}>Gerenciar tokens →</a>
        </div>
      </header>

      {/* Seletor de camada */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {LAYERS.map((l) => {
          const active = l.key === layerKey;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => switchLayer(l.key)}
              style={{
                flex: "1 1 200px",
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: 12,
                cursor: "pointer",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--surface)",
                color: "var(--text)",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15 }}>{l.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{l.blurb}</div>
              <code style={{ fontSize: 11, color: "var(--accent)", display: "block", marginTop: 6 }}>/v1/external/{l.key}/*</code>
            </button>
          );
        })}
      </div>

      <Tabs
        variant="pills"
        activeKey={section}
        onChange={setSection}
        tabs={layer.sections.map((s) => ({ key: s.key, label: s.label }))}
      />

      <Card>
        <p style={{ marginTop: 0, color: "var(--text-muted)", fontSize: 14 }}>{current.description}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {current.endpoints.map((e, i) => (
            <EndpointCard key={`${e.method}-${e.path}-${i}`} endpoint={e} />
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Autenticação</h3>
        <pre style={preStyle}>{`curl ${API_BASE}${layer.sections[0]!.endpoints[0]!.path} \\
  -H "Authorization: Bearer ${layer.tokenPrefix}"`}</pre>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          O token só acessa endpoints da sua camada. Tentar usar um token banco em <code>/v1/external/servidor/*</code> retorna 403.
        </p>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Assinatura dos webhooks</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Cada delivery inclui <code>X-Atlas-Signature: sha256=&lt;hex&gt;</code> = HMAC-SHA256 do body com o secret do webhook.
        </p>
        <pre style={preStyle}>{`// Node.js
import crypto from "crypto";
const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
hmac.update(rawBody);
const expected = "sha256=" + hmac.digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers["x-atlas-signature"]))) {
  return res.status(401).end();
}`}</pre>
      </Card>
    </div>
  );
}

function BaseUrlBadge() {
  return (
    <code style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "var(--bg-elev-2)", color: "var(--text-muted)" }}>
      {API_BASE || "http://localhost:8787"}
    </code>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string>(() => localStorage.getItem("atlas:try-token") ?? "");
  const [pathParam, setPathParam] = useState<string>(endpoint.examplePathParam ?? "");
  const [body, setBody] = useState<string>(endpoint.exampleBody ? JSON.stringify(endpoint.exampleBody, null, 2) : "");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);

  const finalPath = useMemo(() => {
    let p = endpoint.path;
    if (endpoint.examplePathParam && pathParam) p = p.replace(/\{[^}]+\}/, pathParam);
    return p;
  }, [endpoint, pathParam]);

  async function run() {
    setLoading(true);
    setResponse(null);
    try {
      localStorage.setItem("atlas:try-token", token);
      const res = await fetch(`${API_BASE}${finalPath}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: ["POST", "PATCH"].includes(endpoint.method) && body ? body : undefined,
      });
      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep raw */ }
      setResponse({ status: res.status, body: pretty });
    } catch (err) {
      setResponse({ status: 0, body: String(err) });
    } finally {
      setLoading(false);
    }
  }

  const methodColor: Record<Method, string> = { GET: "#3b82f6", POST: "#10b981", PATCH: "#f59e0b", DELETE: "#ef4444" };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-elev)", color: "var(--text)", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 4, background: methodColor[endpoint.method], color: "white", minWidth: 52, textAlign: "center" }}>{endpoint.method}</span>
        <code style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 13 }}>{endpoint.path}</code>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{endpoint.summary}</span>
        <Pill variant="aceita">{endpoint.scope}</Pill>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>Token (atl_test_* ou atl_live_*)</span>
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="atl_test_..." style={inp} />
          </label>
          {endpoint.examplePathParam ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>Parâmetro de path</span>
              <input value={pathParam} onChange={(e) => setPathParam(e.target.value)} style={inp} />
            </label>
          ) : null}
          {["POST", "PATCH"].includes(endpoint.method) && endpoint.exampleBody ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>Body (JSON)</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} style={{ ...inp, fontFamily: "var(--font-mono)", fontSize: 12 }} />
            </label>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" onClick={run} disabled={loading || !token}>{loading ? "Enviando…" : "Tente agora →"}</Button>
            <code style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>{endpoint.method} {API_BASE}{finalPath}</code>
          </div>
          {response ? (
            <div>
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                <b>Status:</b>{" "}
                <Pill variant={response.status >= 200 && response.status < 300 ? "emdia" : response.status === 0 ? "expirado" : "pendente"}>
                  {response.status === 0 ? "ERRO" : response.status}
                </Pill>
              </div>
              <pre style={preStyle}>{response.body}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const inp: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14 };
const preStyle: React.CSSProperties = { padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, overflow: "auto", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", margin: 0, maxHeight: 360 };
