import { useState } from "react";
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

  // Atalho de TESTE: avanca N meses de uma vez pra prefeitura escolhida.
  // Cria+consolida N folhas em sequencia — cada uma incrementa parcelasPagas
  // dos contratos averbados. Serve pra o operador simular passar do tempo
  // e ver os contratos avancarem/quitarem sem esperar o real (1 mes por
  // consolidacao). Nao substitui o fluxo real da prefeitura abrir folha.
  const [showSim, setShowSim] = useState(false);
  const [simMeses, setSimMeses] = useState(6);
  const [simPref, setSimPref] = useState<number | "">("");
  const prefsUnicas = Array.from(
    new Map((data.data?.folhas ?? []).map((f) => [f.prefeituraId, f.prefeitura])).entries(),
  );
  const simular = useMutation({
    mutationFn: (v: { prefeituraId: number; meses: number }) => atlas.admin.simularMesesFolha(v),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "folhas"] });
      alert(`Simulados ${r.folhas.length} meses em ${r.prefeitura}: ${r.totalIncrementados} parcelas incrementadas, ${r.totalQuitados} contratos quitados.`);
      setShowSim(false);
    },
    onError: (e) => alert(`Falha: ${(e as Error).message}`),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Folhas por competência</h1>
          <p style={{ color: "var(--text-muted)" }}>Estado das folhas das prefeituras afiliadas (aberta → fechada → consolidada). Só a averbadora consolida.</p>
        </div>
        <Button variant="ghost" onClick={() => setShowSim(true)} title="Cria e consolida N folhas em sequencia — simula meses passando (so pra teste)">
          ⏩ Avançar meses (teste)
        </Button>
      </header>

      <DataTable columns={columns} rows={data.data?.folhas ?? []} rowKey={(f) => f.id} loading={data.isLoading} />

      {showSim ? (
        <div
          onClick={() => !simular.isPending && setShowSim(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 24, maxWidth: 480, width: "100%" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "1.15rem" }}>Avançar meses (atalho de teste)</h3>
            <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
              Cria e consolida N folhas em sequência a partir da próxima competência sem folha da prefeitura.
              Cada folha consolidada avança <b>+1 parcela</b> em todos os contratos averbados. Só pra demo/QA — não substitui o fluxo real de abrir folha.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                Prefeitura
                <select
                  value={simPref}
                  onChange={(e) => setSimPref(e.target.value ? Number(e.target.value) : "")}
                  style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-elev-2)", border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: 14 }}
                >
                  <option value="">— escolha —</option>
                  {prefsUnicas.map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
                {prefsUnicas.length === 0 ? (
                  <span style={{ fontSize: 11, color: "var(--gold-500)" }}>
                    Nenhuma folha ainda. Crie a primeira via API ou pela prefeitura pra popular a lista.
                  </span>
                ) : null}
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                Quantos meses avançar (1–60)
                <input
                  type="number" min={1} max={60}
                  value={simMeses}
                  onChange={(e) => setSimMeses(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-elev-2)", border: "1px solid var(--border-strong)", color: "var(--text)", fontSize: 14 }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <Button variant="ghost" onClick={() => setShowSim(false)} disabled={simular.isPending}>Cancelar</Button>
              <Button
                onClick={() => { if (typeof simPref === "number") simular.mutate({ prefeituraId: simPref, meses: simMeses }); }}
                disabled={simular.isPending || typeof simPref !== "number"}
              >
                {simular.isPending ? "Simulando…" : `Avançar ${simMeses} ${simMeses === 1 ? "mês" : "meses"}`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
