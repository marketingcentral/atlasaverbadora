import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { TipoMargem } from "@atlas/types";

// Limites regulatórios da margem consignável — replicados aqui para não puxar
// @atlas/domain (que não é dep do @atlas/web). Fonte da verdade continua no
// domain package; se mudar lá, atualizar aqui.
const LIMITES_MARGEM: Record<TipoMargem, number> = {
  EMPRESTIMO: 0.35,
  CARTAO_CONSIGNADO: 0.05,
  CARTAO_BENEFICIOS: 0.05,
};
const margemTotal = (salario: number, tipo: TipoMargem) => salario * LIMITES_MARGEM[tipo];
const margemDisponivel = (salario: number, comprometido: number, tipo: TipoMargem) =>
  Math.max(0, margemTotal(salario, tipo) - comprometido);
import {
  ContratosTable,
  MargemCalculadorBox,
  MargemProjecaoLinha,
} from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { fmtBRL } from "../../../lib/banco-propostas";

/** Mapeia tipoContrato do backend para o TipoMargem do domain. */
function tipoContratoParaMargem(tipoContrato: string): TipoMargem {
  const t = tipoContrato.toUpperCase();
  if (t === "ECONSIGNADO" || t === "CARTAO_CONSIGNADO") return "CARTAO_CONSIGNADO";
  if (t === "CARTAO_BENEFICIOS") return "CARTAO_BENEFICIOS";
  return "EMPRESTIMO"; // EMPRESTIMO, REFIN → margem de empréstimo
}

/** Contratos "vivos" que ainda consomem margem (aguardando/ativo/averbado/liberado). */
function consumeMargem(situacao: string): boolean {
  const s = situacao.toLowerCase();
  if (s.includes("cancel") || s.includes("recus") || s.includes("expir") || s.includes("quitad")) return false;
  return s.includes("aguard") || s.includes("ativo") || s.includes("libera") || s.includes("averb");
}

export function BancoMargemContratacaoFicha() {
  const { idMatricula = "" } = useParams<{ idMatricula: string }>();
  const nav = useNavigate();

  const ficha = useQuery({
    queryKey: ["banco", "margem", idMatricula],
    queryFn: () => atlas.banco.margemBuscar({ matricula: idMatricula.replace(/^MAT-/, "") }),
    enabled: !!idMatricula,
  });

  const contratos = useQuery({
    queryKey: ["banco", "contratos", idMatricula],
    queryFn: () =>
      // Ficha de um colaborador especifico: busca em todos os convenios do banco.
      atlas.banco.contratos({ colaborador: idMatricula.replace(/^MAT-/, ""), incluirTodosConvenios: true }),
    enabled: !!idMatricula,
  });

  const hoje = new Date();
  const [mes, setMes] = useState<string>(monthLabel(hoje.getMonth() + 1));
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const calcular = useMutation({
    mutationFn: () => atlas.banco.margemCalcular(idMatricula, { mes: monthIndex(mes), ano }),
  });

  // Comprometido por tipo de margem, com base nos contratos vivos do servidor.
  const comprometidoPorTipo = useMemo(() => {
    const acc: Record<TipoMargem, number> = { EMPRESTIMO: 0, CARTAO_CONSIGNADO: 0, CARTAO_BENEFICIOS: 0 };
    for (const c of contratos.data?.contratos ?? []) {
      if (!consumeMargem(c.situacao)) continue;
      acc[tipoContratoParaMargem(c.tipoContrato)] += c.valorParcela;
    }
    return acc;
  }, [contratos.data]);

  if (ficha.isLoading) return <div style={{ color: "var(--text-muted)" }}>Carregando ficha...</div>;
  if (ficha.error || !ficha.data) return <div style={{ color: "var(--danger-500)" }}>Erro ao carregar colaborador.</div>;

  const f = ficha.data.ficha;
  // LGPD: banco NAO recebe salarioLiquido — usa `margens` pré-calculadas
  // pelo backend (contem total/utilizado/disponivel por bucket).
  // Fallback pro calculo local so quando o backend nao trouxer (SDK antigo).
  const labelOf = (t: TipoMargem): string =>
    t === "EMPRESTIMO"
      ? "Empréstimo Consignado"
      : t === "CARTAO_CONSIGNADO"
        ? "Cartão de Crédito Consignado"
        : "Cartão Benefício Consignado";
  const margens: { tipo: TipoMargem; label: string; total: number; utilizado: number; disponivel: number }[] =
    f.margens && f.margens.length > 0
      ? f.margens.map((m) => ({ ...m, label: labelOf(m.tipo) }))
      : (["EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS"] as const).map((t) => {
          const salario = 0; // sem backend, nao ha como calcular — retorna zero
          const utilizado = comprometidoPorTipo[t];
          return {
            tipo: t,
            label: labelOf(t),
            total: margemTotal(salario, t),
            utilizado,
            disponivel: margemDisponivel(salario, utilizado, t),
          };
        });

  // Contratos "ativos do servidor" para a tabela do modelo (apenas os que ainda vivem).
  const contratosAtivos = (contratos.data?.contratos ?? []).filter((c) => consumeMargem(c.situacao));
  const situacaoFuncional = (f.situacaoFuncional || "").toLowerCase();
  const isAtivo = situacaoFuncional === "ativo" || situacaoFuncional === "trabalhando";

  const calc = calcular.data ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200 }}>
      {/* Header no modelo: nome grande + subtítulo (mat, cpf mascarado, situação/origem) + pills à direita */}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Margem / Contratação
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>{f.nome}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Mat: <span style={{ fontFamily: "var(--font-mono)" }}>{f.matricula}</span>
            {" · "}CPF: <span style={{ fontFamily: "var(--font-mono)" }}>{f.cpfMasked}</span>
            {f.origem ? <> · {f.origem}</> : null}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusPill on={isAtivo}>{isAtivo ? "● Ativo" : f.situacaoFuncional || "Situação"}</StatusPill>
          <StatusPill neutro>{f.vinculo || "Efetivo"}</StatusPill>
          <button
            type="button"
            onClick={() => nav("/banco/margem-contratacao")}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ← Nova busca
          </button>
        </div>
      </header>

      {/* 3 cards de margem lado a lado — modelo da screenshot */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {margens.map((m) => (
          <MargemTipoCard key={m.tipo} label={m.label} total={m.total} utilizado={m.utilizado} disponivel={m.disponivel} />
        ))}
      </section>

      {/* Cliente pediu 23/07/2026 pra DESABILITAR "Reservar margem" e "Novas
          contratacoes" nesta ficha: o banco nao origina operacao por aqui — a
          ficha e' so consulta de margem/contratos. As rotas
          `reservar/*` e `averbar/*` continuam existindo (fluxo por proposta do
          servidor / API de parceiro), so nao ha mais ponto de entrada na ficha. */}

      {/* Contratos ativos do servidor — tabela do modelo */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Contratos ativos do servidor
        </div>
        <ContratosTable
          loading={contratos.isLoading}
          rows={contratosAtivos.map((c) => ({
            adf: c.adf,
            situacao: c.situacao,
            lancamento: c.lancamento,
            expiracao: c.expiracao,
            tipoContrato: c.tipoContrato,
            totalParcelas: c.totalParcelas,
            valorParcela: c.valorParcela,
            convenio: c.convenio,
          }))}
          emptyState="Este servidor não possui contratos ativos."
        />
      </section>

      {/* Simulação avançada — mantida como opcional pra recalcular por competência */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: "var(--text-muted)" }}>Simulação por competência</h2>
        <MargemCalculadorBox
          mes={mes}
          ano={ano}
          onMesChange={setMes}
          onAnoChange={setAno}
          total={calc?.total ?? null}
          disponivel={calc?.disponivel ?? null}
          tipo="EMPRESTIMO"
          calculando={calcular.isPending}
          onCalcular={() => calcular.mutate()}
        />
        {calc ? <MargemProjecaoLinha meses={calc.projecao} /> : null}
      </section>
    </div>
  );
}

