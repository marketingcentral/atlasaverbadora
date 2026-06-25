import { useQuery } from "@tanstack/react-query";
import { Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

export function PrefeituraComunicados() {
  const q = useQuery({ queryKey: ["prefeitura", "comunicados"], queryFn: () => atlas.prefeitura.comunicados() });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Comunicados</h1>
        <p style={{ color: "var(--text-muted)" }}>Avisos publicados para bancos e servidores.</p>
      </header>

      {q.isLoading ? <Card><span style={{ color: "var(--text-muted)" }}>Carregando…</span></Card> : null}
      <div style={{ display: "grid", gap: 12 }}>
        {(q.data?.comunicados ?? []).map((c) => (
          <Card key={c.id}>
            <h3 style={{ margin: "0 0 6px" }}>{c.titulo}</h3>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14, lineHeight: 1.5 }}>{c.corpo}</p>
            {c.linkHref ? (
              <a href={c.linkHref} style={{ color: "var(--accent)", fontSize: 13, marginTop: 8, display: "inline-block" }}>{c.linkLabel ?? "Saiba mais"} →</a>
            ) : null}
          </Card>
        ))}
        {!q.isLoading && (q.data?.comunicados ?? []).length === 0 ? (
          <Card><span style={{ color: "var(--text-muted)" }}>Nenhum comunicado.</span></Card>
        ) : null}
      </div>
    </div>
  );
}
