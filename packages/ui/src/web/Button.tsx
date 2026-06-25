import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "ghost" | "success";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 15,
  border: "1px solid transparent",
  cursor: "pointer",
  transition: "transform .15s, background .2s, color .2s, box-shadow .25s, border-color .2s",
  whiteSpace: "nowrap",
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
    color: "var(--navy-900)",
    boxShadow: "var(--shadow-gold)",
  },
  ghost: {
    background: "var(--surface)",
    color: "var(--text)",
    borderColor: "var(--border-strong)",
  },
  success: {
    background: "linear-gradient(135deg, var(--emerald-500), var(--emerald-600))",
    color: "#FFFFFF",
  },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: "8px 14px", fontSize: 13 },
  md: { padding: "12px 20px" },
};

export function Button({ variant = "primary", size = "md", style, children, disabled, ...rest }: PropsWithChildren<Props>) {
  const disabledStyle: React.CSSProperties = disabled
    ? { opacity: 0.5, cursor: "not-allowed", boxShadow: "none", filter: "saturate(0.6)" }
    : {};
  return (
    <button {...rest} disabled={disabled} style={{ ...baseStyle, ...variantStyles[variant], ...sizeStyles[size], ...disabledStyle, ...style }}>
      {children}
    </button>
  );
}
