import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ContratoActions,
  DataTable,
  Pill,
  Tabs,
  type Column,
  type PillVariant,
} from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import type { BancoContratoFull } from "@atlas/sdk";

const TABS: { key: TabKey; label: string }[] = [
  { key: "contrato", label: "Contrato" },
  { key: "parcelas", label: "Parcelas" },
  { key: "financiamento", label: "Financiamento" },
  { key: "historico", label: "Histórico" },
  { key: "adf", label: "ADF Vinculada" },
  { key: "quitacao", label: "Quitação" },
  { key: "complementares", label: "Complementares" },
];

type TabKey = "contrato" | "parcelas" | "financiamento" | "historico" | "adf" | "quitacao" | "complementares";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}% a.m.`;

function pillVariantFor(situacao: string): PillVariant {
  const s = situacao.toLowerCase();
  if (s.includes("ativo") || s.includes("averbado")) return "averbado";
  if (s.includes("quitado")) return "emdia";
  if (s.includes("cancelado") || s.includes("rejeitada")) return "rejeitada";
  if (s.includes("aguardando") || s.includes("pendente") || s.includes("suspenso")) return "pendente";
  if (s.includes("aceit")) return "aceita";
  return "expirado";
}

export function BancoContratoDetalhe() {
  const { adf = "" } = useParams<{ adf: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("contrato");
  const [confirming, setConfirming] = useState<string | null>(null);

  const data = useQuery({ queryKey: ["banco", "contrato", adf], queryFn: () => atlas.banco.getContrato(adf), enabled: !!adf });

  const acao = useMutation({
    mutationFn: ({ key, payload }: { key: "quitar" | "suspender" | "cancelar" | "alongar" | "alterar" | "confirmar"; payload?: Record<string, unknown> }) =>
      atlas.banco.acao(adf, key, payload as Parameters<typeof atlas.banco.acao>[2]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco", "contrato", adf] });
      qc.invalidateQueries({ queryKey: ["banco", "contratos"] });
    },
  });

  if (data.isLoading) return <div style={{ color: "var(--text-muted)" }}>Carregando contrato...</div>;
  if (!data.data) return <div style={{ color: "var(--danger-500)" }}>Contrato não encontrado.</div>;

  const c = data.data.contrato;
  const aguardandoConfirmacao = c.situacao.startsWith("Aguardando");

  const tabContent = (() => {
    switch (tab) {
      case "contrato":
        return <FichaContrato c={c} />;
      case "parcelas":
        return <ParcelasTab parcelas={data.data.parcelas} />;
      case "financiamento":
        return <FinanciamentoTab c={c} />;
      case "historico":
        return <HistoricoTab eventos={data.data.eventos} />;
      case "adf":
        return (
          <KV
            items={[
              ["ADF", c.adf],
              ["ADF Vinculada", c.adfVinculada ?? "—"],
              ["Origem", c.tipoContrato === "REFIN" ? "Refinanciamento" : "Sem vinculação"],
            ]}
          />
        );
      case "quitacao":
        return <QuitacaoTab c={c} />;
      case "complementares":
        return (
          <KV
            items={[
              ["Código de verba", c.codigoVerba],
              ["Observações", c.observacoes ?? "—"],
            ]}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Contrato
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{c.nome}</h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6, color: "var(--text-muted)" }}>
            <span style={{ fontFamily: "var(--font-mono)" }}>ADF {c.adf}</span>
            <Pill variant={pillVariantFor(c.situacao)}>{c.situacao}</Pill>
            <span>{c.convenio}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => nav("/banco/gerenciador-contratos")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--border-strong)",
            background: "transparent",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ← Voltar para lista
        </button>
      </header>

      <ContratoActions
        actions={[
          { key: "imprimir", onClick: () => window.open(atlas.banco.comprovanteUrl(c.adf), "_blank", "noopener") },
          ...(aguardandoConfirmacao
            ? ([{ key: "alterar" as const, onClick: () => setConfirming("confirmar") }])
            : []),
          { key: "quitar", disabled: c.situacao === "Quitado" || c.situacao === "Cancelado", onClick: () => setConfirming("quitar") },
          { key: "suspender", disabled: c.situacao === "Quitado" || c.situacao === "Cancelado" || c.situacao === "Suspenso", onClick: () => setConfirming("suspender") },
          { key: "cancelar", disabled: c.situacao === "Quitado" || c.situacao === "Cancelado", onClick: () => setConfirming("cancelar") },
          { key: "alongar", disabled: c.situacao !== "Ativo", onClick: () => setConfirming("alongar") },
          { key: "alterar", onClick: () => setConfirming("alterar") },
        ]}
      />

      <Tabs tabs={TABS} activeKey={tab} onChange={(k) => setTab(k as TabKey)} />
      <div>{tabContent}</div>

      {confirming ? (
        <ConfirmDialog
          acao={confirming}
          onClose={() => setConfirming(null)}
          onConfirm={(payload) => {
            const key = (confirming === "confirmar" ? "confirmar" : confirming) as "quitar" | "suspender" | "cancelar" | "alongar" | "alterar" | "confirmar";
            acao.mutate(
              { key, payload },
              {
                onSettled: () => setConfirming(null),
              },
            );
          }}
        />
      ) : null}
    </div>
  );
}

function FichaContrato({ c }: { c: BancoContratoFull }) {
  return (
    <KV
      items={[
        ["Situação", c.situacao],
        ["ADF", c.adf],
        ["Tipo de contrato", c.tipoContrato],
        ["Convênio", c.convenio],
        ["Código de verba", c.codigoVerba],
        ["Data do contrato", c.dataContrato],
        ["Folha primeiro desconto", c.folhaPrimeiroDesconto],
        ["Folha último desconto", c.folhaUltimoDesconto],
        ["Total de parcelas", String(c.totalParcelas)],
        ["Parcelas pagas", String(c.parcelasPagas)],
        ["Valor da parcela", fmtBRL(c.valorParcela)],
        ["Saldo devedor", fmtBRL(c.saldoDevedor)],
      ]}
    />
  );
}

function FinanciamentoTab({ c }: { c: BancoContratoFull }) {
  return (
    <KV
      items={[
        ["Valor financiado", fmtBRL(c.valorFinanciado)],
        ["Valor líquido liberado", fmtBRL(c.valorLiquido)],
        ["IOF", fmtBRL(c.iof)],
        ["Dias de carência", String(c.diasCarencia)],
        ["Taxa mensal", fmtPct(c.taxaAm)],
        ["CET mensal", fmtPct(c.cetAm)],
        ["CET anual", `${(((1 + c.cetAm) ** 12 - 1) * 100).toFixed(2)}% a.a.`],
      ]}
    />
  );
}

function ParcelasTab({ parcelas }: { parcelas: { numero: number; vencimento: string; valor: number; situacao: string }[] }) {
  const columns: Column<(typeof parcelas)[number]>[] = [
    { key: "numero", header: "Nº", width: 60 },
    { key: "vencimento", header: "Vencimento" },
    { key: "valor", header: "Valor", render: (p) => fmtBRL(p.valor), align: "right" },
    {
      key: "situacao",
      header: "Situação",
      render: (p) => <Pill variant={p.situacao === "Paga" ? "emdia" : p.situacao === "Em aberto" ? "pendente" : "aceita"}>{p.situacao}</Pill>,
    },
  ];
  return <DataTable columns={columns} rows={parcelas} rowKey={(r) => String(r.numero)} />;
}

function HistoricoTab({ eventos }: { eventos: { id: number; evento: string; deEstado: string | null; paraEstado: string | null; ator: string; motivo?: string; criadoEm: string }[] }) {
  const columns: Column<(typeof eventos)[number]>[] = [
    { key: "criadoEm", header: "Quando", render: (e) => new Date(e.criadoEm).toLocaleString("pt-BR") },
    { key: "evento", header: "Evento" },
    { key: "de", header: "De", render: (e) => e.deEstado ?? "—" },
    { key: "para", header: "Para", render: (e) => e.paraEstado ?? "—" },
    { key: "ator", header: "Ator", mono: true },
    { key: "motivo", header: "Motivo", render: (e) => e.motivo ?? "—" },
  ];
  return <DataTable columns={columns} rows={eventos} rowKey={(e) => String(e.id)} />;
}

function QuitacaoTab({ c }: { c: BancoContratoFull }) {
  const dataRef = new Date().toLocaleDateString("pt-BR");
  const desconto = c.saldoDevedor * 0.02;
  const valorQuitacao = c.saldoDevedor - desconto;
  return (
    <KV
      items={[
        ["Data de referência", dataRef],
        ["Saldo devedor", fmtBRL(c.saldoDevedor)],
        ["Desconto estimado (2%)", `- ${fmtBRL(desconto)}`],
        ["Valor de quitação", fmtBRL(valorQuitacao)],
      ]}
    />
  );
}

function KV({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
      {items.map(([k, v]) => (
        <div key={k}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-dim)", textTransform: "uppercase" }}>{k}</div>
          <div style={{ marginTop: 4, fontSize: 14, color: "var(--text)" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ acao, onClose, onConfirm }: { acao: string; onClose: () => void; onConfirm: (payload: Record<string, unknown>) => void }) {
  const [motivo, setMotivo] = useState("");
  const [parcelasExtras, setParcelasExtras] = useState(12);
  const [observacoes, setObservacoes] = useState("");

  const titles: Record<string, string> = {
    quitar: "Quitar contrato?",
    suspender: "Suspender contrato?",
    cancelar: "Cancelar contrato?",
    alongar: "Alongar contrato?",
    alterar: "Alterar contrato?",
    confirmar: "Confirmar reserva?",
  };

  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--scrim, rgba(10,22,40,.55))",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--border-strong)",
          borderRadius: 14,
          padding: 24,
          maxWidth: 480,
          width: "calc(100% - 48px)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{titles[acao] ?? "Confirmar"}</h3>
        <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 14 }}>
          Esta ação será registrada na auditoria do contrato.
        </p>
        {acao === "alongar" ? (
          <input
            type="number"
            value={parcelasExtras}
            onChange={(e) => setParcelasExtras(Number(e.target.value))}
            placeholder="Parcelas a adicionar"
            style={dialogInput}
          />
        ) : acao === "alterar" ? (
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações atualizadas"
            style={{ ...dialogInput, minHeight: 80, resize: "vertical" }}
          />
        ) : (
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            style={dialogInput}
          />
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text)", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const payload: Record<string, unknown> = {};
              if (motivo) payload.motivo = motivo;
              if (acao === "alongar") payload.parcelasExtras = parcelasExtras;
              if (acao === "alterar") payload.observacoes = observacoes;
              onConfirm(payload);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: acao === "cancelar" ? "var(--danger-500)" : "linear-gradient(135deg, var(--emerald-500), var(--emerald-600))",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

const dialogInput: React.CSSProperties = {
  width: "100%",
  marginTop: 16,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
};
