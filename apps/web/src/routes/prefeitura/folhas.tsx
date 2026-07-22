import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, CsvImportPanel, DataTable, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraFolha, PrefeituraServidor } from "@atlas/sdk";
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

  // Aplica o filtro por servidor — reescreve movimentacoes/valorAplicado por
  // folha pra refletir so o servidor escolhido, e esconde folhas onde ele nao
  // aparece. Quando "Todos" (servidorFiltro === ""), passa as folhas cruas.
  const folhasExibidas: FolhaRow[] = useMemo(() => {
    if (!servidorFiltro) return folhasBase;
    return folhasBase
      .map((folha, idx) => {
        const adfs = (adfsQueries[idx]?.data?.adfs ?? []).filter((a) => a.matricula === servidorFiltro);
        const movs = (movQueries[idx]?.data?.movimentacoes ?? []).filter((m) => m.matricula === servidorFiltro);
        const valorAplicado = adfs.filter((a) => a.status === "aplicada").reduce((s, a) => s + a.valorParcela, 0);
        return { folha, adfsCount: adfs.length, movsCount: movs.length, valorAplicado };
      })
      .filter((r) => r.adfsCount > 0 || r.movsCount > 0)
      .map((r) => ({
        ...r.folha,
        movimentacoes: r.movsCount,
        valorAplicado: r.valorAplicado,
        adfsAplicadas: r.adfsCount,
      }));
  }, [servidorFiltro, folhasBase, adfsQueries, movQueries]);

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

  const columns: Column<FolhaRow>[] = [
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
                // Fecha se tem movimentacao OU desconto averbado (valorAplicado).
                // Folha com averbacao nao precisa de movimentacao pra fechar.
                disabled={(f.movimentacoes === 0 && (f.valorAplicado ?? 0) === 0) || setStatus.isPending}
                title={(f.movimentacoes === 0 && (f.valorAplicado ?? 0) === 0) ? "Sem movimentação e sem desconto — nada a fechar" : undefined}
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

      <DataTable
        columns={columns}
        rows={folhasExibidas}
        rowKey={(f) => f.id}
        loading={q.isLoading}
        emptyState={
          servidorFiltro
            ? "Este servidor não aparece em nenhuma folha ainda (sem ADFs e sem movimentações)."
            : "Nenhuma folha. Abra uma competência."
        }
      />

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

