import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, FilterBar, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraServidor } from "@atlas/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function PrefeituraServidores() {
  const [search, setSearch] = useState("");
  const q = useQuery({ queryKey: ["prefeitura", "servidores"], queryFn: () => atlas.prefeitura.servidores() });

  const filtered = (q.data?.servidores ?? []).filter((s) =>
    search ? `${s.nome} ${s.matricula} ${s.cpfMasked}`.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const columns: Column<PrefeituraServidor>[] = [
    { key: "nome", header: "Nome" },
    { key: "matricula", header: "Matrícula", mono: true },
    { key: "cpfMasked", header: "CPF", mono: true },
    { key: "vinculo", header: "Vínculo" },
    { key: "situacaoFuncional", header: "Situação" },
    { key: "salarioLiquido", header: "Salário líq.", align: "right", render: (s) => fmtBRL(s.salarioLiquido) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Servidores do município</h1>
      </header>
      <FilterBar searchValue={search} onSearchChange={setSearch} onReset={() => setSearch("")} />
      <DataTable columns={columns} rows={filtered} rowKey={(s) => s.matricula} loading={q.isLoading} emptyState="Nenhum servidor encontrado." />
    </div>
  );
}
