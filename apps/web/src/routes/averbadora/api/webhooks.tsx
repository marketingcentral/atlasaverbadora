import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Pill, DataTable, type Column, IconButton } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import type { AdminWebhook, AdminWebhookDelivery, ApiEnvironment } from "@atlas/sdk";

export function AverbadoraApiWebhooks() {
  const qc = useQueryClient();
  const [env, setEnv] = useState<ApiEnvironment | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [revealSecret, setRevealSecret] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-webhooks", env],
    queryFn: () => atlas.admin.listWebhooks(env === "all" ? undefined : env),
  });

  const events = q.data?.events ?? [];

  const toggle = useMutation({
    mutationFn: (id: string) => atlas.admin.toggleWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-webhooks"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => atlas.admin.deleteWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-webhooks"] }),
  });
  const [testingId, setTestingId] = useState<string | null>(null);
  const test = useMutation({
    mutationFn: (id: string) => atlas.admin.testWebhook(id),
    onMutate: (id: string) => setTestingId(id),
    onSettled: (_d, _e, id) => {
      setTestingId((cur) => (cur === id ? null : cur));
      qc.invalidateQueries({ queryKey: ["webhook-deliveries", id] });
    },
    onSuccess: (data) => {
      const ds = data.deliveries ?? [];
      const ok = ds.filter((d) => d.status === "success").length;
      const lines = ds
        .map((d) => `${d.status === "success" ? "✓" : "✗"} ${d.event}${d.httpStatus ? ` (HTTP ${d.httpStatus})` : ""}${d.error ? ` — ${d.error}` : ""}`)
        .join("\n");
      alert(`${ok}/${ds.length} eventos entregues ao n8n:\n\n${lines}\n\nVeja em Executions no n8n (uma execução por evento).`);
    },
    onError: (err) => alert(`Erro ao testar: ${(err as Error).message}`),
  });

  const rows = q.data?.webhooks ?? [];

  const cols: Column<AdminWebhook>[] = [
    { key: "url", header: "URL", render: (w) => <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{w.url}</code> },
    { key: "env", header: "Ambiente", render: (w) => <Pill variant={w.environment === "production" ? "averbado" : "pendente"}>{w.environment}</Pill> },
    { key: "partner", header: "Camada", render: (w) => (w.audience === "averbadora" ? "averbadora" : `${w.audience} #${w.partnerId}`) },
    { key: "events", header: "Eventos", render: (w) => <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.events.length} subscritos</span> },
    { key: "active", header: "Status", render: (w) => <Pill variant={w.active ? "emdia" : "expirado"}>{w.active ? "Ativo" : "Pausado"}</Pill> },
    {
      key: "actions",
      header: "",
      render: (w) => (
        <div style={{ display: "flex", gap: 6 }}>
          <IconButton onClick={() => { if (testingId !== w.id) test.mutate(w.id); }}>{testingId === w.id ? "Testando…" : "Testar"}</IconButton>
          <IconButton onClick={() => setSelected(w.id)}>Entregas</IconButton>
          <IconButton onClick={() => toggle.mutate(w.id)}>{w.active ? "Pausar" : "Retomar"}</IconButton>
          <IconButton onClick={() => { if (confirm("Remover webhook?")) remove.mutate(w.id); }}>Remover</IconButton>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>API</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Webhooks</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
            URLs HTTPS dos parceiros receberão eventos da averbadora assinados com HMAC-SHA256.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={env} onChange={(e) => setEnv(e.target.value as typeof env)} style={selStyle}>
            <option value="all">Todos ambientes</option>
            <option value="production">Production</option>
            <option value="sandbox">Sandbox</option>
          </select>
          <Button onClick={() => setModalOpen(true)}>+ Novo webhook</Button>
        </div>
      </header>

      <Card>
        <DataTable<AdminWebhook> rows={rows} columns={cols} rowKey={(w) => w.id} loading={q.isLoading} emptyState="Nenhum webhook cadastrado." />
      </Card>

      {selected ? <DeliveriesPanel id={selected} onClose={() => setSelected(null)} /> : null}

      {modalOpen ? (
        <WebhookModal
          events={events}
          onClose={() => setModalOpen(false)}
          onCreated={(secret) => { setRevealSecret(secret); setModalOpen(false); qc.invalidateQueries({ queryKey: ["admin-webhooks"] }); }}
        />
      ) : null}

      {revealSecret ? (
        <Card>
          <h3 style={{ marginTop: 0, color: "var(--accent)" }}>Secret HMAC criado — copie agora</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Use este secret para validar cada delivery (header <code>X-Atlas-Signature</code>).</p>
          <pre style={{ padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, overflow: "auto", fontFamily: "var(--font-mono)", fontSize: 13 }}>{revealSecret}</pre>
          <Button size="sm" onClick={() => navigator.clipboard.writeText(revealSecret)}>Copiar</Button>
          <Button size="sm" variant="ghost" style={{ marginLeft: 8 }} onClick={() => setRevealSecret(null)}>Fechar</Button>
        </Card>
      ) : null}
    </div>
  );
}

function DeliveriesPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["webhook-deliveries", id],
    queryFn: () => atlas.admin.webhookDeliveries(id),
    refetchInterval: 5000,
  });
  const cols: Column<AdminWebhookDelivery>[] = [
    { key: "scheduledAt", header: "Data", render: (d) => new Date(d.scheduledAt).toLocaleString("pt-BR") },
    { key: "event", header: "Evento", render: (d) => <code style={{ fontSize: 12 }}>{d.event}</code> },
    { key: "status", header: "Status", render: (d) => <Pill variant={d.status === "success" ? "emdia" : d.status === "failed" ? "expirado" : "pendente"}>{d.status}</Pill> },
    { key: "httpStatus", header: "HTTP", render: (d) => d.httpStatus ?? "—" },
    { key: "attempt", header: "Tent.", render: (d) => d.attempt ?? "—" },
    { key: "error", header: "Erro", render: (d) => d.error ? <span style={{ fontSize: 11, color: "var(--danger-500)" }}>{d.error}</span> : "—" },
    { key: "preview", header: "Payload", render: (d) => <code style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.payloadPreview}</code> },
  ];
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <b>Entregas — {id}</b>
        <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
      <DataTable<AdminWebhookDelivery> rows={q.data?.deliveries ?? []} columns={cols} rowKey={(d) => d.id} loading={q.isLoading} emptyState="Nenhuma entrega." />
    </Card>
  );
}

function WebhookModal({ events, onClose, onCreated }: { events: readonly string[]; onClose: () => void; onCreated: (secret: string) => void }) {
  const [url, setUrl] = useState("");
  const [environment, setEnvironment] = useState<ApiEnvironment>("sandbox");
  const [audience, setAudience] = useState<"banco" | "averbadora">("banco");
  const [partnerId, setPartnerId] = useState<number>(1);
  const [selected, setSelected] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: () => atlas.admin.createWebhook({ url, environment, audience, partnerId: audience === "averbadora" ? 0 : partnerId, events: selected }),
    onSuccess: (data) => onCreated(data.secret),
  });

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Novo webhook</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <Fld lbl="URL HTTPS"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.parceiro.com/atlas/webhook" style={inp} /></Fld>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Fld lbl="Ambiente">
              <select value={environment} onChange={(e) => setEnvironment(e.target.value as ApiEnvironment)} style={selStyle}>
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </Fld>
            <Fld lbl="Camada">
              <select value={audience} onChange={(e) => setAudience(e.target.value as "banco" | "averbadora")} style={selStyle}>
                <option value="banco">Banco</option>
                <option value="averbadora">Averbadora</option>
              </select>
            </Fld>
            <Fld lbl="ID parceiro">
              <input type="number" value={partnerId} disabled={audience === "averbadora"} onChange={(e) => setPartnerId(Number(e.target.value))} style={{ ...inp, opacity: audience === "averbadora" ? 0.5 : 1 }} />
            </Fld>
          </div>
          <Fld lbl={`Eventos (${selected.length}/${events.length})`}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, maxHeight: 220, overflow: "auto" }}>
              {events.map((ev) => (
                <label key={ev} style={{ display: "flex", gap: 8, fontSize: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(ev)}
                    onChange={(e) => setSelected((arr) => (e.target.checked ? [...arr, ev] : arr.filter((x) => x !== ev)))}
                  />
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{ev}</code>
                </label>
              ))}
            </div>
          </Fld>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !url || selected.length === 0}>
            {create.isPending ? "Criando…" : "Criar webhook"}
          </Button>
        </div>
        {create.isError ? <p style={{ color: "var(--danger-500)", marginTop: 12, fontSize: 13 }}>{(create.error as Error).message}</p> : null}
      </div>
    </div>
  );
}

function Fld({ lbl, children }: { lbl: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>{lbl}</span>
      {children}
    </label>
  );
}

const inp: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontSize: 14 };
const selStyle: React.CSSProperties = { ...inp, cursor: "pointer" };
const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 };
const modal: React.CSSProperties = { background: "var(--surface)", borderRadius: 12, padding: 24, maxWidth: 640, width: "100%", border: "1px solid var(--border)" };
