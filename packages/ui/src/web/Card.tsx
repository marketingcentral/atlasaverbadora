import type { HTMLAttributes, PropsWithChildren } from "react";

interface Props extends HTMLAttributes<HTMLElement> {
  elevated?: boolean;
}

export function Card({ elevated = false, style, children, ...rest }: PropsWithChildren<Props>) {
  return (
    <article
      {...rest}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 24,
        boxShadow: elevated ? "var(--shadow-md)" : undefined,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        ...style,
      }}
    >
      {children}
    </article>
  );
}
