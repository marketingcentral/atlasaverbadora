import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, FormActions, FormGrid, NumberField, Pill, TextareaField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PortabilidadeIntencao } from "@atlas/sdk";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/** Portal do banco — oportunidades de portabilidade publicadas pela averbadora.
 *  Este banco NAO ve as suas proprias origens (nao pode ofertar em contrato
 *  que ele ja possui). */
export function BancoPortabilidade() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["banco", "portabilidade"],
    queryFn: () => atlas.portabilidade.oportunidadesBanco(),
    refetchInterval: 20000,
  });
  const [ofertando, setOfertando] = useState<PortabilidadeIntencao | null>(null);

  const intencoes = q.data?.intencoes ?? [];
  const abertas = useMemo(() => intencoes.filter((i) => i.status === "aberta"), [intencoes]);

  const columns: Column<PortabilidadeIntencao>[] = [
    { key: "id", header: "ID", mono: true },
    { key: "servidor", header: "Servidor", render: (i) => (
      <span>
        {i.servidorNome}
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {i.servidorMatricula} · {i.servidorCpfMasked}
        </span>
      </span>
    ) },
    { key: "prefeitura", header: "Prefeitura", render: (i) => i.prefeituraNome || "—" },
    { key: "bancoOrigem", header: "Banco atual", render: (i) => i.bancoOrigemNome },
    { key: "saldoDevedor", header: "Saldo devedor", align: "right", render: (i) => fmtBRL(i.saldoDevedor) },
    { key: "parcela", header: "Parcela atual", align: "right", render: (i) => (
      <span>
        {fmtBRL(i.valorParcela)}
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>
          × {i.parcelasRestantes}x @ {fmtPct(i.taxaAm)}
        </span>
      </span>
    ) },
    { key: "ofertas", header: "Ofertas", align: "right", render: (i) => {
      const eu = i.ofertas.filter((o) => o.status === "ativa");
      return <span style={{ fontSize: 12 }}>{eu.length} ativa(s)</span>;
    } },
    { key: "publicadaEm", header: "Publicada", render: (i) => fmtDate(i.publicadaEm) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Portal Banco
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Portabilidade — Oportunidades</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 820, fontSize: 13 }}>
          Servidores publicaram intenção de trocar de banco. Dados vêm da averbadora
          (saldo devedor, parcela, taxa). Faça uma oferta com sua melhor condição — se
          o servidor aceitar, vira contrato REFIN na sua carteira.
        </p>
      </header>

      <DataTable
        columns={columns}
        rows={abertas}
        rowKey={(i) => i.id}
        loading={q.isLoading}
        emptyState="Nenhuma oportunidade aberta no momento."
        actions={(i) => (
          <Button size="sm" onClick={() => setOfertando(i)}>Fazer oferta</Button>
        )}
      />

      {ofertando ? (
        <OfertaModal
          intencao={ofertando}
          onClose={() => setOfertando(null)}
          onSaved={() => { setOfertando(null); qc.invalidateQueries({ queryKey: ["banco", "portabilidade"] }); }}
        />
      ) : null}
    </div>
  );
}

function OfertaModal({ intencao, onClose, onSaved }: { intencao: PortabilidadeIntencao; onClose: () => void; onSaved: () => void }) {
  const [taxaPct, setTaxaPct] = useState(intencao.taxaAm * 100 * 0.9); // 10% menor por padrão
  const [novoPrazo, setNovoPrazo] = useState(intencao.parcelasRestantes);
  const [observacao, setObservacao] = useState("");

  // Calculo simples de parcela (Price). Se taxa=0, divide igual.
  const taxaAm = taxaPct / 100;
  const novaParcela = useMemo(() => {
    if (taxaAm <= 0) return intencao.saldoDevedor / novoPrazo;
    const p = intencao.saldoDevedor * (taxaAm * Math.pow(1 + taxaAm, novoPrazo)) / (Math.pow(1 + taxaAm, novoPrazo) - 1);
    return Math.round(p * 100) / 100;
  }, [intencao.saldoDevedor, taxaAm, novoPrazo]);

  const economia = Math.round((intencao.valorParcela * intencao.parcelasRestantes - novaParcela * novoPrazo) * 100) / 100;

  const save = useMutation({
    mutationFn: () => atlas.portabilidade.ofertar(intencao.id, {
      taxaAmProposta: Number((taxaAm).toFixed(6)),
      novaParcela,
      novoPrazo,
      observacao: observacao || undefined,
    }),
    onSuccess: onSaved,
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24, maxWidth: 620, width: "100%", boxShadow: "var(--shadow-lg)" }}>
        <h3 style={{ margin: 0 }}>Fazer oferta — {intencao.id}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 12px" }}>
          <b>{intencao.servidorNome}</b> · {intencao.bancoOrigemNome} → seu banco
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16, padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, fontSize: 12 }}>
          <div><span style={{ color: "var(--text-muted)" }}>Saldo devedor</span><div style={{ fontWeight: 700 }}>{fmtBRL(intencao.saldoDevedor)}</div></div>
          <div><span style={{ color: "var(--text-muted)" }}>Parcela atual</span><div style={{ fontWeight: 700 }}>{fmtBRL(intencao.valorParcela)} × {intencao.parcelasRestantes}x</div></div>
          <div><span style={{ color: "var(--text-muted)" }}>Taxa atual</span><div style={{ fontWeight: 700 }}>{fmtPct(intencao.taxaAm)}</div></div>
        </div>

        <FormGrid cols={2}>
          <NumberField label="Sua taxa (% a.m.)" step={0.01} value={taxaPct} onChange={(e) => { const n = Number(e.target.value); setTaxaPct(Number.isFinite(n) ? n : 0); }} hint={`Superar ${fmtPct(intencao.taxaAm)} pra ser competitivo.`} required />
          <NumberField label="Prazo (meses)" value={novoPrazo} onChange={(e) => { const n = Number(e.target.value); setNovoPrazo(Number.isFinite(n) && n > 0 ? Math.floor(n) : 1); }} min={1} max={120} required />
        </FormGrid>

        <div style={{ marginTop: 12, padding: 12, background: "color-mix(in srgb, var(--emerald-500) 10%, transparent)", border: "1px solid var(--emerald-500)", borderRadius: 8, fontSize: 13 }}>
          <div>Nova parcela estimada: <b>{fmtBRL(novaParcela)}</b> × {novoPrazo} meses</div>
          <div style={{ marginTop: 4 }}>Economia total: <b style={{ color: economia > 0 ? "var(--emerald-500)" : "var(--danger-500)" }}>{fmtBRL(economia)}</b></div>
        </div>

        <div style={{ marginTop: 12 }}>
          <TextareaField label="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: sem tarifas, cashback de 2%…" />
        </div>

        {save.isError ? <p style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 8 }}>{(save.error as Error).message}</p> : null}

        <FormActions>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !(taxaPct > 0) || !(novoPrazo > 0) || !Number.isFinite(novaParcela)}>
            {save.isPending ? "Enviando..." : "Enviar oferta"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}
