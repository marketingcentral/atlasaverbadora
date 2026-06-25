import { useEffect, useState } from "react";

export interface Comunicado {
  id: string;
  titulo: string;
  corpo: string;
  imagemUrl?: string;
  link?: { label: string; href: string };
}

interface Props {
  comunicados: Comunicado[];
  autoplayMs?: number;
}

export function ComunicadoCarrossel({ comunicados, autoplayMs = 6000 }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (comunicados.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % comunicados.length), autoplayMs);
    return () => clearInterval(t);
  }, [comunicados.length, autoplayMs]);

  if (comunicados.length === 0) return null;
  const c = comunicados[idx]!;

  return (
    <article
      style={{
        background: "linear-gradient(135deg, var(--navy-700), var(--navy-800))",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        padding: 24,
        minHeight: 180,
        position: "relative",
        overflow: "hidden",
        color: "#EAF0FA",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -100,
          background: "radial-gradient(circle at 30% 30%, rgba(201,169,97,.2), transparent 50%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: c.imagemUrl ? "1fr auto" : "1fr", gap: 24, alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "var(--gold-500)" }}>{c.titulo}</h3>
          <p style={{ margin: "10px 0 0", maxWidth: 540, color: "#C7D2E0", fontSize: 14, lineHeight: 1.5 }}>{c.corpo}</p>
          {c.link ? (
            <a
              href={c.link.href}
              style={{
                display: "inline-block",
                marginTop: 14,
                padding: "8px 16px",
                borderRadius: 999,
                background: "var(--gold-500)",
                color: "var(--navy-900)",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {c.link.label}
            </a>
          ) : null}
        </div>
        {c.imagemUrl ? (
          <img src={c.imagemUrl} alt="" style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 12, opacity: 0.9 }} />
        ) : null}
      </div>
      {comunicados.length > 1 ? (
        <div style={{ position: "absolute", bottom: 12, right: 16, display: "flex", gap: 6 }}>
          {comunicados.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 18 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                background: i === idx ? "var(--gold-500)" : "rgba(255,255,255,.3)",
                cursor: "pointer",
                transition: "width .25s",
              }}
              aria-label={`Comunicado ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
