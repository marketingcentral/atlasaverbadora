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

      <DataTable columns={columns} rows={data.data?.folhas ?? []} rowKey={(f) => f.id} loading={data.isLoading} />
    </div>
  );
}
