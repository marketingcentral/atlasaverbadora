import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, IconButton, Pill, SelectField, type Column } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
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

// Proposta vinda do backend (real, criada pelo servidor). `_api` marca a origem
// para o front decidir via API (não localStorage).
type PropostaRow = BancoProposta & { _api?: boolean };

/** Converte "DD/MM/YYYY" (lancamento do backend) em ISO para o countdown da trava. */
function parseBrDate(s: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return new Date().toISOString();
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).toISOString();
}

/** Mapeia um contrato/reserva do backend para o modelo de proposta do banco. */
function contratoToProposta(ct: {
  adf: string; situacao: string; lancamento: string; cpfMasked: string; matricula: string;
  nome: string; tipoContrato: string; totalParcelas: number; valorParcela: number;
  convenio: string; valorFinanciado: number; taxaAm: number;
}): PropostaRow {
  const t = ct.situacao.toLowerCase();
  const status: BancoPropostaStatus = t.includes("aguard")
    ? "recebida"
    : t.includes("cancel") || t.includes("suspens") || t.includes("recus")
      ? "recusada"
      : t.includes("ativo") || t.includes("averb") || t.includes("quitad")
        ? "averbada"
        : "recebida";
  return {
    idUnico: ct.adf,
    cpfMasked: ct.cpfMasked,
    nome: ct.nome,
    convenio: ct.convenio,
    matricula: ct.matricula,
    produto: ct.tipoContrato === "REFIN" ? "portabilidade" : "novo",
    valor: ct.valorFinanciado,
    parcelas: ct.totalParcelas,
    parcela: ct.valorParcela,
    taxaAm: ct.taxaAm * 100,
    margemComprometida: ct.valorParcela,
    margemDisponivel: 0,
    salarioLiquido: 0,
    vinculo: "",
    situacaoFuncional: "",
    status,
    criadaEm: parseBrDate(ct.lancamento),
    travaHoras: 48,
    contratosAtivos: [],
    _api: true,
  };
}

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

  const qc = useQueryClient();
  // Propostas REAIS do backend (criadas pelo servidor). Poll pra ver novas caírem na fila.
  const apiQ = useQuery({
    queryKey: ["banco", "propostas-api"],
    queryFn: () => atlas.banco.contratos(),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
  const decidir = useMutation({
    mutationFn: ({ adf, acao }: { adf: string; acao: "confirmar" | "cancelar" }) => atlas.banco.acao(adf, acao),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco", "propostas-api"] });
      qc.invalidateQueries({ queryKey: ["servidor", "propostas"] });
    },
  });

  // Fila = propostas reais do backend (primeiro) + o seed de demonstração (localStorage).
  const todas: PropostaRow[] = useMemo(() => {
    const api = (apiQ.data?.contratos ?? []).map(contratoToProposta);
    return [...api, ...(getAllPropostas() as PropostaRow[])];
  }, [apiQ.data]);

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

  const columns: Column<PropostaRow>[] = [
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
        actions={(r) => {
          // Trava expirada: banco perdeu a janela — nao pode mais decidir.
          const travaExp = travaInfo(r)?.expirada;
          if (r._api) {
            // Trava expirada: nao mostra rotulo aqui — a coluna "Trava
            // restante" ja indica "expirou" em vermelho. Actions vazio evita
            // duplicar a mesma informacao.
            if (travaExp) return null;
            if (r.status === "recebida") {
              return (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Button size="sm" disabled={decidir.isPending} onClick={() => decidir.mutate({ adf: r.idUnico, acao: "confirmar" })}>Aprovar</Button>
                  <Button size="sm" variant="ghost" disabled={decidir.isPending} onClick={() => decidir.mutate({ adf: r.idUnico, acao: "cancelar" })}>Recusar</Button>
                </div>
              );
            }
            return <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{STATUS_LABEL[r.status]}</span>;
          }
          return <IconButton title="Analisar proposta" onClick={() => nav(`/banco/propostas/${r.idUnico}`)}>›</IconButton>;
        }}
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
