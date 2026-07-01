import { useState } from "react";

export interface ColaboradorFicha {
  matricula: string;
  cpf: string;
  cpfMasked: string;
  nome: string;
  dataAdmissao: string;
  vinculo: string;
  origem: string;
  situacaoFuncional: string;
}

interface Props {
  ficha: ColaboradorFicha;
  onClose?: () => void;
}

function fmtCpf(cpf: string): string {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

export function MargemColaboradorCard({ ficha, onClose }: Props) {
  // Operadores do banco veem o CPF completo por padrao (dado autorizado via convenio).
  const [revealCpf, setRevealCpf] = useState(true);
  return (
    <article
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "start" }}>
        <Field label="Matrícula" value={ficha.matricula} />
        <Field
          label="CPF"
          value={
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontFamily: "var(--font-mono)" }}>
              {revealCpf ? fmtCpf(ficha.cpf) : ficha.cpfMasked}
              <button
                type="button"
                onClick={() => setRevealCpf((v) => !v)}
                aria-label={revealCpf ? "Esconder CPF" : "Revelar CPF"}
                style={iconBtn}
                title={revealCpf ? "Esconder" : "Revelar"}
              >
                {revealCpf ? "🙈" : "👁"}
              </button>
            </span>
          }
        />
        <Field label="Vínculo" value={ficha.vinculo} />
        {onClose ? (
          <button type="button" onClick={onClose} style={{ ...iconBtn, fontSize: 16 }} aria-label="Fechar">
            ×
          </button>
        ) : (
          <span />
        )}
        <Field label="Nome" value={<b style={{ color: "var(--text)" }}>{ficha.nome}</b>} />
        <Field label="Data de admissão" value={ficha.dataAdmissao} />
        <Field label="Situação funcional" value={ficha.situacaoFuncional} />
        <span />
        <Field label="Origem" value={ficha.origem} />
        <span />
        <span />
        <span />
      </div>
    </article>
  );
}

const iconBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 14, color: "var(--text)" }}>{value}</div>
    </div>
  );
}
