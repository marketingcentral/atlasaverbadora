import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, IconButton, Pill, SelectField, type Column } from "@atlas/ui/web";
import {
  getBancoConvenios,
  PRODUTO_LABEL,
  STATUS_LABEL,
  fmtBRL,
  getAllPropostas,
  getBancoPerfil,
  setBancoPerfil,
  BANCO_PERFIS,
  statusPill,
  travaInfo,
  type BancoProduto,
  type BancoProposta,
  type BancoPropostaStatus,
} from "../../../lib/banco-propostas";

const STATUS_OPTS: BancoPropostaStatus[] = [
  "recebida",
  "em_analise",
  "aprovada",
  "aguardando_formalizacao",
  "formalizada",
  "averbada",
  "recusada",
  "mais_info",
  "expirada",
];

export function BancoPropostas() {
  const nav = useNavigate();
  const [convenio, setConvenio] = useState("");
  const [produto, setProduto] = useState<"" | BancoProduto>("");
  const [status, setStatus] = useState<"" | BancoPropostaStatus>("");
  const [expirando, setExpirando] = useState(false);
  const [perfilId, setPerfilId] = useState(() => getBancoPerfil().id);

  // Re-render a cada 60s para o countdown da trava permanecer vivo.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const todas = getAllPropostas();

  const filtradas = useMemo(() => {
    return todas.filter((p) => {
      if (convenio && p.convenio !== convenio) return false;
      if (produto && p.produto !== produto) return false;
      if (status && p.status !== status) return false;
      if (expirando) {
        const t = travaInfo(p);
        if (!t || t.expirada || !t.urgente) return false;
      }
      return true;
    });
  }, [todas, convenio, produto, status, expirando]);

  const columns: Column<BancoProposta>[] = [
    { key: "status", header: "Status", render: (r) => <Pill variant={statusPill(r.status)}>{STATUS_LABEL[r.status]}</Pill> },
    { key: "idUnico", header: "ID único", mono: true },
    {
      key: "nome",
      header: "Servidor",
      render: (r) => (
        <>
          <div>{r.nome}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
            {r.cpfMasked} / {r.matricula}
          </div>
        </>
      ),
    },
    { key: "convenio", header: "Convênio" },
    { key: "produto", header: "Produto", render: (r) => PRODUTO_LABEL[r.produto] },
    { key: "valor", header: "Valor", align: "right", render: (r) => fmtBRL(r.valor) },
    { key: "parcelas", header: "Parcelas", align: "right", render: (r) => `${r.parcelas}x` },
    { key: "margemComprometida", header: "Margem compr.", align: "right", render: (r) => fmtBRL(r.margemComprometida) },
    {
      key: "trava",
      header: "Trava restante",
      render: (r) => {
        const t = travaInfo(r);
        if (!t) return <span style={{ color: "var(--text-dim)" }}>—</span>;
        if (t.expirada) return <span style={{ color: "var(--danger-500)" }}>expirou</span>;
        return (
          <span style={{ color: t.urgente ? "var(--gold-500)" : "var(--text)", fontWeight: t.urgente ? 600 : 400 }}>
            {t.label}
          </span>
        );
      },
    },
  ];

  const resumo = useMemo(() => {
    const emAnalise = todas.filter((p) => p.status === "recebida" || p.status === "em_analise").length;
    const expirandoCount = todas.filter((p) => {
      const t = travaInfo(p);
      return t && !t.expirada && t.urgente;
    }).length;
    const aguardando = todas.filter((p) => p.status === "aguardando_formalizacao").length;
    return { emAnalise, expirandoCount, aguardando };
  }, [todas]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Esteira
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Minhas Propostas</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 640 }}>
            Fila de pré-reservas recebidas do app do servidor. A margem está travada até a decisão do banco; ao expirar, retorna
            para "disponível".
          </p>
        </div>
        <PerfilSwitcher
          value={perfilId}
          onChange={(id) => {
            setBancoPerfil(id);
            setPerfilId(id);
          }}
        />
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <MiniStat label="Em análise" value={resumo.emAnalise} />
        <MiniStat label="Trava expirando (24h)" value={resumo.expirandoCount} warn={resumo.expirandoCount > 0} />
        <MiniStat label="Aguardando formalização" value={resumo.aguardando} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <SelectField
          label="Convênio"
          value={convenio}
          onChange={(e) => setConvenio(e.target.value)}
          options={[{ value: "", label: "Todos" }, ...getBancoConvenios().map((c) => ({ value: c, label: c }))]}
        />
        <SelectField
          label="Produto"
          value={produto}
          onChange={(e) => setProduto(e.target.value as "" | BancoProduto)}
          options={[
            { value: "", label: "Todos" },
            { value: "novo", label: PRODUTO_LABEL.novo },
            { value: "portabilidade", label: PRODUTO_LABEL.portabilidade },
          ]}
        />
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | BancoPropostaStatus)}
          options={[{ value: "", label: "Todos" }, ...STATUS_OPTS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", paddingBottom: 8 }}>
          <input type="checkbox" checked={expirando} onChange={(e) => setExpirando(e.target.checked)} />
          Só trava expirando (24h)
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={filtradas}
        rowKey={(r) => r.idUnico}
        actions={(r) => <IconButton title="Analisar proposta" onClick={() => nav(`/banco/propostas/${r.idUnico}`)}>›</IconButton>}
      />
    </div>
  );
}

function PerfilSwitcher({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div style={{ minWidth: 220 }}>
      <SelectField
        label="Perfil do operador"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={BANCO_PERFIS.map((p) => ({ value: p.id, label: `${p.nome} (${p.papel})` }))}
      />
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: warn ? "var(--gold-500)" : "var(--text)" }}>{value}</div>
    </div>
  );
}
