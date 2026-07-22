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
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["banco", "tabelas"] });
      qc.invalidateQueries({ queryKey: ["banco", "tabela", id] });
      qc.invalidateQueries({ queryKey: ["servidor", "ofertas"] });
    },
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => atlas.banco.reativarTabela(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["banco", "tabelas"] });
      qc.invalidateQueries({ queryKey: ["banco", "tabela", id] });
      qc.invalidateQueries({ queryKey: ["servidor", "ofertas"] });
    },
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
    { key: "taxa", header: "Taxa a.m.", render: (t) => fmtPct(t.taxaAm ?? t.taxaMaxAm ?? 0) },
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
            {t.ativo ? (
              <IconButton
                title="Desativar"
                danger
                onClick={() => {
                  if (confirm(`Desativar tabela ${t.id}?\n\nEla para de aparecer nas simulações, mas nada é apagado — você pode reativar depois.`)) remove.mutate(t.id);
                }}
              >
                ⏸
              </IconButton>
            ) : (
              <IconButton title="Reativar" onClick={() => reactivate.mutate(t.id)}>▶</IconButton>
            )}
          </>
        )}
      />
    </div>
  );
}
