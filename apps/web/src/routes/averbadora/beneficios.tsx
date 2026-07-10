import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, IconButton, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminBeneficio, CategoriaBeneficio } from "@atlas/sdk";

const CATEGORIAS: { id: CategoriaBeneficio; label: string }[] = [
  { id: "saude", label: "Saúde" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "educacao", label: "Educação" },
  { id: "lazer", label: "Lazer" },
];

/** Listagem dos beneficios cadastrados. O CRUD vive na tela dedicada
 *  /averbadora/beneficios/novo (e /:id/editar) — formulario grande com todas
 *  as facetas (endereco, contato, publico-alvo, vigencia, como usar, etc). */
export function AdminBeneficios() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const beneficiosQ = useQuery({ queryKey: ["admin", "beneficios"], queryFn: () => atlas.admin.beneficios.list() });
  const prefeiturasQ = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });

  const pausar = useMutation({
    mutationFn: (id: string) => atlas.admin.beneficios.pausar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beneficios"] }),
  });
  const reativar = useMutation({
    mutationFn: (id: string) => atlas.admin.beneficios.reativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "beneficios"] }),
  });

  const prefNome = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of prefeiturasQ.data?.prefeituras ?? []) map.set(p.id, `${p.nome}/${p.uf}`);
    return map;
  }, [prefeiturasQ.data]);

  const columns: Column<AdminBeneficio>[] = [
    { key: "ativo", header: "Situação", render: (b) => <Pill variant={b.ativo ? "averbado" : "expirado"}>{b.ativo ? "Ativo" : "Pausado"}</Pill> },
    {
      key: "icone",
      header: "",
      render: (b) => (
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: `color-mix(in srgb, ${b.cor} 15%, transparent)`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>{b.icone}</span>
      ),
    },
    { key: "nome", header: "Nome" },
    { key: "cat", header: "Categorias", render: (b) => b.categorias.map((c) => CATEGORIAS.find((x) => x.id === c)?.label).join(" · ") },
    { key: "pref", header: "Prefeitura", render: (b) => prefNome.get(b.prefeituraId) ?? `#${b.prefeituraId}` },
    { key: "local", header: "Local" },
    { key: "desc", header: "Desconto", render: (b) => `${b.descontoLabel} ${b.descontoComplemento}` },
    { key: "origem", header: "Origem", render: (b) => <Pill variant={b.origem === "banco" ? "aceita" : "emdia"}>{b.origem}</Pill> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Benefícios e descontos</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720, fontSize: 13 }}>
            Cadastre parceiros comerciais, benefícios de saúde, convênios e vantagens por prefeitura. Cada benefício tem uma tela dedicada com todos os detalhes (endereço, contato, público-alvo, vigência, como usar).
          </p>
        </div>
        <Button onClick={() => nav("/averbadora/beneficios/novo")}>+ Novo benefício</Button>
      </header>

      <DataTable
        columns={columns}
        rows={beneficiosQ.data?.beneficios ?? []}
        rowKey={(b) => b.id}
        loading={beneficiosQ.isLoading}
        emptyState="Nenhum benefício cadastrado ainda. Clique em '+ Novo benefício' pra começar."
        actions={(b) => (
          <>
            <IconButton title="Editar" onClick={() => nav(`/averbadora/beneficios/${b.id}/editar`)}>✎</IconButton>
            {b.ativo ? (
              <IconButton
                title="Pausar"
                danger
                onClick={() => { if (confirm(`Pausar "${b.nome}"?\n\nEle para de aparecer para os servidores até você reativar.`)) pausar.mutate(b.id); }}
              >⏸</IconButton>
            ) : (
              <IconButton title="Reativar" onClick={() => reativar.mutate(b.id)}>▶</IconButton>
            )}
          </>
        )}
      />
    </div>
  );
}
