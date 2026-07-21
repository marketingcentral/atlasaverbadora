import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminFolha } from "@atlas/sdk";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function AdminFolhas() {
  const qc = useQueryClient();
  // Poll 5s enquanto a tela esta aberta — quando o operador clica "Aplicar em
  // folha" em /averbadora/adf, os contadores aqui atualizam em ate 5s.
  const data = useQuery({
    queryKey: ["admin", "folhas"],
    queryFn: () => atlas.admin.listFolhas(),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  const consolidar = useMutation({
    mutationFn: (id: string) => atlas.admin.consolidarFolha(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "folhas"] }),
  });
  // Fechar folha aqui e' atalho pra teste solo (fluxo normal e' prefeitura
  // fechar em /prefeitura/folhas). Como usa o mesmo endpoint upsert de
  // /admin/folhas com status="fechada", nao precisa handler novo.
  const fechar = useMutation({
    mutationFn: (f: AdminFolha) => atlas.admin.upsertFolha({
      id: f.id, prefeituraId: f.prefeituraId, prefeitura: f.prefeitura,
      competencia: f.competencia, dataCorte: f.dataCorte, dataRepasse: f.dataRepasse,
      status: "fechada",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "folhas"] }),
  });

  const columns: Column<AdminFolha>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "prefeitura", header: "Prefeitura" },
    { key: "competencia", header: "Competência" },
    { key: "dataCorte", header: "Data corte" },
    { key: "dataRepasse", header: "Data repasse", render: (f) => f.dataRepasse ?? "—" },
    {
      key: "adfsAplicadas",
      header: "ADFs aplicadas",
      align: "right",
      render: (f) => {
        const aplic = f.adfsAplicadas ?? 0;
        const total = f.adfsTotal ?? 0;
        if (total === 0) return <span style={{ color: "var(--text-dim)" }}>—</span>;
        return (
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            <b style={{ color: aplic > 0 ? "var(--emerald-500)" : "var(--text)" }}>{aplic}</b>
            <span style={{ color: "var(--text-dim)" }}> / {total}</span>
          </span>
        );
      },
    },
    {
      key: "valorAplicado",
      header: "Valor aplicado",
      align: "right",
      render: (f) => {
        const v = f.valorAplicado ?? 0;
        if (v === 0) return <span style={{ color: "var(--text-dim)" }}>—</span>;
        return <span style={{ color: "var(--emerald-500)", fontWeight: 600 }}>{fmtBRL(v)}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (f) => (
        <Pill variant={f.status === "consolidada" ? "averbado" : f.status === "fechada" ? "emdia" : "pendente"}>{f.status}</Pill>
      ),
    },
    {
      key: "acoes",
      header: "",
      align: "right",
      render: (f) => {
        if (f.status === "aberta") {
          return (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={fechar.isPending}
              onClick={() => fechar.mutate(f)}
              title="Marca folha como fechada (normalmente a prefeitura faz isso em /prefeitura/folhas)"
            >
              Fechar
            </Button>
          );
        }
        if (f.status === "fechada") {
          return (
            <Button
              size="sm"
              type="button"
              disabled={consolidar.isPending}
              onClick={() => consolidar.mutate(f.id)}
              title="Ao consolidar, cada contrato averbado da competencia avanca +1 parcela paga"
            >
              ✓ Consolidar
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Folhas por competência</h1>
        <p style={{ color: "var(--text-muted)" }}>Estado das folhas das prefeituras afiliadas (aberta → fechada → consolidada). Só a averbadora consolida.</p>
      </header>

      <FolhasFiltros
        todas={data.data?.folhas ?? []}
        columns={columns}
        loading={data.isLoading}
      />

    </div>
  );
}

/** Filtros aplicados client-side (todas as folhas ja vem no /admin/folhas):
 *   - Prefeitura (dropdown com as prefeituras que tem folha)
 *   - Competencia INI/FIM (YYYY-MM inputs)
 *  Default: ultimas 12 competencias, todas prefeituras. Ordena DESC (mais
 *  recente primeiro) — cliente pediu pra evitar poluicao visual quando a
 *  base envelhecer (5 anos = 60 folhas por prefeitura). */
function FolhasFiltros({
  todas,
  columns,
  loading,
}: {
  todas: AdminFolha[];
  columns: Column<AdminFolha>[];
  loading: boolean;
}) {
  // YYYY-MM (input browser). Backend usa YYYYMM sem separador.
  const compToInput = (c: string): string => /^\d{6}$/.test(c) ? `${c.slice(0, 4)}-${c.slice(4, 6)}` : c;
  const inputToComp = (v: string): string => v.replace(/[^0-9]/g, "");

  const prefs = useMemo(
    () => Array.from(new Map(todas.map((f) => [f.prefeituraId, f.prefeitura])).entries()),
    [todas],
  );
  const [prefFiltro, setPrefFiltro] = useState<number | "">("");
  // Default competencia FIM = mais recente; INI = 12 meses antes.
  const compsExistentes = useMemo(() => Array.from(new Set(todas.map((f) => f.competencia))).sort(), [todas]);
  const maisRecente = compsExistentes[compsExistentes.length - 1] ?? "";
  const doze = compsExistentes.length >= 12
    ? (compsExistentes[compsExistentes.length - 12] ?? "")
    : (compsExistentes[0] ?? "");
  const [compIni, setCompIni] = useState(compToInput(doze));
  const [compFim, setCompFim] = useState(compToInput(maisRecente));

  const filtradas = useMemo(() => {
    const iniComp = inputToComp(compIni);
    const fimComp = inputToComp(compFim);
    return todas
      .filter((f) => {
        if (typeof prefFiltro === "number" && f.prefeituraId !== prefFiltro) return false;
        if (iniComp && f.competencia < iniComp) return false;
        if (fimComp && f.competencia > fimComp) return false;
        return true;
      })
      .sort((a, b) => b.competencia.localeCompare(a.competencia)); // DESC
  }, [todas, prefFiltro, compIni, compFim]);

  const reset = () => { setPrefFiltro(""); setCompIni(compToInput(doze)); setCompFim(compToInput(maisRecente)); };

  return (
    <>
      <div style={{
        display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap",
        padding: 12, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 10,
      }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Prefeitura
          <select
            value={prefFiltro}
            onChange={(e) => setPrefFiltro(e.target.value ? Number(e.target.value) : "")}
            style={{ minWidth: 220, padding: "8px 10px", borderRadius: 8, background: "var(--bg-elev-2)", border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: 13, textTransform: "none", fontWeight: 400, letterSpacing: 0 }}
          >
            <option value="">Todas</option>
            {prefs.map(([id, nome]) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          De (competência)
          <input
            type="month"
            value={compIni}
            onChange={(e) => setCompIni(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-elev-2)", border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: 13 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Até (competência)
          <input
            type="month"
            value={compFim}
            onChange={(e) => setCompFim(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-elev-2)", border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: 13 }}
          />
        </label>
        <Button variant="ghost" onClick={reset} title="Volta pra ultimas 12 competencias / todas prefeituras">
          Limpar filtros
        </Button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
          {filtradas.length} de {todas.length} folha(s)
        </span>
      </div>
      <DataTable columns={columns} rows={filtradas} rowKey={(f) => f.id} loading={loading} />
    </>
  );
}
