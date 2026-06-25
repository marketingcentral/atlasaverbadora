import type { ReactNode } from "react";

export interface ContratoRow {
  adf: string;
  situacao: string;
  lancamento?: string;
  expiracao?: string | null;
  cpfMasked?: string;
  lotacao?: string;
  matricula?: string;
  nome?: string;
  tipoContrato?: string;
  totalParcelas?: number;
  valorParcela?: number;
  convenio?: string;
  onClick?: () => void;
}

interface Props {
  rows: ContratoRow[];
  emptyState?: ReactNode;
  showColaborador?: boolean;
  loading?: boolean;
}

const fmtBRL = (n?: number) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ContratosTable({ rows, emptyState, showColaborador = false, loading }: Props) {
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12 }}>
        Carregando contratos...
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12 }}>
        {emptyState ?? "Nenhum contrato encontrado."}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--bg-elev-2)" }}>
            <Th>Situação</Th>
            <Th>ADF</Th>
            <Th>Lançamento</Th>
            <Th>Expiração</Th>
            {showColaborador ? <Th>CPF</Th> : null}
            {showColaborador ? <Th>Lotação</Th> : null}
            {showColaborador ? <Th>Matrícula</Th> : null}
            {showColaborador ? <Th>Nome</Th> : null}
            <Th>Tipo</Th>
            <Th>Total parcelas</Th>
            <Th>Valor parcela</Th>
            <Th>Convênio</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.adf}
              onClick={r.onClick}
              style={{
                borderTop: "1px solid var(--border)",
                cursor: r.onClick ? "pointer" : "default",
                transition: "background .1s",
              }}
              onMouseEnter={(e) => {
                if (r.onClick) e.currentTarget.style.background = "var(--bg-elev-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Td>
                <SituacaoDot value={r.situacao} />
              </Td>
              <Td mono>{r.adf}</Td>
              <Td>{r.lancamento ?? "—"}</Td>
              <Td>{r.expiracao ?? "—/—/—"}</Td>
              {showColaborador ? <Td mono>{r.cpfMasked ?? "—"}</Td> : null}
              {showColaborador ? <Td>{r.lotacao ?? "—"}</Td> : null}
              {showColaborador ? <Td>{r.matricula ?? "—"}</Td> : null}
              {showColaborador ? <Td>{r.nome ?? "—"}</Td> : null}
              <Td>{r.tipoContrato ?? "—"}</Td>
              <Td>{r.totalParcelas ?? "—"}</Td>
              <Td>{fmtBRL(r.valorParcela)}</Td>
              <Td>{r.convenio ?? "—"}</Td>
              <Td>{r.onClick ? <span style={{ color: "var(--accent)" }}>→</span> : null}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SITUACAO_COLOR: Record<string, string> = {
  Ativo: "var(--emerald-500)",
  Cancelado: "var(--danger-500)",
  Quitado: "var(--info-500)",
  Migrado: "var(--warn-500)",
  Finalizado: "var(--text-dim)",
  "Aguardando Confirmação do Deferimento": "var(--warn-500)",
};

function SituacaoDot({ value }: { value: string }) {
  const color = SITUACAO_COLOR[value] ?? "var(--text-dim)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <span style={{ color: "var(--text)" }}>{value}</span>
    </span>
  );
}

function Th({ children }: { children?: ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 12px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--text-dim)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono }: { children?: ReactNode; mono?: boolean }) {
  return (
    <td
      style={{
        padding: "10px 12px",
        fontFamily: mono ? "var(--font-mono)" : undefined,
        color: "var(--text)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