/** Card do modelo: título + pill "● Disponível" + progress bar + TOTAL/UTILIZADO/DISPONÍVEL. */
function MargemTipoCard({
  label,
  total,
  utilizado,
  disponivel,
}: {
  label: string;
  total: number;
  utilizado: number;
  disponivel: number;
}) {
  const pct = total > 0 ? Math.min(1, utilizado / total) : 0;
  const semUso = utilizado === 0 && total > 0;
  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{label}</div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--emerald-500)",
            border: "1px solid var(--emerald-500)",
            borderRadius: 999,
            padding: "2px 10px",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ● Disponível
        </span>
      </div>
      {/* Progress bar mostrando utilizado / total */}
      <div style={{ height: 6, borderRadius: 6, background: "var(--bg-elev-2)", overflow: "hidden", marginBottom: 14 }}>
        <div
          style={{
            width: `${Math.round(pct * 100)}%`,
            height: "100%",
            background: semUso ? "var(--emerald-500)" : "var(--gold-500)",
          }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <ValorLinha label="TOTAL" value={fmtBRL(total)} color="var(--text)" />
        <ValorLinha label="UTILIZADO" value={fmtBRL(utilizado)} color={utilizado > 0 ? "var(--gold-500)" : "var(--text-muted)"} />
        <ValorLinha label="DISPONÍVEL" value={fmtBRL(disponivel)} color="var(--emerald-500)" bold />
      </div>
    </article>
  );
}

function ValorLinha({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: bold ? 800 : 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function StatusPill({ on, neutro, children }: { on?: boolean; neutro?: boolean; children: React.ReactNode }) {
  const cor = neutro ? "var(--text-muted)" : on ? "var(--emerald-500)" : "var(--gold-500)";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: cor,
        border: `1px solid ${cor}`,
        borderRadius: 999,
        padding: "3px 10px",
      }}
    >
      {children}
    </span>
  );
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function monthLabel(m: number): string { return MESES[m - 1] ?? "Janeiro"; }
function monthIndex(label: string): number { return MESES.indexOf(label) + 1 || 1; }
