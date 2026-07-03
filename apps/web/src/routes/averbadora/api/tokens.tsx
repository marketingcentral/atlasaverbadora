import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Pill, DataTable, type Column } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import type { AdminApiToken, ApiAudience, ApiEnvironment, ApiScope } from "@atlas/sdk";

const AUDIENCE_LABEL: Record<ApiAudience, string> = {
  banco: "Banco",
  servidor: "Servidor",
  averbadora: "Averbadora",
};

// Fallback caso o backend não envie scopesByAudience.
const SCOPES_FALLBACK: Record<ApiAudience, ApiScope[]> = {
  banco: ["banco:read", "banco:write", "banco:webhooks"],
  servidor: ["servidor:read", "servidor:write"],
  averbadora: ["averbadora:read", "averbadora:write", "averbadora:webhooks"],
};

export function AverbadoraApiTokens() {
  const qc = useQueryClient();
  const [env, setEnv] = useState<ApiEnvironment | "all">("all");
  const [aud, setAud] = useState<ApiAudience | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  // Plaintexts revelados nesta sessão do navegador (perde no refresh — não há persistência).
  const [revealable, setRevealable] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Token recém-criado — abre modal de revelação imediato.
  const [justCreated, setJustCreated] = useState<{ name: string; plaintext: string } | null>(null);

  const q = useQuery({
    queryKey: ["api-tokens", env, aud],
    queryFn: () => atlas.admin.listApiTokens({
      ...(env === "all" ? {} : { environment: env }),
      ...(aud === "all" ? {} : { audience: aud }),
    }),
  });

  const scopesByAudience = q.data?.scopesByAudience ?? SCOPES_FALLBACK;

  const rows = q.data?.tokens ?? [];

  // Token que o usuário pediu para pausar — segura o aviso antes de confirmar.
  const [confirmPause, setConfirmPause] = useState<AdminApiToken | null>(null);
  const pause = useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => atlas.admin.pauseApiToken(id, paused),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-tokens"] }),
  });

  const cols: Column<AdminApiToken>[] = [
    { key: "name", header: "Nome", render: (t) => <b>{t.name}</b> },
    { key: "audience", header: "Camada", render: (t) => <Pill variant="aceita">{AUDIENCE_LABEL[t.audience] ?? t.audience}</Pill> },
    { key: "env", header: "Ambiente", render: (t) => <Pill variant={t.environment === "production" ? "averbado" : "pendente"}>{t.environment}</Pill> },
    { key: "partner", header: "ID", render: (t) => (t.audience === "averbadora" ? "—" : `#${t.partnerId}`) },
    {
      key: "prefix",
      header: "Prefixo",
      render: (t) => {
        const plaintext = revealable[t.id];
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{t.prefix}</code>
            {plaintext ? (
              <button
                type="button"
                title="Copiar token (disponível apenas nesta sessão)"
                onClick={async () => {
                  await navigator.clipboard.writeText(plaintext);
                  setCopiedId(t.id);
                  setTimeout(() => setCopiedId((curr) => (curr === t.id ? null : curr)), 1500);
                }}
                style={{
                  border: "1px solid var(--border-strong)",
                  background: "transparent",
                  color: copiedId === t.id ? "var(--emerald-500)" : "var(--accent)",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  lineHeight: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {copiedId === t.id ? "✓" : "⧉"}
              </button>
            ) : null}
          </div>
        );
      },
    },
    { key: "scopes", header: "Escopos", render: (t) => <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.scopes.length}</span> },
    { key: "lastUsedAt", header: "Último uso", render: (t) => t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString("pt-BR") : "—" },
    {
      key: "status",
      header: "Status",
      render: (t) => {
        const manual = !!t.pausedAt;
        const porBanco = !manual && !!t.bancoInativo;
        const label = manual ? "Desativado" : porBanco ? "Desativado (banco)" : "Ativo";
        const dica = manual ? "Token desativado manualmente. O perfil/parceria segue ativo." : porBanco ? "Inativo porque o banco dono está pausado. Volta ao reativar o banco." : undefined;
        return (
          <span title={dica}>
            <Pill variant={manual || porBanco ? "expirado" : "emdia"}>{label}</Pill>
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => {
        if (t.pausedAt) {
          return (
            <Button size="sm" variant="ghost" disabled={pause.isPending} onClick={() => pause.mutate({ id: t.id, paused: false })}>
              ▶ Reativar token
            </Button>
          );
        }
        if (t.bancoInativo) {
          return <span style={{ fontSize: 11, color: "var(--text-muted)" }}>reative o banco</span>;
        }
        return (
          <Button size="sm" variant="ghost" disabled={pause.isPending} onClick={() => setConfirmPause(t)}>
            ⏸ Desativar token
          </Button>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>API</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Tokens de acesso</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
            Cada token pertence a uma camada (Banco / Servidor / Averbadora) e consome <code>/v1/external/&lt;camada&gt;/*</code>. Plaintext exibido apenas na criação.
            Você pode desativar um token individualmente sem desativar o perfil/parceria. Nada é apagado: desativar é reversível (dá pra reativar depois). Tokens de um banco pausado também ficam inativos e voltam ao reativar o banco.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={aud} onChange={(e) => setAud(e.target.value as typeof aud)} style={selStyle}>
            <option value="all">Todas camadas</option>
            <option value="banco">Banco</option>
            <option value="servidor">Servidor</option>
            <option value="averbadora">Averbadora</option>
          </select>
          <select value={env} onChange={(e) => setEnv(e.target.value as typeof env)} style={selStyle}>
            <option value="all">Todos ambientes</option>
            <option value="production">Production</option>
            <option value="sandbox">Sandbox</option>
          </select>
          <Button onClick={() => setModalOpen(true)}>+ Novo token</Button>
        </div>
      </header>

      <Card>
        <DataTable<AdminApiToken> rows={rows} columns={cols} rowKey={(t) => t.id} loading={q.isLoading} emptyState="Nenhum token." />
      </Card>

      {modalOpen ? (
        <TokenModal
          scopesByAudience={scopesByAudience}
          onClose={() => setModalOpen(false)}
          onCreated={(id, name, plaintext) => {
            setRevealable((prev) => ({ ...prev, [id]: plaintext }));
            setJustCreated({ name, plaintext });
            qc.invalidateQueries({ queryKey: ["api-tokens"] });
          }}
        />
      ) : null}

      {justCreated ? (
        <RevealModal token={justCreated} onClose={() => setJustCreated(null)} />
      ) : null}

      {confirmPause ? (
        <PauseWarningModal
          token={confirmPause}
          pending={pause.isPending}
          onCancel={() => setConfirmPause(null)}
          onConfirm={() => pause.mutate({ id: confirmPause.id, paused: true }, { onSuccess: () => setConfirmPause(null) })}
        />
      ) : null}
    </div>
  );
}

function PauseWarningModal({ token, pending, onCancel, onConfirm }: { token: AdminApiToken; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dono = token.audience === "averbadora" ? "a Averbadora" : token.audience === "banco" ? `o banco #${token.partnerId}` : `o servidor #${token.partnerId}`;
  return (
    <div style={backdrop} onClick={onCancel}>
      <div style={{ ...modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>⏸</span>
          <h3 style={{ margin: 0 }}>Desativar o token "{token.name}"?</h3>
        </div>
        <div
          style={{
            marginTop: 14, padding: "12px 14px", borderRadius: 10,
            border: "1px solid color-mix(in srgb, #f59e0b 55%, transparent)",
            background: "color-mix(in srgb, #f59e0b 12%, transparent)",
            color: "var(--text)", fontSize: 13.5, lineHeight: 1.55,
          }}
        >
          Isto <b>desativa apenas este token de acesso</b> — ele para de autenticar na API imediatamente.
          <br />
          <b>{dono} continua ativo</b> e não é afetado: pode operar normalmente e gerar novos tokens. A ação é reversível — você pode reativar o token depois.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={pending}>{pending ? "Desativando…" : "Desativar token"}</Button>
        </div>
      </div>
    </div>
  );
}

function TokenModal({ scopesByAudience, onClose, onCreated }: { scopesByAudience: Record<ApiAudience, ApiScope[]>; onClose: () => void; onCreated: (id: string, name: string, plaintext: string) => void }) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<ApiEnvironment>("sandbox");
  const [audience, setAudience] = useState<ApiAudience>("banco");
  const [partnerId, setPartnerId] = useState<number>(1);
  const [scopes, setScopes] = useState<ApiScope[]>([scopesByAudience.banco[0]!]);

  const availableScopes = scopesByAudience[audience] ?? [];

  function changeAudience(next: ApiAudience) {
    setAudience(next);
    setScopes([(scopesByAudience[next] ?? [])[0]!]); // reset escopos ao trocar camada
    if (next === "averbadora") setPartnerId(0);
    else if (partnerId === 0) setPartnerId(1);
  }

  const create = useMutation({
    mutationFn: () => atlas.admin.createApiToken({ name, environment, audience, partnerId, scopes }),
    onSuccess: (data) => { onCreated(data.token.id, data.token.name, data.plaintext); onClose(); },
  });

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Novo token de API</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <Fld lbl="Nome">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Banco SCred — integração" style={inp} />
          </Fld>
          <Fld lbl="Camada (audience)">
            <div style={{ display: "flex", gap: 8 }}>
              {(["banco", "servidor", "averbadora"] as ApiAudience[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => changeAudience(a)}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${audience === a ? "var(--accent)" : "var(--border-strong)"}`,
                    background: audience === a ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
                    color: "var(--text)", fontWeight: audience === a ? 700 : 500, fontSize: 13,
                  }}
                >
                  {AUDIENCE_LABEL[a]}
                </button>
              ))}
            </div>
          </Fld>
          <div style={{ display: "grid", gridTemplateColumns: audience === "averbadora" ? "1fr" : "1fr 1fr", gap: 12 }}>
            <Fld lbl="Ambiente">
              <select value={environment} onChange={(e) => setEnvironment(e.target.value as ApiEnvironment)} style={selStyle}>
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </Fld>
            {audience !== "averbadora" ? (
              <Fld lbl={audience === "banco" ? "ID do banco" : "ID do servidor"}>
                <input type="number" value={partnerId} onChange={(e) => setPartnerId(Number(e.target.value))} style={inp} />
              </Fld>
            ) : null}
          </div>
          <Fld lbl={`Escopos da camada ${AUDIENCE_LABEL[audience]}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 12, background: "var(--bg-elev-2)", borderRadius: 8 }}>
              {availableScopes.map((s) => (
                <label key={s} style={{ display: "flex", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={(e) => setScopes((arr) => (e.target.checked ? [...arr, s] : arr.filter((x) => x !== s)))}
                  />
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{s}</code>
                </label>
              ))}
            </div>
          </Fld>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !name || scopes.length === 0}>
            {create.isPending ? "Criando…" : "Criar token"}
          </Button>
        </div>
        {create.isError ? <p style={{ color: "var(--danger-500)", marginTop: 12, fontSize: 13 }}>{(create.error as Error).message}</p> : null}
      </div>
    </div>
  );
}

function RevealModal({ token, onClose }: { token: { name: string; plaintext: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(token.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <h3 style={{ margin: 0 }}>Token "{token.name}" criado</h3>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, #f59e0b 55%, transparent)",
            background: "color-mix(in srgb, #f59e0b 12%, transparent)",
            color: "var(--text)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: "#d97706" }}>⚠ Copie agora — esta é a única vez que o token será exibido.</b><br />
          Por segurança, o Atlas guarda apenas um hash do token. Depois de fechar esta janela
          <b> não será mais possível copiá-lo</b>. Se perder, exclua e gere um novo.
        </div>

        <pre
          style={{
            marginTop: 14,
            padding: 14,
            background: "var(--bg-elev-2)",
            borderRadius: 10,
            overflow: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            userSelect: "all",
            border: "1px solid var(--border)",
          }}
        >
          {token.plaintext}
        </pre>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <Button onClick={copy}>{copied ? "✓ Copiado!" : "↗ Copiar token"}</Button>
          <Button variant="ghost" onClick={onClose}>Já copiei, fechar</Button>
        </div>
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
const modal: React.CSSProperties = { background: "var(--surface)", borderRadius: 12, padding: 24, maxWidth: 560, width: "100%", border: "1px solid var(--border)" };
