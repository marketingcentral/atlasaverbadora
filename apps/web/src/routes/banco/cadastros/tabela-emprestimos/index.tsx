import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, IconButton, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../../../lib/sdk";
import type { BancoTabela } from "@atlas/sdk";

const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

export function BancoTabelaEmprestimosLista() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["banco", "tabelas"], queryFn: () => atlas.banco.listTabelas() });
  const remove = useMutation({
    mutationFn: (id: string) => atlas.banco.removerTabela(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banco", "tabelas"] }),
  });

  const columns: Column<BancoTabela>[] = [
    {
      key: "ativo",
      header: "Situação",
      render: (t) => <Pill variant={t.ativo ? "averbado" : "expirado"}>{t.ativo ? "Ativo" : "Inativo"}</Pill>,
    },
    { key: "criadoEm", header: "Data Cadastro", render: (t) => fmtDate(t.criadoEm) },
    { key: "vigenciaInicio", header: "Início Vigência", render: (t) => fmtDate(t.vigenciaInicio) },
    { key: "vigenciaFim", header: "Fim Vigência", render: (t) => fmtDate(t.vigenciaFim) },
    { key: "convenio", header: "Convênio" },
    { key: "taxa", header: "Taxa min/max", render: (t) => `${fmtPct(t.taxaMinAm)} a ${fmtPct(t.taxaMaxAm)}` },
    { key: "prazoMaxMeses", header: "Prazo max" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Cadastros
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Tabela de Empréstimos</h1>
        </div>
        <Button onClick={() => nav("novo")}>+ Inserir</Button>
      </header>

      <DataTable
        columns={columns}
        rows={data.data?.tabelas ?? []}
        rowKey={(t) => t.id}
        loading={data.isLoading}
        actions={(t) => (
          <>
            <IconButton title="Editar" onClick={() => nav(t.id)}>✎</IconButton>
            <IconButton
              title="Remover"
              danger
              onClick={() => {
                if (confirm(`Remover tabela ${t.id}?`)) remove.mutate(t.id);
              }}
            >
              🗑
            </IconButton>
          </>
        )}
      />
    </div>
  );
}
