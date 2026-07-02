import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ContratosTable, FilterBar, FilterCheckboxGroup } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { downloadCsv } from "../../../lib/csv";

const SITUACOES = [
  { value: "ativo", label: "Ativos" },
  { value: "cancelado", label: "Cancelados" },
  { value: "quitado", label: "Quitados" },
  { value: "migrado", label: "Migrados" },
  { value: "finalizado", label: "Finalizados" },
];

export function BancoGerenciadorContratos() {
  const [search, setSearch] = useState("");
  const [situacoes, setSituacoes] = useState<Set<string>>(new Set(["ativo"]));
  const [exato, setExato] = useState(false);

  const data = useQuery({
    queryKey: ["banco", "contratos", "all", [...situacoes].sort().join(","), search, exato],
    queryFn: () =>
      atlas.banco.contratos({
        situacao: situacoes.size > 0 ? [...situacoes].map((s) => s.charAt(0).toUpperCase() + s.slice(1)) : undefined,
        colaborador: search || undefined,
      }),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Gerenciador
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Contratos do convênio</h1>
      </header>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        exactMatch={exato}
        onExactMatchChange={setExato}
        onReset={() => {
          setSearch("");
          setSituacoes(new Set(["ativo"]));
          setExato(false);
        }}
        onExport={() => {
          const contratos = data.data?.contratos ?? [];
          downloadCsv(
            "contratos-convenio.csv",
            contratos.map((c) => ({
              adf: c.adf,
              cpf: c.cpfMasked,
              nome: c.nome,
              matricula: c.matricula,
              tipoContrato: c.tipoContrato,
              situacao: c.situacao,
              parcelas: c.totalParcelas,
              valorParcela: c.valorParcela,
              convenio: c.convenio,
              lancamento: c.lancamento,
              expiracao: c.expiracao ?? "",
            })),
          );
        }}
      >
        <FilterCheckboxGroup options={SITUACOES} selected={situacoes} onChange={setSituacoes} />
      </FilterBar>

      <ContratosTable
        showColaborador
        loading={data.isLoading}
        rows={(data.data?.contratos ?? []).map((c) => ({
          adf: c.adf,
          situacao: c.situacao,
          lancamento: c.lancamento,
          expiracao: c.expiracao,
          cpfMasked: c.cpfMasked,
          matricula: c.matricula,
          nome: c.nome,
          tipoContrato: c.tipoContrato,
          totalParcelas: c.totalParcelas,
          valorParcela: c.valorParcela,
          convenio: c.convenio,
        }))}
        emptyState="Nenhum contrato no convênio ativo com esses filtros."
      />

    </div>
  );
}
