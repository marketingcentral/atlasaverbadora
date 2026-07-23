import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { formatCpf, formatCnpj, formatTelefone, formatCep } from "./masks.js";

interface BaseProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
}

function FieldShell({ label, hint, error, required, children }: BaseProps & { children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
        {label}
        {required ? <span style={{ color: "var(--danger-500)", marginLeft: 4 }}>*</span> : null}
      </span>
      {children}
      {hint && !error ? <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{hint}</span> : null}
      {error ? <span style={{ fontSize: 11, color: "var(--danger-500)" }}>{error}</span> : null}
    </label>
  );
}

const inputStyle = (error?: string): React.CSSProperties => ({
  background: "var(--bg-elev)",
  border: `1px solid ${error ? "var(--danger-500)" : "var(--border-strong)"}`,
  borderRadius: 10,
  padding: "10px 14px",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
});

export const TextField = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, hint, error, required, style, ...rest }, ref) {
    return (
      <FieldShell label={label} hint={hint} error={error} required={required}>
        <input ref={ref} {...rest} style={{ ...inputStyle(error), ...style }} />
      </FieldShell>
    );
  },
);

interface CurrencyProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | null;
  onValueChange: (n: number | null) => void;
}

export const CurrencyField = forwardRef<HTMLInputElement, BaseProps & CurrencyProps>(function CurrencyField(
  { label, hint, error, required, value, onValueChange, style, ...rest },
  ref,
) {
  const display = value == null ? "" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", fontSize: 13 }}>R$</span>
        <input
          ref={ref}
          inputMode="decimal"
          type="text"
          value={display}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            if (!digits) return onValueChange(null);
            onValueChange(Number(digits) / 100);
          }}
          {...rest}
          style={{ ...inputStyle(error), paddingLeft: 36, ...style }}
        />
      </div>
    </FieldShell>
  );
});

export const NumberField = forwardRef<HTMLInputElement, BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function NumberField({ label, hint, error, required, style, ...rest }, ref) {
    return (
      <FieldShell label={label} hint={hint} error={error} required={required}>
        <input ref={ref} type="number" {...rest} style={{ ...inputStyle(error), ...style }} />
      </FieldShell>
    );
  },
);

// Campos com mascara BR (CPF, CNPJ, telefone, CEP). Aceitam value/onChange
// como string mascarada (o mesmo formato que aparece na tela). O caller
// extrai so os digitos com `.replace(/\D/g, "")` na hora de persistir.
// Alternativa: value cru + onChangeDigits (nao adotado pra manter API igual
// ao TextField — caller que decide se guarda cru ou mascarado no state).

interface MaskedProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "maxLength"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function makeMaskedField(fmt: (raw: string) => string, defaultPlaceholder: string, maxLen: number) {
  return forwardRef<HTMLInputElement, BaseProps & MaskedProps>(
    function MaskedField({ label, hint, error, required, style, value, onChange, placeholder, ...rest }, ref) {
      const display = fmt(value ?? "");
      return (
        <FieldShell label={label} hint={hint} error={error} required={required}>
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={maxLen}
            placeholder={placeholder ?? defaultPlaceholder}
            value={display}
            onChange={(e) => {
              // Reescreve o value pra manter só o formato mascarado — evita
              // usuario colar lixo (letras, virgulas, etc.).
              const masked = fmt(e.target.value);
              const synthetic = { ...e, target: { ...e.target, value: masked } } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(synthetic);
            }}
            {...rest}
            style={{ ...inputStyle(error), ...style }}
          />
        </FieldShell>
      );
    },
  );
}

export const CpfField = makeMaskedField(formatCpf, "000.000.000-00", 14);
export const CnpjField = makeMaskedField(formatCnpj, "00.000.000/0000-00", 18);
export const TelefoneField = makeMaskedField(formatTelefone, "(00) 00000-0000", 15);
export const CepField = makeMaskedField(formatCep, "00000-000", 9);

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: { value: string; label: string }[];
}

export const SelectField = forwardRef<HTMLSelectElement, BaseProps & SelectFieldProps>(function SelectField(
  { label, hint, error, required, options, style, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <select ref={ref} {...rest} style={{ ...inputStyle(error), ...style }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldShell>
  );
});

export const TextareaField = forwardRef<HTMLTextAreaElement, BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextareaField({ label, hint, error, required, style, ...rest }, ref) {
    return (
      <FieldShell label={label} hint={hint} error={error} required={required}>
        <textarea ref={ref} {...rest} style={{ ...inputStyle(error), minHeight: 80, resize: "vertical", ...style }} />
      </FieldShell>
    );
  },
);

interface FormGridProps {
  cols?: 1 | 2 | 3 | 4;
  children: ReactNode;
}

export function FormGrid({ cols = 2, children }: FormGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

interface FormActionsProps {
  children: ReactNode;
}

export function FormActions({ children }: FormActionsProps) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}
