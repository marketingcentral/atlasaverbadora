import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, FilterBar, FilterCheckboxGroup, type Column } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { downloadCsv } from "../../../lib/csv";

const ALL_FIELDS = [
  { value: "adf", label: "ADF" },
  { value: "matricula", label: "Matrícula" },
  { value: "nome", label: "Colaborador" },
  { value: "tipoContrato", label: "Tipo" },
  { value: "totalParcelas", label: "Parcelas" },
  { value: "valorParcela", label: "Valor parcela" },
  { value: "valorFinanciado", label: "Valor financiado" },
  { value: "taxaAm", label: "Taxa" },
  { value: "cetAm", label: "CET" },
  { value: "saldoDevedor", label: "Saldo devedor" },
  { value: "situacao", label: "Situação" },
];

const DEFAULT_SELECTED = new Set(["adf", "nome", "valorFinanciado", "situacao"]);

export function BancoRelatorioGerador() {
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const [search, setSearch] = useState("");
  const all = useQuery({ queryKey: ["banco", "rel", "consig", "all"], queryFn: () => atlas.banco.relatorioConsignacoes() });

  const cols: Column<Record<string, unknown>>[] = useMemo(
    () =>
      ALL_FIELDS.filter((f) => selected.has(f.value)).map((f) => ({
        key: f.value,
        header: f.label,
        render: (r) => {
          const v = r[f.value];
          if (typeof v === "number" && f.value.startsWith("valor")) return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
          if (typeof v === "number" && (f.value === "taxaAm" || f.value === "cetAm")) return `${(v * 100).toFixed(2)}%`;
          return v == null ? "—" : String(v);
        },
      })),
    [selected],
  );

  const allRows = (all.data?.linhas ?? []) as unknown as Record<string, unknown>[];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => {
      const hay = `${r.adf ?? ""} ${r.matricula ?? ""} ${r.nome ?? ""} ${r.tipoContrato ?? ""} ${r.situacao ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allRows, search]);

  const resetarFiltros = () => {
    setSelected(new Set(DEFAULT_SELECTED));
    setSearch("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Relatórios
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Gerador de Relatórios</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Escolha os campos que quer exibir e exportar.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const out = rows.map((r) => {
              const o: Record<string, unknown> = {};
              for (const f of ALL_FIELDS) if (selected.has(f.value)) o[f.value] = r[f.value];
              return o;
            });
            downloadCsv("relatorio-personalizado.csv", out);
          }}
        >
          ⬇ Exportar CSV
        </Button>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={resetarFiltros}
      >
        <FilterCheckboxGroup options={ALL_FIELDS} selected={selected} onChange={setSelected} />
      </FilterBar>

      {selected.size === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border-strong)", borderRadius: 12 }}>
          Selecione pelo menos uma coluna para exibir o relatório.
        </div>
      ) : (
        <DataTable columns={cols} rows={rows} rowKey={(r) => String(r.adf)} loading={all.isLoading} />
      )}
    </div>
  );
}
