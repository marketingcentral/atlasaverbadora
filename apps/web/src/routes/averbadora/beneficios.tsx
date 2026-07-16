import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, IconButton, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminBeneficio, CategoriaBeneficio } from "@atlas/sdk";

// Espelha as opcoes do form (beneficios-form.tsx). Novas categorias
// (farmacia/supermercado/academia/telemedicina) precisavam entrar aqui
// tambem senao a coluna Categorias mostrava vazio pros beneficios novos.
const CATEGORIAS: { id: CategoriaBeneficio; label: string }[] = [
  { id: "saude", label: "Saúde" },
  { id: "telemedicina", label: "Telemedicina" },
  { id: "farmacia", label: "Farmácia" },
  { id: "supermercado", label: "Supermercado" },
  { id: "academia", label: "Academia" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "educacao", label: "Educação" },
  { id: "lazer", label: "Lazer" },
];

/** Listagem de beneficios comuns (fora telemedicina). Mesmo padrao de tabs
 *  Ativas/Encerradas de /banco/ofertas. CRUD vive em /averbadora/beneficios/novo. */
export function AdminBeneficios() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<"ativas" | "encerradas">("ativas");
  const beneficiosQ = useQuery({ queryKey: ["admin", "beneficios"], queryFn: () => atlas.admin.beneficios.list() });
  const prefeiturasQ = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const interessadosResumoQ = useQuery({
    queryKey: ["admin", "beneficios", "interessados", "resumo"],
    queryFn: () => atlas.admin.beneficios.interessadosResumo(),
    refetchInterval: 30_000,
  });

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

  const contagemInteressados = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of interessadosResumoQ.data?.contagens ?? []) map.set(c.beneficioId, c.total);
    return map;
  }, [interessadosResumoQ.data]);

  // Beneficios comuns = tudo menos telemedicina (tem aba propria).
  const todos = useMemo(
    () => (beneficiosQ.data?.beneficios ?? []).filter((b) => !b.categorias.includes("telemedicina")),
    [beneficiosQ.data],
  );
  const { ativas, encerradas } = useMemo(() => {
    const a: AdminBeneficio[] = [];
    const e: AdminBeneficio[] = [];
    for (const b of todos) (b.ativo ? a : e).push(b);
    return { ativas: a, encerradas: e };
  }, [todos]);
  const rows = tab === "ativas" ? ativas : encerradas;

  const columns: Column<AdminBeneficio>[] = [
    { key: "ativo", header: "Situação", render: (b) => <Pill variant={b.ativo ? "averbado" : "expirado"}>{b.ativo ? "Ativa" : "Encerrada"}</Pill> },
    {
      key: "icone",
      header: "",
      render: (b) => (
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: `color-mix(in srgb, ${b.cor} 15%, transparent)`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, overflow: "hidden",
        }}>
          {b.icone.startsWith("http")
            ? <img src={b.icone} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : b.icone}
        </span>
      ),
    },
    { key: "nome", header: "Nome" },
    { key: "cat", header: "Categorias", render: (b) => b.categorias.map((c) => CATEGORIAS.find((x) => x.id === c)?.label).filter(Boolean).join(" · ") },
    { key: "pref", header: "Prefeitura", render: (b) => prefNome.get(b.prefeituraId) ?? `#${b.prefeituraId}` },
    { key: "local", header: "Local" },
    { key: "desc", header: "Desconto", render: (b) => `${b.descontoLabel} ${b.descontoComplemento}` },
    { key: "origem", header: "Origem", render: (b) => <Pill variant={b.origem === "banco" ? "aceita" : "emdia"}>{b.origem}</Pill> },
    {
      key: "interessados",
      header: "Interessados",
      align: "right",
      render: (b) => {
        const n = contagemInteressados.get(b.id) ?? 0;
        return n > 0
          ? <button type="button" onClick={() => nav(`/averbadora/interessados?beneficioId=${b.id}`)}
              style={{ padding: "3px 8px", borderRadius: 999, border: "1px solid var(--emerald-500)", background: "color-mix(in srgb, var(--emerald-500) 10%, transparent)", color: "var(--emerald-500)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              👥 {n}
            </button>
          : <span style={{ color: "var(--text-dim)" }}>—</span>;
      },
    },
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => nav("/averbadora/interessados")}>
            👥 Interessados
          </Button>
          <Button onClick={() => nav("/averbadora/beneficios/novo")}>+ Novo benefício</Button>
        </div>
      </header>

      {/* Tabs Ativas / Encerradas — soft-delete (pausar) via 🗑; reativar via ▶. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TabBtn active={tab === "ativas"} onClick={() => setTab("ativas")} label={`Ativas (${ativas.length})`} />
        <TabBtn active={tab === "encerradas"} onClick={() => setTab("encerradas")} label={`Encerradas (${encerradas.length})`} />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b.id}
        loading={beneficiosQ.isLoading}
        emptyState={tab === "ativas"
          ? "Nenhum benefício ativo. Clique em '+ Novo benefício' pra começar."
          : "Nenhum benefício encerrado."}
        actions={(b) => (
          <>
            <IconButton title="Editar" onClick={() => nav(`/averbadora/beneficios/${b.id}/editar`)}>✎</IconButton>
            {tab === "ativas" ? (
              <IconButton
                title="Encerrar (move pra aba Encerradas — sem apagar)"
                danger
                onClick={() => {
                  if (confirm(`Encerrar "${b.nome}"?\n\nSai do app do servidor e vai pra aba "Encerradas". Você ainda pode reativar depois.`)) {
                    pausar.mutate(b.id);
                  }
                }}
              >
                🗑
              </IconButton>
            ) : (
              <IconButton title="Reativar (volta pra Ativas)" onClick={() => reativar.mutate(b.id)}>▶</IconButton>
            )}
          </>
        )}
      />
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 10,
        border: `1px solid ${active ? "var(--emerald-500)" : "var(--border)"}`,
        background: active ? "color-mix(in srgb, var(--emerald-500) 10%, transparent)" : "transparent",
        color: active ? "var(--emerald-500)" : "var(--text-muted)",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
