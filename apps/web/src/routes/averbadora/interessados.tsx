import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, DataTable, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

interface Clique {
  id: string;
  beneficioId: string;
  servidorId: number;
  nome: string;
  cpfMasked: string;
  matricula: string;
  prefeituraId: number;
  criadoEm: string;
  origemTela?: string;
}

/** Interessados — servidores que clicaram no botao "Acessar" de um beneficio.
 *  Aceita ?beneficioId=X pra pre-filtrar (ex: vindo da tela de telemedicina).
 *  Aceita ?categoria=telemedicina pra limitar o dropdown so a esses beneficios. */
export function AverbadoraInteressados() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const preFilterId = sp.get("beneficioId") ?? "";
  const filtroCategoria = sp.get("categoria") ?? "";

  const [beneficioId, setBeneficioId] = useState<string>(preFilterId);

  const beneficiosQ = useQuery({ queryKey: ["admin", "beneficios"], queryFn: () => atlas.admin.beneficios.list() });
  const prefeiturasQ = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const interessadosQ = useQuery({
    queryKey: ["admin", "beneficios", "interessados", beneficioId],
    queryFn: () => atlas.admin.beneficios.interessados(beneficioId || undefined),
    refetchInterval: 30_000,
  });
  const resumoQ = useQuery({
    queryKey: ["admin", "beneficios", "interessados", "resumo"],
    queryFn: () => atlas.admin.beneficios.interessadosResumo(),
    refetchInterval: 30_000,
  });

  const beneficiosDisponiveis = useMemo(() => {
    const todos = beneficiosQ.data?.beneficios ?? [];
    return filtroCategoria
      ? todos.filter((b) => b.categorias.includes(filtroCategoria as "saude" | "alimentacao" | "educacao" | "lazer" | "telemedicina"))
      : todos;
  }, [beneficiosQ.data, filtroCategoria]);

  const contagemPorBeneficio = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of resumoQ.data?.contagens ?? []) map.set(c.beneficioId, c.total);
    return map;
  }, [resumoQ.data]);

  const prefNome = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of prefeiturasQ.data?.prefeituras ?? []) map.set(p.id, `${p.nome}/${p.uf}`);
    return map;
  }, [prefeiturasQ.data]);

  const beneficioSelecionado = beneficiosDisponiveis.find((b) => b.id === beneficioId);
  const cliques = interessadosQ.data?.cliques ?? [];

  function exportarCsv() {
    const linhas = [
      ["Data/Hora", "Benefício", "Nome", "CPF", "Matrícula", "Prefeitura", "Origem"],
      ...cliques.map((c) => {
        const b = beneficiosDisponiveis.find((x) => x.id === c.beneficioId);
        return [
          new Date(c.criadoEm).toLocaleString("pt-BR"),
          b?.nome ?? c.beneficioId,
          c.nome,
          c.cpfMasked,
          c.matricula,
          prefNome.get(c.prefeituraId) ?? String(c.prefeituraId),
          c.origemTela ?? "—",
        ];
      }),
    ];
    const csv = linhas.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const nomeSuffix = beneficioSelecionado ? `-${beneficioSelecionado.nome.replace(/\s+/g, "_")}` : "";
    a.download = `interessados${nomeSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<Clique>[] = [
    { key: "criadoEm", header: "Data/Hora", render: (c) => new Date(c.criadoEm).toLocaleString("pt-BR") },
    {
      key: "beneficio",
      header: "Benefício",
      render: (c) => beneficiosDisponiveis.find((b) => b.id === c.beneficioId)?.nome ?? <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{c.beneficioId}</span>,
    },
    { key: "nome", header: "Servidor" },
    { key: "cpf", header: "CPF", render: (c) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{c.cpfMasked}</span> },
    { key: "matricula", header: "Matrícula", render: (c) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{c.matricula}</span> },
    { key: "pref", header: "Prefeitura", render: (c) => prefNome.get(c.prefeituraId) ?? `#${c.prefeituraId}` },
    {
      key: "origem",
      header: "Origem",
      render: (c) => c.origemTela
        ? <span style={{ padding: "2px 8px", borderRadius: 999, background: "var(--bg-elev-2)", fontSize: 11, color: "var(--text-muted)" }}>{c.origemTela}</span>
        : <span style={{ color: "var(--text-dim)" }}>—</span>,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <button
            type="button"
            onClick={() => nav(filtroCategoria === "telemedicina" ? "/averbadora/telemedicina" : "/averbadora/beneficios")}
            style={{ background: "transparent", border: 0, color: "var(--text-muted)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 4 }}
          >
            ← Voltar
          </button>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>
            {filtroCategoria === "telemedicina" ? "📱 Interessados em telemedicina" : "Interessados em benefícios"}
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 13, maxWidth: 720 }}>
            Servidores que clicaram no botão <b>Acessar</b> dos benefícios. Um clique = uma intenção de acessar a oferta.
            Cliques do mesmo servidor no mesmo benefício em 1h são contados como um só (evita spam).
          </p>
        </div>
        <Button variant="ghost" onClick={exportarCsv} disabled={cliques.length === 0}>↓ Exportar CSV</Button>
      </header>

      {/* Seletor de beneficio + resumo */}
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>
              Filtrar por benefício
            </div>
            <select
              value={beneficioId}
              onChange={(e) => setBeneficioId(e.target.value)}
              style={{
                width: "100%", maxWidth: 480,
                padding: "10px 12px", borderRadius: 10,
                border: "1px solid var(--border-strong)",
                background: "var(--bg)", color: "var(--text)",
                fontSize: 14, cursor: "pointer",
              }}
            >
              <option value="">— Todos os benefícios{filtroCategoria ? ` (categoria: ${filtroCategoria})` : ""} —</option>
              {beneficiosDisponiveis.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.icone.startsWith("http") ? "" : b.icone + " "}{b.nome} — {contagemPorBeneficio.get(b.id) ?? 0} interessado(s)
                </option>
              ))}
            </select>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--emerald-500)" }}>
              {cliques.length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              {beneficioSelecionado ? "cliques neste benefício" : "cliques no total"}
            </div>
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={cliques}
        rowKey={(c) => c.id}
        loading={interessadosQ.isLoading}
        emptyState={beneficioSelecionado
          ? `Ninguém clicou em "${beneficioSelecionado.nome}" ainda. Quando um servidor tocar em Acessar no app, o clique aparece aqui.`
          : "Nenhum servidor clicou em nenhum benefício ainda."}
      />
    </div>
  );
}
