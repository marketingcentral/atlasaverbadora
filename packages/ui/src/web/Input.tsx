import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, error, id, style, ...rest }, ref) {
  const inputId = id ?? `inp-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={inputId} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <input
        ref={ref}
        id={inputId}
        {...rest}
        style={{
          background: "var(--surface)",
          border: `1px solid ${error ? "var(--danger-500)" : "var(--border-strong)"}`,
          borderRadius: 10,
          padding: "12px 14px",
          color: "var(--text)",
          fontSize: 15,
          outline: "none",
          ...style,
        }}
      />
      {error ? <span style={{ fontSize: 12, color: "var(--danger-500)" }}>{error}</span> : null}
    </label>
  );
});
