import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

// ADF pela averbadora — a averbadora aplica/reporta falha em folha; prefeitura
// so recebe/consulta. Cliente disse: "a averbadora que faz a adf, a prefeitura
// so recebe". Substitui o fluxo antigo (que era de gerar PDFs individuais).

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type AdfRow = {
  id: string; adf: string; idUnico: string; cpfMasked: string; matricula: string; nome: string;
  bancoNome: string; prefeituraId: number; prefeituraNome: string; competencia: string;
  valorParcela: number; totalParcelas: number;
  valorFinanciado?: number;
  tipoContrato?: string;
  /** Bucket de margem — distingue Cartao Consignado de Cartao Beneficio quando
   *  tipoContrato=ECONSIGNADO (mesmos os dois; so tipoMargem separa). */
  tipoMargem?: string;
  status: "recebida" | "aplicada" | "falha"; motivo?: string;
  /** ISO timestamp em que o ADF entrou/mudou de status na averbadora — usado para ordenar recentes no topo. */
  atualizadoEm?: string;
};

/** Rotulo do produto — usa tipoContrato + tipoMargem pra distinguir os 4
 *  produtos (Emprestimo/Portabilidade/Cartao Consignado/Cartao Beneficio).
 *  ECONSIGNADO sem tipoMargem cai em "Cartao" (dado antigo). */
function produtoLabel(tipoContrato: string | undefined, tipoMargem?: string): string {
  const t = (tipoContrato ?? "").toUpperCase();
  if (t === "REFIN") return "Portabilidade";
  if (t === "ECONSIGNADO") {
    if (tipoMargem === "CARTAO_BENEFICIOS") return "Cartão Benefício";
    if (tipoMargem === "CARTAO_CONSIGNADO") return "Cartão Consignado";
    return "Cartão";
  }
  return "Empréstimo";
}

