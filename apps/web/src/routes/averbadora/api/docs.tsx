import { useMemo, useState } from "react";
import { Button, Card, Pill, Tabs } from "@atlas/ui/web";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface QueryFilter {
  name: string;
  label: string;
  type: "text" | "enum";
  options?: string[];
  placeholder?: string;
  /** Prefilled value used when you hit "Tente agora". */
  example?: string;
  hint?: string;
}

interface Endpoint {
  method: Method;
  path: string;
  summary: string;
  scope: string;
  exampleBody?: unknown;
  examplePathParam?: string;
  /** Query-string filters this endpoint understands (rendered as inputs in "Tente agora"). */
  filters?: QueryFilter[];
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
          {
            method: "GET", path: "/v1/external/banco/convenios", summary: "Convênios do banco", scope: "banco:read",
            filters: [
              { name: "uf", label: "UF", type: "text", placeholder: "SC", hint: "Sigla do estado" },
              { name: "cidade", label: "Cidade", type: "text", placeholder: "Palhoça", example: "Palhoça", hint: "Nome da prefeitura (parcial, sem acento ok)" },
              { name: "q", label: "Busca", type: "text", placeholder: "delta", hint: "Nome ou código de verba" },
            ],
          },
          {
            method: "GET", path: "/v1/external/banco/margem", summary: "Margem por CPF ou matrícula", scope: "banco:read",
            filters: [
              { name: "cpf", label: "CPF", type: "text", placeholder: "00011122233", example: "00011122233", hint: "Só dígitos" },
              { name: "matricula", label: "Matrícula", type: "text", placeholder: "852029100" },
            ],
          },
        ],
      },
      {
        key: "banco-contratos", label: "Contratos", description: "Listar, detalhar, averbar/reservar e operar contratos.",
        endpoints: [
          {
            method: "GET", path: "/v1/external/banco/contratos", summary: "Listar contratos do banco", scope: "banco:read",
            filters: [
              { name: "situacao", label: "Situação", type: "text", placeholder: "ativo", hint: "ex.: ativo, quitado, cancelado, reservado" },
              { name: "tipo_contrato", label: "Tipo", type: "text", placeholder: "EMPRESTIMO" },
              { name: "convenio_id", label: "Convênio", type: "text", placeholder: "CONV-001" },
              { name: "matricula", label: "Matrícula", type: "text", placeholder: "852029100" },
              { name: "q", label: "Busca", type: "text", placeholder: "nome, matrícula ou ADF" },
            ],
          },
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
          {
            method: "GET", path: "/v1/external/averbadora/bancos", summary: "Listar bancos (filtrável por cidade/UF)", scope: "averbadora:read",
            filters: [
              { name: "cidade", label: "Cidade", type: "text", placeholder: "Palhoça", example: "Palhoça", hint: "Bancos com convênio nessa cidade" },
              { name: "uf", label: "UF", type: "text", placeholder: "SC", hint: "Bancos com convênio nessa UF" },
              { name: "status", label: "Status", type: "enum", options: ["", "ativo", "pausado", "inativo"] },
              { name: "adapter", label: "Adapter", type: "enum", options: ["", "sandbox", "ifractal"] },
              { name: "q", label: "Busca", type: "text", placeholder: "nome do banco" },
            ],
          },
          { method: "POST", path: "/v1/external/averbadora/bancos", summary: "Criar/atualizar banco", scope: "averbadora:write", exampleBody: { nome: "Novo Banco S.A.", status: "ativo", adapter: "sandbox", contatoEmail: "ti@novo.com.br" } },
        ],
      },
      {
        key: "avb-pref", label: "Prefeituras & Convênios", description: "Gestão de prefeituras e leitura de convênios.",
        endpoints: [
          {
            method: "GET", path: "/v1/external/averbadora/prefeituras", summary: "Listar prefeituras (filtrável)", scope: "averbadora:read",
            filters: [
              { name: "cidade", label: "Cidade", type: "text", placeholder: "Florianópolis", hint: "Nome do município (parcial)" },
              { name: "uf", label: "UF", type: "text", placeholder: "SC" },
              { name: "status", label: "Status", type: "enum", options: ["", "ativo", "pausado"] },
              { name: "modo", label: "Integração", type: "enum", options: ["", "REST", "SOAP", "CSV", "MANUAL"] },
            ],
          },
          { method: "POST", path: "/v1/external/averbadora/prefeituras", summary: "Criar/atualizar prefeitura", scope: "averbadora:write", exampleBody: { nome: "Itajaí", uf: "SC", municipioIbge: 4208203, modoIntegracao: "REST" } },
          {
            method: "GET", path: "/v1/external/averbadora/convenios", summary: "Listar convênios (filtrável)", scope: "averbadora:read",
            filters: [
              { name: "cidade", label: "Cidade", type: "text", placeholder: "Joinville", hint: "Prefeitura do convênio" },
              { name: "uf", label: "UF", type: "text", placeholder: "SC" },
              { name: "banco_id", label: "Banco (id)", type: "text", placeholder: "1" },
              { name: "prefeitura_id", label: "Prefeitura (id)", type: "text", placeholder: "1" },
              { name: "q", label: "Busca", type: "text", placeholder: "nome ou verba" },
            ],
          },
        ],
      },
      {
        key: "avb-srv", label: "Servidores & Eventos", description: "Consultar servidores e disparar eventos para webhooks.",
        endpoints: [
          {
            method: "GET", path: "/v1/external/averbadora/servidores", summary: "Buscar servidores (filtrável)", scope: "averbadora:read",
            filters: [
              { name: "q", label: "Busca", type: "text", placeholder: "nome, CPF ou matrícula", example: "ADRIANA" },
              { name: "vinculo", label: "Vínculo", type: "text", placeholder: "ESTATUTARIO" },
              { name: "situacao", label: "Situação funcional", type: "text", placeholder: "TRABALHANDO" },
              { name: "convenio_id", label: "Convênio", type: "text", placeholder: "CONV-001" },
            ],
          },
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
  const [search, setSearch] = useState("");
  // Shared API token used by every "Tente agora" on the page. Persisted so it
  // survives reloads and layer switches.
  const [token, setToken] = useState<string>(() => localStorage.getItem("atlas:try-token") ?? "");
  function updateToken(v: string) {
    setToken(v);
    localStorage.setItem("atlas:try-token", v);
  }

  const current = layer.sections.find((s) => s.key === section) ?? layer.sections[0]!;

  // When the search box is non-empty, flatten every endpoint of the current
  // layer and match by method, path, summary, scope or filter names.
  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const hits: { section: string; endpoint: Endpoint }[] = [];
    for (const s of layer.sections) {
      for (const e of s.endpoints) {
        const hay = [e.method, e.path, e.summary, e.scope, ...(e.filters ?? []).map((f) => `${f.name} ${f.label}`)]
          .join(" ")
          .toLowerCase();
        if (hay.includes(q)) hits.push({ section: s.label, endpoint: e });
      }
    }
    return hits;
  }, [search, layer]);

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

      {/* Barra de autenticação — token compartilhado por todos os "Tente agora" */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>API token para testar</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Cole um token <code>atl_*</code> da camada <b>{layer.label}</b>. Crie em <a href="/averbadora/api/tokens" style={{ color: "var(--accent)" }}>API → Tokens</a> (audience <code>{layer.key}</code>).
            </span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: token ? "var(--emerald, #10b981)" : "var(--text-muted)" }}>
            {token ? "● token definido" : "○ sem token"}
          </span>
        </div>
        <input
          value={token}
          onChange={(e) => updateToken(e.target.value)}
          placeholder="atl_test_… ou atl_live_…"
          style={{ ...inp, width: "100%", marginTop: 10, fontFamily: "var(--font-mono)" }}
        />
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 0 0" }}>
          ⚠️ Não use o <b>secret do webhook</b> (<code>whsec_…</code>) aqui — ele serve só para validar a assinatura das entregas, não para autenticar na API.
        </p>
      </Card>

      {/* Busca global de endpoints na camada */}
      <div style={{ position: "relative" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Buscar endpoint na camada ${layer.label} (path, descrição, filtro…)`}
          style={{ ...inp, width: "100%", paddingLeft: 34 }}
        />
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>⌕</span>
        {search ? (
          <button type="button" onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
        ) : null}
      </div>

      {searchHits ? (
        <Card>
          <p style={{ marginTop: 0, color: "var(--text-muted)", fontSize: 14 }}>
            {searchHits.length} endpoint{searchHits.length === 1 ? "" : "s"} para <b>“{search}”</b> na camada {layer.label}.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {searchHits.map(({ section: sec, endpoint: e }, i) => (
              <div key={`${e.method}-${e.path}-${i}`}>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>{sec}</div>
                <EndpointCard endpoint={e} token={token} />
              </div>
            ))}
            {searchHits.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Nada encontrado. Tente outro termo.</p> : null}
          </div>
        </Card>
      ) : (
        <>
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
                <EndpointCard key={`${e.method}-${e.path}-${i}`} endpoint={e} token={token} />
              ))}
            </div>
          </Card>
        </>
      )}

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

function EndpointCard({ endpoint, token }: { endpoint: Endpoint; token: string }) {
  const [open, setOpen] = useState(false);
  const [pathParam, setPathParam] = useState<string>(endpoint.examplePathParam ?? "");
  const [body, setBody] = useState<string>(endpoint.exampleBody ? JSON.stringify(endpoint.exampleBody, null, 2) : "");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((endpoint.filters ?? []).map((f) => [f.name, f.example ?? ""])),
  );
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);

  const finalPath = useMemo(() => {
    let p = endpoint.path;
    if (endpoint.examplePathParam && pathParam) p = p.replace(/\{[^}]+\}/, pathParam);
    const qs = new URLSearchParams();
    for (const f of endpoint.filters ?? []) {
      const v = filterValues[f.name]?.trim();
      if (v) qs.set(f.name, v);
    }
    const query = qs.toString();
    return query ? `${p}?${query}` : p;
  }, [endpoint, pathParam, filterValues]);

  const activeFilterCount = useMemo(
    () => (endpoint.filters ?? []).filter((f) => filterValues[f.name]?.trim()).length,
    [endpoint.filters, filterValues],
  );

  async function run() {
    setLoading(true);
    setResponse(null);
    try {
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
        {endpoint.filters?.length ? (
          <span title={`${endpoint.filters.length} filtros disponíveis`} style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
            ⚲ {activeFilterCount > 0 ? `${activeFilterCount} ativo${activeFilterCount > 1 ? "s" : ""}` : `${endpoint.filters.length} filtros`}
          </span>
        ) : null}
        <Pill variant="aceita">{endpoint.scope}</Pill>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {!token ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 10px", border: "1px dashed var(--border-strong)", borderRadius: 8 }}>
              Defina um API token na barra <b>“API token para testar”</b> no topo desta página para usar o “Tente agora”.
            </div>
          ) : null}
          {endpoint.examplePathParam ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>Parâmetro de path</span>
              <input value={pathParam} onChange={(e) => setPathParam(e.target.value)} style={inp} />
            </label>
          ) : null}
          {endpoint.filters?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "var(--bg-elev-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>Filtros (query string)</span>
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={() => setFilterValues(Object.fromEntries((endpoint.filters ?? []).map((f) => [f.name, ""])))}
                    style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    limpar
                  </button>
                ) : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {endpoint.filters.map((f) => (
                  <label key={f.name} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{f.label} <code style={{ fontSize: 10, color: "var(--text-muted)" }}>{f.name}</code></span>
                    {f.type === "enum" ? (
                      <select value={filterValues[f.name] ?? ""} onChange={(e) => setFilterValues((v) => ({ ...v, [f.name]: e.target.value }))} style={inp}>
                        {(f.options ?? []).map((o) => <option key={o} value={o}>{o === "" ? "— todos —" : o}</option>)}
                      </select>
                    ) : (
                      <input value={filterValues[f.name] ?? ""} onChange={(e) => setFilterValues((v) => ({ ...v, [f.name]: e.target.value }))} placeholder={f.placeholder} style={inp} />
                    )}
                    {f.hint ? <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{f.hint}</span> : null}
                  </label>
                ))}
              </div>
            </div>
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
              {response.status === 401 ? (
                <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 6 }}>
                  401 = token ausente ou inválido. Confira se colou um <code>atl_*</code> válido na barra do topo — o secret do webhook (<code>whsec_…</code>) não funciona aqui.
                </div>
              ) : null}
              {response.status === 403 ? (
                <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 6 }}>
                  403 = token de camada errada ou sem escopo. Use um token da camada desta API e com o escopo exigido pelo endpoint.
                </div>
              ) : null}
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
