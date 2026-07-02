import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

// O endpoint /comunicados e compartilhado com o banco — alguns links apontam
// para rotas fora do escopo da prefeitura (/banco/*) e outros ficam como
// placeholder "#". Este componente classifica cada link em uma das 3 categorias
// e renderiza de acordo, evitando o bug de "clico e nao vai a lugar nenhum".
type LinkKind =
  | { kind: "prefeitura"; to: string }
  | { kind: "external"; href: string }
  | { kind: "other-portal"; label: string }
  | { kind: "none" };

function classifyLink(href: string | undefined): LinkKind {
  if (!href || href === "#") return { kind: "none" };
  if (href.startsWith("http://") || href.startsWith("https://")) return { kind: "external", href };
  if (href.startsWith("/prefeitura")) return { kind: "prefeitura", to: href };
  if (href.startsWith("/banco")) return { kind: "other-portal", label: "portal do banco" };
  if (href.startsWith("/averbadora")) return { kind: "other-portal", label: "portal da averbadora" };
  if (href.startsWith("/servidor")) return { kind: "other-portal", label: "app do servidor" };
  return { kind: "prefeitura", to: href };
}

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
        {(q.data?.comunicados ?? []).map((c) => {
          const target = classifyLink(c.linkHref);
          return (
            <Card key={c.id}>
              <h3 style={{ margin: "0 0 6px" }}>{c.titulo}</h3>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14, lineHeight: 1.5 }}>{c.corpo}</p>
              <div style={{ marginTop: 8 }}>
                {target.kind === "prefeitura" ? (
                  <Link
                    to={target.to}
                    style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}
                  >
                    {c.linkLabel ?? "Saiba mais"} →
                  </Link>
                ) : target.kind === "external" ? (
                  <a
                    href={target.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}
                  >
                    {c.linkLabel ?? "Saiba mais"} ↗
                  </a>
                ) : target.kind === "other-portal" ? (
                  <Pill variant="pendente">Disponível no {target.label}</Pill>
                ) : null}
              </div>
            </Card>
          );
        })}
        {!q.isLoading && (q.data?.comunicados ?? []).length === 0 ? (
          <Card><span style={{ color: "var(--text-muted)" }}>Nenhum comunicado.</span></Card>
        ) : null}
      </div>
    </div>
  );
}