export function AdminAdf() {
  const qc = useQueryClient();
  const comps = useQuery({ queryKey: ["admin", "adf-comps"], queryFn: () => atlas.admin.adfCompetencias() });
  const [competencia, setCompetencia] = useState<string>("");
  const [prefeituraFiltro, setPrefeituraFiltro] = useState<string>("");
  // Filtro livre por matricula OU CPF. Comparacao por SUBSTRING dos digitos —
  // funciona pra CPF mascarado (***.***.***-33 casa com "33"), matricula
  // parcial e nome (o `busca` como digitado, sem mascarar, tenta match no nome).
  const [busca, setBusca] = useState<string>("");
  useEffect(() => {
    if (!competencia && comps.data?.competenciaAtual) setCompetencia(comps.data.competenciaAtual);
  }, [comps.data, competencia]);

  const adfsQ = useQuery({
    queryKey: ["admin", "adf", competencia],
    queryFn: () => atlas.admin.adfList({ competencia }),
    enabled: !!competencia,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  const rows: AdfRow[] = adfsQ.data?.adfs ?? [];
  const prefsUnicas = useMemo(
    () => Array.from(new Set(rows.map((r) => r.prefeituraNome))).sort(),
    [rows],
  );
  const filtradas = useMemo(() => {
    let base = prefeituraFiltro ? rows.filter((r) => r.prefeituraNome === prefeituraFiltro) : rows;
    const q = busca.trim();
    if (q) {
      const qDigits = q.replace(/\D/g, "");
      const qLower = q.toLowerCase();
      base = base.filter((r) => {
        // Digitos da busca casam com matricula OU com os digitos do CPF
        // mascarado (permite achar por final "33" mesmo mascarado ***.***.***-33).
        if (qDigits) {
          const matDigits = r.matricula.replace(/\D/g, "");
          const cpfDigits = r.cpfMasked.replace(/\D/g, "");
          if (matDigits.includes(qDigits) || cpfDigits.includes(qDigits)) return true;
        }
        // Fallback: substring no nome (case-insensitive) pra buscar por texto.
        if (r.nome.toLowerCase().includes(qLower)) return true;
        return false;
      });
    }
    // Recentes no topo — a API preenche `atualizadoEm` na criação e em toda troca de status.
    // Fallback pelo `id` (ADF-YYYYMM-<num>) mantém ordem estavel se o campo faltar.
    return [...base].sort((a, b) => {
      const ta = a.atualizadoEm ?? "";
      const tb = b.atualizadoEm ?? "";
      if (ta !== tb) return tb.localeCompare(ta);
      return b.id.localeCompare(a.id);
    });
  }, [rows, prefeituraFiltro, busca]);

  // Cliente pediu (16/07/2026): tres blocos separados — RECEBIDAS no topo
  // (sempre visivel, mesmo vazio, pra ADF nova entrar num lugar previsivel),
  // Falhas no meio (so aparece se tiver), Aplicadas embaixo. Sort desc por
  // atualizadoEm ja foi feita no filtradas — nova ADF cai automaticamente no
  // topo do bloco Recebidas.
  const recebidas = useMemo(() => filtradas.filter((a) => a.status === "recebida"), [filtradas]);
  const falhas = useMemo(() => filtradas.filter((a) => a.status === "falha"), [filtradas]);
  const aplicadas = useMemo(() => filtradas.filter((a) => a.status === "aplicada"), [filtradas]);

  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => { setSel(new Set()); }, [competencia, prefeituraFiltro, busca]);

  const confirmar = useMutation({
    mutationFn: (ids: string[]) => atlas.admin.confirmarAdfAdmin(ids),
    onSuccess: () => {
      setSel(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "adf"] });
      qc.invalidateQueries({ queryKey: ["admin", "adf-comps"] });
    },
  });
  const falha = useMutation({
    mutationFn: ({ ids, motivo }: { ids: string[]; motivo: string }) => atlas.admin.reportarFalhaAdfAdmin(ids, motivo),
    onSuccess: () => {
      setSel(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "adf"] });
      qc.invalidateQueries({ queryKey: ["admin", "adf-comps"] });
    },
  });

  const totalParcelas = useMemo(() => filtradas.reduce((s, a) => s + a.valorParcela, 0), [filtradas]);
  const totalFinanciado = useMemo(
    () => filtradas.reduce((s, a) => s + (a.valorFinanciado ?? a.valorParcela * a.totalParcelas), 0),
    [filtradas],
  );
  const resumo = useMemo(() => {
    let r = 0, a = 0, f = 0;
    for (const x of filtradas) {
      if (x.status === "recebida") r++;
      else if (x.status === "aplicada") a++;
      else if (x.status === "falha") f++;
    }
    return { r, a, f };
  }, [filtradas]);

  const columns: Column<AdfRow>[] = [
    {
      key: "sel",
      header: "",
      render: (a) => (
        a.status === "recebida" ? (
          <input
            type="checkbox"
            checked={sel.has(a.id)}
            onChange={(e) => {
              const n = new Set(sel);
              e.target.checked ? n.add(a.id) : n.delete(a.id);
              setSel(n);
            }}
          />
        ) : null
      ),
    },
    { key: "adf", header: "ADF", mono: true },
    { key: "idUnico", header: "ID único", mono: true },
    { key: "prefeitura", header: "Prefeitura", render: (a) => a.prefeituraNome },
    { key: "banco", header: "Banco", render: (a) => a.bancoNome },
    { key: "cpfMasked", header: "CPF", mono: true },
    { key: "nome", header: "Servidor" },
    {
      key: "categoria",
      header: "Categoria",
      render: (a) => (
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          color: "var(--accent)", padding: "2px 8px", borderRadius: 999,
          border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
          background: "color-mix(in srgb, var(--accent) 10%, transparent)",
        }}>
          {produtoLabel(a.tipoContrato, a.tipoMargem)}
        </span>
      ),
    },
    { key: "valorParcela", header: "Parcela", align: "right", render: (a) => fmtBRL(a.valorParcela) },
    {
      key: "valorFinanciado",
      header: "Valor total",
      align: "right",
      render: (a) => (
        <span style={{ color: "var(--emerald-500)", fontWeight: 700 }}>
          {fmtBRL(a.valorFinanciado ?? a.valorParcela * a.totalParcelas)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <div>
          <Pill variant={a.status === "aplicada" ? "averbado" : a.status === "falha" ? "expirado" : "pendente"}>
            {a.status}
          </Pill>
          {a.motivo ? <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{a.motivo}</div> : null}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>ADF — Autorização de Desconto em Folha</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
          Visão consolidada de todas as prefeituras. A averbadora aplica em folha ou reporta falha —
          a prefeitura só recebe/consulta. O banco vê o estado da ADF automaticamente pelo contrato.
        </p>
      </header>

      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Competência:</span>
          {(comps.data?.competencias ?? []).map((c) => (
            <button
              key={c.competencia}
              onClick={() => setCompetencia(c.competencia)}
              style={{
                padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13,
                border: `1px solid ${competencia === c.competencia ? "var(--accent)" : "var(--border)"}`,
                background: competencia === c.competencia ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                color: "var(--text)",
              }}
            >
              {c.competencia} <span style={{ color: "var(--text-muted)" }}>({c.aplicadas}/{c.total})</span>
            </button>
          ))}
          {(comps.data?.competencias.length ?? 0) === 0 ? (
            <span style={{ fontSize: 13 }}>{comps.data?.competenciaAtual ?? "—"}</span>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center" }}>
            Prefeitura:
            <select
              value={prefeituraFiltro}
              onChange={(e) => setPrefeituraFiltro(e.target.value)}
              style={{
                padding: "6px 10px", borderRadius: 8,
                border: "1px solid var(--border-strong)",
                background: "var(--bg-elev)", color: "var(--text)", fontSize: 13,
              }}
            >
              <option value="">Todas</option>
              {prefsUnicas.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center", flex: "1 1 240px", minWidth: 200 }}>
            Buscar:
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Matrícula, CPF ou nome"
                style={{
                  width: "100%", padding: "6px 30px 6px 10px", borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg-elev)", color: "var(--text)", fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
              {busca ? (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  aria-label="Limpar busca"
                  title="Limpar"
                  style={{
                    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--text-dim)", fontSize: 16, lineHeight: 1, padding: "2px 4px",
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          </label>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {filtradas.length} ADFs · total parcelas <b style={{ color: "var(--text)" }}>{fmtBRL(totalParcelas)}</b> · valor total <b style={{ color: "var(--emerald-500)" }}>{fmtBRL(totalFinanciado)}</b>
            {" · "}
            <span style={{ color: "var(--gold-500)" }}>{resumo.r} recebidas</span>
            {" / "}
            <span style={{ color: "var(--emerald-500)" }}>{resumo.a} aplicadas</span>
            {" / "}
            <span style={{ color: "var(--danger-500)" }}>{resumo.f} falhas</span>
          </span>
        </div>
      </Card>

      {sel.size > 0 ? (
        <Card style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ fontSize: 14 }}>{sel.size} selecionada(s)</b>
          <span style={{ flex: 1 }} />
          <Button
            size="sm"
            onClick={() => confirmar.mutate([...sel])}
            disabled={confirmar.isPending}
          >
            Aplicar em folha
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const motivo = prompt("Motivo da falha?");
              if (motivo && motivo.trim().length >= 3) falha.mutate({ ids: [...sel], motivo: motivo.trim() });
            }}
            disabled={falha.isPending}
          >
            Reportar falha
          </Button>
        </Card>
      ) : null}

      {/* Bloco 1 — RECEBIDAS. Sempre visivel (mesmo vazio) pra que uma ADF
          nova tenha um lugar previsivel pra chegar — sem se misturar com as
          aplicadas. Recentes no topo (sort desc por atualizadoEm ja aplicado). */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-500)" }}>
          Recebidas ({recebidas.length})
          <span style={{ marginLeft: 8, fontWeight: 400, color: "var(--text-dim)", letterSpacing: 0, textTransform: "none" }}>
            · novas ADFs entram no topo desta seção
          </span>
        </h2>
        <DataTable
          columns={columns}
          rows={recebidas}
          rowKey={(a) => a.id}
          loading={adfsQ.isLoading}
          emptyState="Nenhuma ADF nova aguardando aplicação nesta competência."
        />
      </section>

      {/* Bloco 2 — FALHAS. So aparece se houver algum registro. */}
      {falhas.length > 0 ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--danger-500)" }}>
            Falhas ({falhas.length})
            <span style={{ marginLeft: 8, fontWeight: 400, color: "var(--text-dim)", letterSpacing: 0, textTransform: "none" }}>
              · precisam ser reprocessadas ou corrigidas
            </span>
          </h2>
          <DataTable
            columns={columns}
            rows={falhas}
            rowKey={(a) => a.id}
            loading={adfsQ.isLoading}
          />
        </section>
      ) : null}

      {/* Bloco 3 — APLICADAS (ja em folha). So aparece se houver algum. */}
      {aplicadas.length > 0 ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--emerald-500)" }}>
            Aplicadas ({aplicadas.length})
            <span style={{ marginLeft: 8, fontWeight: 400, color: "var(--text-dim)", letterSpacing: 0, textTransform: "none" }}>
              · já em folha
            </span>
          </h2>
          <DataTable
            columns={columns}
            rows={aplicadas}
            rowKey={(a) => a.id}
            loading={adfsQ.isLoading}
          />
        </section>
      ) : null}
    </div>
  );
}
