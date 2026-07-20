import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, CsvImportPanel, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraAdf, PrefeituraFolha, PrefeituraServidor } from "@atlas/sdk";
import { Modal, Field, inp } from "./_ui";

type FolhaRow = PrefeituraFolha & { movimentacoes: number };

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function PrefeituraFolhas() {
  const qc = useQueryClient();
  const [novaOpen, setNovaOpen] = useState(false);
  const [movFolha, setMovFolha] = useState<FolhaRow | null>(null);
  const [descFolha, setDescFolha] = useState<FolhaRow | null>(null);
  // Filtro por servidor — "" = Todos (comportamento default). Quando setado, a
  // tabela mostra apenas as folhas em que o servidor tem ADF/movimentacao, com
  // as colunas Movimentacoes/Descontos ajustadas pra reflect so a fatia dele.
  const [servidorFiltro, setServidorFiltro] = useState<string>("");
  // Poll 5s — quando a averbadora clica Aplicar em folha em outro isolate,
  // a coluna "ADFs aplicadas" aqui atualiza em ate 5s.
  const q = useQuery({
    queryKey: ["prefeitura", "folhas"],
    queryFn: () => atlas.prefeitura.folhas(),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
  const servidoresQ = useQuery({
    queryKey: ["prefeitura", "servidores-picker"],
    queryFn: () => atlas.prefeitura.servidores(),
    staleTime: 60_000,
  });
  const servidores = servidoresQ.data?.servidores ?? [];
  const folhasBase = q.data?.folhas ?? [];

  // Se ha filtro por servidor, precisa buscar ADFs e movimentacoes de todas as
  // folhas em paralelo pra filtrar por matricula. Cache 30s pra alternar rapido.
  const adfsQueries = useQueries({
    queries: folhasBase.map((f) => ({
      queryKey: ["prefeitura", "adf", f.competencia],
      queryFn: () => atlas.prefeitura.adf(f.competencia),
      staleTime: 30_000,
      enabled: !!servidorFiltro,
    })),
  });
  const movQueries = useQueries({
    queries: folhasBase.map((f) => ({
      queryKey: ["prefeitura", "movimentacoes", f.id],
      queryFn: () => atlas.prefeitura.movimentacoes(f.id),
      staleTime: 30_000,
      enabled: !!servidorFiltro,
    })),
  });

  // Modo FILTRADO: gera uma linha por ADF (contrato) do servidor — sem somar
  // os valores. Contratos diferentes ficam em linhas separadas ("um embaixo do
  // outro"), preservando os valores individuais de cada CCB.
  type AdfRow = { key: string; folha: FolhaRow; adf: PrefeituraAdf };
  const adfRows: AdfRow[] = useMemo(() => {
    if (!servidorFiltro) return [];
    const out: AdfRow[] = [];
    folhasBase.forEach((folha, idx) => {
      const adfs = (adfsQueries[idx]?.data?.adfs ?? []).filter((a) => a.matricula === servidorFiltro);
      for (const adf of adfs) {
        out.push({ key: `${folha.id}:${adf.adf}`, folha, adf });
      }
    });
    return out;
  }, [servidorFiltro, folhasBase, adfsQueries]);

  // Movimentacoes totais do servidor filtrado (informativo — nao encaixa em
  // linha por ADF; mostrado como card acima da tabela quando filtro ativo).
  const movsDoServidor = useMemo(() => {
    if (!servidorFiltro) return 0;
    let total = 0;
    movQueries.forEach((q) => {
      const movs = (q.data?.movimentacoes ?? []).filter((m) => m.matricula === servidorFiltro);
      total += movs.length;
    });
    return total;
  }, [servidorFiltro, movQueries]);

  const setStatus = useMutation({
    // Consolidar não é ação da prefeitura — só a averbadora consolida (via /averbadora/folhas).
    mutationFn: ({ id, status }: { id: string; status: "aberta" | "fechada" }) => atlas.prefeitura.atualizarFolha(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura"] }),
  });
  const excluirFolha = useMutation({
    mutationFn: (id: string) => atlas.prefeitura.excluirFolha(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura"] }),
    onError: (e) => alert((e as Error).message || "Erro ao excluir"),
  });

  const columnsFolha: Column<FolhaRow>[] = [
    { key: "competencia", header: "Competência", mono: true },
    { key: "dataCorte", header: "Corte" },
    { key: "dataRepasse", header: "Repasse", render: (f) => f.dataRepasse ?? "—" },
    { key: "movimentacoes", header: "Movimentações", align: "right" },
    {
      key: "valorAplicado",
      header: "Descontos aplicados",
      align: "right",
      render: (f) => {
        const v = f.valorAplicado ?? 0;
        if (v === 0) return <span style={{ color: "var(--text-dim)" }}>—</span>;
        return <span style={{ color: "var(--emerald-500)", fontWeight: 600 }}>{fmtBRL(v)}</span>;
      },
    },
    { key: "status", header: "Status", render: (f) => <Pill variant={f.status === "aberta" ? "pendente" : "averbado"}>{f.status}</Pill> },
    {
      key: "acoes",
      header: "",
      align: "right",
      render: (f) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button size="sm" variant="ghost" onClick={() => setDescFolha(f)}>Ver descontos</Button>
          {f.status === "aberta" ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setMovFolha(f)}>✎ Movimentar</Button>
              {f.movimentacoes === 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={excluirFolha.isPending}
                  title="Exclui folha aberta e sem movimentações"
                  onClick={() => {
                    if (confirm(`Excluir a folha ${f.competencia}? Ação irreversível.`)) {
                      excluirFolha.mutate(f.id);
                    }
                  }}
                >
                  🗑 Excluir
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={f.movimentacoes === 0 || setStatus.isPending}
                title={f.movimentacoes === 0 ? "Envie ao menos 1 movimentação antes de fechar" : undefined}
                onClick={() => setStatus.mutate({ id: f.id, status: "fechada" })}
              >
                Fechar
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  // Colunas do modo FILTRADO — uma linha por contrato/ADF do servidor. Sem
  // somatoria: cada CCB aparece com seu valor de parcela proprio.
  const columnsAdf: Column<AdfRow>[] = [
    { key: "competencia", header: "Competência", mono: true, render: (r) => r.folha.competencia },
    { key: "adf", header: "ADF (contrato)", mono: true, render: (r) => r.adf.adf },
    { key: "banco", header: "Banco", render: (r) => r.adf.bancoNome },
    {
      key: "parcela",
      header: "Parcela",
      align: "right",
      render: (r) => <span style={{ color: "var(--emerald-500)", fontWeight: 600 }}>{fmtBRL(r.adf.valorParcela)}</span>,
    },
    { key: "totalParcelas", header: "Parcelas", align: "right", render: (r) => `${r.adf.totalParcelas}x` },
    {
      key: "statusAdf",
      header: "Status ADF",
      render: (r) => (
        <Pill variant={r.adf.status === "aplicada" ? "averbado" : r.adf.status === "falha" ? "rejeitada" : "pendente"}>
          {r.adf.status}
        </Pill>
      ),
    },
    {
      key: "statusFolha",
      header: "Status folha",
      render: (r) => <Pill variant={r.folha.status === "aberta" ? "pendente" : "averbado"}>{r.folha.status}</Pill>,
    },
    {
      key: "acoes",
      header: "",
      align: "right",
      render: (r) => (
        <Button size="sm" variant="ghost" onClick={() => setDescFolha(r.folha)}>Ver descontos</Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Folhas de pagamento</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Competência mensal, movimentação de pessoal e datas de corte. Recálculo de margem é automático.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            onClick={() => {
              // <a download> forcado — pega o CSV modelo direto do backend
              // (endpoint publico, sem JWT). Usar location.assign preserva o
              // Content-Disposition e o browser baixa como arquivo.
              window.location.assign(atlas.prefeitura.movimentacaoCsvTemplateUrl());
            }}
          >
            ↓ Baixar exemplo
          </Button>
          <Button onClick={() => setNovaOpen(true)}>+ Abrir competência</Button>
        </div>
      </header>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-dim)" }}>
          Servidor:
        </label>
        <select
          value={servidorFiltro}
          onChange={(e) => setServidorFiltro(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 8, minWidth: 300,
            border: "1px solid var(--border-strong)",
            background: "var(--bg-elev)", color: "var(--text)", fontSize: 13,
          }}
        >
          <option value="">Todos</option>
          {servidores.map((s: PrefeituraServidor) => (
            <option key={s.matricula} value={s.matricula}>
              {s.nome} — matrícula {s.matricula} · {s.cpfMasked}
            </option>
          ))}
        </select>
        {servidorFiltro ? (
          <Button size="sm" variant="ghost" onClick={() => setServidorFiltro("")}>Limpar filtro</Button>
        ) : null}
      </div>

      {servidorFiltro ? (
        <>
          {movsDoServidor > 0 ? (
            <div style={{
              padding: "10px 14px", background: "var(--bg-elev-2)", borderRadius: 8,
              fontSize: 13, color: "var(--text-muted)",
            }}>
              📋 <b>{movsDoServidor}</b> movimentação(ões) registradas para este servidor nas folhas abaixo.
            </div>
          ) : null}
          <DataTable
            columns={columnsAdf}
            rows={adfRows}
            rowKey={(r) => r.key}
            loading={q.isLoading}
            emptyState="Este servidor não tem contratos em nenhuma folha ainda."
          />
        </>
      ) : (
        <DataTable
          columns={columnsFolha}
          rows={folhasBase}
          rowKey={(f) => f.id}
          loading={q.isLoading}
          emptyState="Nenhuma folha. Abra uma competência."
        />
      )}

      {novaOpen ? <NovaFolha onClose={() => setNovaOpen(false)} onSaved={() => { setNovaOpen(false); qc.invalidateQueries({ queryKey: ["prefeitura"] }); }} /> : null}
      {movFolha ? <MovModal folha={movFolha} onClose={() => setMovFolha(null)} onDone={() => qc.invalidateQueries({ queryKey: ["prefeitura"] })} /> : null}
      {descFolha ? <DescontosModal folha={descFolha} onClose={() => setDescFolha(null)} /> : null}
    </div>
  );
}

function DescontosModal({ folha, onClose }: { folha: FolhaRow; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["prefeitura", "adf", folha.competencia],
    queryFn: () => atlas.prefeitura.adf(folha.competencia),
    refetchInterval: 5_000,
  });
  const adfs = q.data?.adfs ?? [];
  const aplicadas = adfs.filter((a) => a.status === "aplicada");
  const totalDesconto = aplicadas.reduce((s, a) => s + a.valorParcela, 0);
  const labelProduto = (t?: string) => {
    if (!t) return "Empréstimo";
    const u = t.toUpperCase();
    if (u.includes("BENEF")) return "Cartão Benefício";
    if (u.includes("CARTAO") || u.includes("ECONSIG")) return "Cartão Consignado";
    if (u.includes("REFIN")) return "Portabilidade";
    return "Empréstimo";
  };
  return (
    <Modal title={`Descontos em folha — ${folha.competencia}`} onClose={onClose} maxWidth={880}>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Servidores com desconto averbado nesta competência. A margem já foi confirmada pela averbadora — o valor será debitado no repasse.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "12px 0" }}>
        <div style={{ padding: 12, background: "var(--bg-elev-2)", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Aplicadas</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--emerald-500)" }}>{aplicadas.length}</div>
        </div>
        <div style={{ padding: 12, background: "var(--bg-elev-2)", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total ADFs</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{adfs.length}</div>
        </div>
        <div style={{ padding: 12, background: "var(--bg-elev-2)", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Descontos</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--emerald-500)" }}>{fmtBRL(totalDesconto)}</div>
        </div>
      </div>
      <div style={{ maxHeight: 380, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        {q.isLoading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>Carregando…</div>
        ) : adfs.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Nenhuma ADF nesta competência ainda. Quando a averbadora aplicar uma proposta em folha, ela aparece aqui.
          </div>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-elev-2)", textTransform: "uppercase", fontSize: 11, letterSpacing: ".06em", color: "var(--text-dim)" }}>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Servidor</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Matrícula</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Produto</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Banco</th>
                <th style={{ textAlign: "right", padding: "8px 10px" }}>Parcela</th>
                <th style={{ textAlign: "center", padding: "8px 10px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {adfs.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 10px" }}>{a.nome}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{a.matricula}</td>
                  <td style={{ padding: "8px 10px" }}>{labelProduto(a.tipoContrato)}</td>
                  <td style={{ padding: "8px 10px" }}>{a.bancoNome}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(a.valorParcela)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    <Pill variant={a.status === "aplicada" ? "averbado" : a.status === "falha" ? "rejeitada" : "pendente"}>{a.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><Button variant="ghost" onClick={onClose}>Fechar</Button></div>
    </Modal>
  );
}

function NovaFolha({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [competencia, setCompetencia] = useState("");
  const [dataCorte, setDataCorte] = useState("");
  const [dataRepasse, setDataRepasse] = useState("");
  const save = useMutation({
    mutationFn: () => atlas.prefeitura.abrirFolha({ competencia, dataCorte, ...(dataRepasse ? { dataRepasse } : {}) }),
    onSuccess: onSaved,
  });
  return (
    <Modal title="Abrir competência de folha" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field lbl="Competência (AAAAMM)" hint="ex.: 202608"><input style={inp} value={competencia} onChange={(e) => setCompetencia(e.target.value)} placeholder="202608" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field lbl="Data de corte"><input type="date" style={inp} value={dataCorte} onChange={(e) => setDataCorte(e.target.value)} /></Field>
          <Field lbl="Data de repasse"><input type="date" style={inp} value={dataRepasse} onChange={(e) => setDataRepasse(e.target.value)} /></Field>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !competencia || !dataCorte}>{save.isPending ? "Abrindo…" : "Abrir folha"}</Button>
      </div>
      {save.isError ? <p style={{ color: "var(--danger-500)", marginTop: 12, fontSize: 13 }}>{(save.error as Error).message}</p> : null}
    </Modal>
  );
}

function MovModal({ folha, onClose, onDone }: { folha: FolhaRow; onClose: () => void; onDone: () => void }) {
  const movs = useQuery({ queryKey: ["prefeitura", "movimentacoes", folha.id], queryFn: () => atlas.prefeitura.movimentacoes(folha.id) });
  return (
    <Modal title={`Movimentação — folha ${folha.competencia}`} onClose={onClose} maxWidth={720}>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>Envie admissões, demissões, aposentadorias, promoções e alterações de cargo/salário. As mudanças recalculam a margem automaticamente.</p>
      <CsvImportPanel
        title="Enviar movimentação (CSV)"
        columnsHint="tipo (admissao/demissao/aposentadoria/promocao/alteracao), matricula, cpf, nome, cargoNovo, salarioNovo, detalhe"
        templateUrl={atlas.prefeitura.movimentacaoCsvTemplateUrl()}
        onImport={(csv) => atlas.prefeitura.enviarMovimentacao(folha.id, csv)}
        onImported={() => { onDone(); movs.refetch(); }}
      />
      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>Movimentações registradas ({movs.data?.movimentacoes.length ?? 0})</span>
        <div style={{ marginTop: 8, display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
          {(movs.data?.movimentacoes ?? []).map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", background: "var(--bg-elev-2)", borderRadius: 8, fontSize: 12 }}>
              <Pill variant="aceita">{m.tipo}</Pill>
              <span style={{ fontFamily: "var(--font-mono)" }}>{m.matricula}</span>
              <span style={{ color: "var(--text-muted)", flex: 1 }}>{m.detalhe}</span>
            </div>
          ))}
          {(movs.data?.movimentacoes.length ?? 0) === 0 ? <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Nenhuma movimentação ainda.</span> : null}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><Button variant="ghost" onClick={onClose}>Fechar</Button></div>
    </Modal>
  );
}

