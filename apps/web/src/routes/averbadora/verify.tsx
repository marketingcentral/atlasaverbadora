import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

/**
 * /averbadora/verify — camada 2 da estrategia de teste intensivo.
 * Roda 6 grupos de invariantes cross-profile (ver apps/api/src/modules/admin/
 * verify.ts). Detecta bugs tipo "banco fantasma", "taxa 179%", "ADF orfa"
 * ANTES do cliente ver.
 */

const GRUPO_LABEL: Record<string, string> = {
  A: "A — Consistência de banco",
  B: "B — Formato de taxa",
  C: "C — Estados coerentes",
  D: "D — IDs únicos",
  E: "E — Cross-profile amostral",
  F: "F — Órfãos e stale",
};

const GRUPO_DESC: Record<string, string> = {
  A: 'Previne "Scred Financeira" e outros bancos fantasmas. Cada contrato/oferta/convênio tem que apontar pra um banco/prefeitura que existe.',
  B: 'Previne taxa 179% (percent salvo como cru) e 0.02% (cru interpretado como percent). Range esperado por origem.',
  C: 'folhaStatus e situação não podem se contradizer. ADF sem contrato = órfã.',
  D: 'Duplicata de idUnico entre ADFs da mesma prefeitura é colisão iminente.',
  E: 'Amostra contratos vivos e valida bancoNome + produto coerente entre averbadora/servidor/prefeitura.',
  F: 'Servidores sem vínculo, contratos com convênio deletado, ofertas expiradas ainda ativas.',
};

export function AverbadoraVerify() {
  const [fresh, setFresh] = useState(false);
  const q = useQuery({
    queryKey: ["admin", "verify", fresh],
    queryFn: () => atlas.admin.verify({ fresh }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const total = useMemo(() => {
    if (!q.data) return { ok: 0, fail: 0 };
    let ok = 0, fail = 0;
    for (const cs of Object.values(q.data.grupos)) for (const c of cs) c.ok ? ok++ : fail++;
    return { ok, fail };
  }, [q.data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Verificação de invariantes</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 780 }}>
          Roda automaticamente a cada 60s. Detecta divergências cross-profile antes de virar bug pro cliente
          (banco fantasma, taxa em formato errado, ADF órfã, contratos que somem entre telas).
          Cache 20s no backend — clique "Rodar agora" pra forçar atualização imediata.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <SummaryCard label="Status geral" value={q.data?.ok ? "TUDO OK" : q.isPending ? "…" : "COM PROBLEMAS"} accent={q.data?.ok ? "ok" : "fail"} />
        <SummaryCard label="Checks OK" value={String(total.ok)} accent="ok" />
        <SummaryCard label="Checks com falha" value={String(total.fail)} accent={total.fail > 0 ? "fail" : "ok"} />
        <SummaryCard label="Última execução" value={q.data ? new Date(q.data.geradoEm).toLocaleTimeString("pt-BR") : "—"} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button variant="ghost" onClick={() => { setFresh(true); void q.refetch(); }}>Rodar agora (força fresh)</Button>
        {q.error ? <span style={{ color: "var(--danger-500)" }}>{(q.error as Error).message}</span> : null}
      </div>

      {q.isPending ? (
        <div style={{ color: "var(--text-muted)" }}>Carregando…</div>
      ) : q.data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(q.data.grupos).map(([letra, checks]) => (
            <GrupoCard key={letra} letra={letra} checks={checks} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GrupoCard({ letra, checks }: { letra: string; checks: { nome: string; ok: boolean; detalhes?: string; exemplos?: unknown[] }[] }) {
  const [aberto, setAberto] = useState(false);
  const nFail = checks.filter((c) => !c.ok).length;
  const cor = nFail > 0 ? "var(--danger-500)" : "var(--emerald-500)";
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setAberto((v) => !v)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: cor }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{GRUPO_LABEL[letra] ?? letra}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{GRUPO_DESC[letra]}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {checks.length - nFail}/{checks.length} OK · <b style={{ color: nFail > 0 ? "var(--danger-500)" : "var(--emerald-500)" }}>{aberto ? "▲" : "▼"}</b>
        </div>
      </div>
      {aberto && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {checks.map((c, i) => (
            <div key={i} style={{ padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, borderLeft: `3px solid ${c.ok ? "var(--emerald-500)" : "var(--danger-500)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Pill variant={c.ok ? "aceita" : "rejeitada"}>{c.ok ? "OK" : "FALHA"}</Pill>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</span>
              </div>
              {c.detalhes ? (
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>{c.detalhes}</div>
              ) : null}
              {c.exemplos && c.exemplos.length > 0 ? (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-dim)" }}>Exemplos ({c.exemplos.length})</summary>
                  <pre style={{ marginTop: 8, padding: 8, background: "var(--bg-elev)", borderRadius: 6, fontSize: 11, overflow: "auto", maxHeight: 200 }}>
                    {JSON.stringify(c.exemplos, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: "ok" | "fail" }) {
  const cor = accent === "ok" ? "var(--emerald-500)" : accent === "fail" ? "var(--danger-500)" : "var(--text)";
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: cor }}>{value}</div>
    </div>
  );
}
