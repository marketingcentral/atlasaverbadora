import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, FilterBar, SelectField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { downloadCsv } from "../../../lib/csv";
import type { BancoContratoFull } from "@atlas/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function BancoRelatorioConsignacoes() {
  const [tipo, setTipo] = useState<string>("");
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");
  const [search, setSearch] = useState("");

  const data = useQuery({
    queryKey: ["banco", "rel", "consig", tipo, inicio, fim],
    queryFn: () => atlas.banco.relatorioConsignacoes({ tipo: tipo || undefined, inicio: inicio || undefined, fim: fim || undefined }),
  });

  const linhasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = data.data?.linhas ?? [];
    if (!q) return base;
    return base.filter((l) =>
      `${l.adf} ${l.matricula} ${l.nome} ${l.tipoContrato} ${l.situacao}`.toLowerCase().includes(q),
    );
  }, [data.data?.linhas, search]);

  const columns: Column<BancoContratoFull>[] = [
    { key: "adf", header: "ADF", mono: true },
    { key: "matricula", header: "Matrícula" },
    { key: "nome", header: "Colaborador" },
    { key: "tipoContrato", header: "Tipo" },
    { key: "totalParcelas", header: "Parcelas", align: "right" },
    { key: "valorParcela", header: "Valor parcela", align: "right", render: (r) => fmtBRL(r.valorParcela) },
    { key: "valorFinanciado", header: "Valor financiado", align: "right", render: (r) => fmtBRL(r.valorFinanciado) },
    { key: "situacao", header: "Situação" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Relatórios
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Consignações</h1>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Metric label="Total" valor={data.data ? fmtBRL(data.data.totalValorFinanciado) : "—"} />
          <Metric label="Qtd" valor={String(data.data?.quantidade ?? 0)} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              data.data &&
              downloadCsv(
                "consignacoes.csv",
                linhasFiltradas.map((l) => ({
                  adf: l.adf,
                  matricula: l.matricula,
                  nome: l.nome,
                  tipo: l.tipoContrato,
                  parcelas: l.totalParcelas,
                  valorParcela: l.valorParcela,
                  valorFinanciado: l.valorFinanciado,
                  situacao: l.situacao,
                })),
              )
            }
          >
            ⬇ Exportar CSV
          </Button>
        </div>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={() => {
          setTipo("");
          setInicio("");
          setFim("");
          setSearch("");
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <SelectField
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            options={[
              { value: "", label: "Todos" },
              { value: "EMPRESTIMO", label: "Empréstimo" },
              { value: "REFIN", label: "Refinanciamento" },
              { value: "ECONSIGNADO", label: "E-Consignado" },
            ]}
          />
          <TextField label="Início" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <TextField label="Fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
      </FilterBar>

      <DataTable columns={columns} rows={linhasFiltradas} rowKey={(r) => r.adf} loading={data.isLoading} />
    </div>
  );
}

function Metric({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{valor}</div>
    </div>
  );
}
