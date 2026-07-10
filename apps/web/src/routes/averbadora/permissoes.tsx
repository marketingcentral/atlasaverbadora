import { Card } from "@atlas/ui/web";
import { MATRIX, TODOS_PERFIS, type AverbadoraPerfil } from "../../lib/averbadora-perms";

/** Matriz visual "quem tem acesso a que" pro supervisor auditar. Read-only.
 *  Fonte de verdade: lib/averbadora-perms.ts MATRIX — se voce alterar la, a
 *  UI reflete automaticamente. Enforcement REAL vive no backend
 *  (requireAverbadoraPerfil) em endpoints selecionados. */
export function AverbadoraPermissoes() {
  // Ordena keys por grupo pra ficar mais legivel — hoje 1 grupo so, ordenado.
  const keys = Object.keys(MATRIX).sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span className="eyebrow">Averbadora</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Matriz de permissões</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, maxWidth: 720 }}>
          Quem tem acesso a que dentro do painel. Supervisor sempre vê tudo. Se voce quer alterar quem
          acessa uma aba, edite <code style={mono}>apps/web/src/lib/averbadora-perms.ts</code> e faça deploy.
        </p>
      </header>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left", position: "sticky", left: 0, background: "var(--surface)" }}>
                  Recurso
                </th>
                {TODOS_PERFIS.map((p) => (
                  <th key={p} style={{ ...thStyle, textTransform: "uppercase" }}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const allowed = MATRIX[k] ?? [];
                return (
                  <tr key={k} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ ...tdStyle, textAlign: "left", position: "sticky", left: 0, background: "var(--surface)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {k}
                    </td>
                    {TODOS_PERFIS.map((p) => {
                      const has = perfilPode(p, allowed);
                      return (
                        <td key={p} style={{ ...tdStyle, color: has ? "var(--emerald-500)" : "var(--text-dim)" }}>
                          {has ? "✓" : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Como funciona</h3>
        <ul style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          <li>
            <b>Frontend:</b> o menu esconde abas fora do perfil e a navegação direta redireciona pra dashboard.
          </li>
          <li>
            <b>Backend:</b> os endpoints mais sensíveis (CRUD de bancos, api-tokens, webhooks, perfis) validam
            o subperfil via <code style={mono}>requireAverbadoraPerfil</code>. Endpoints não protegidos ainda
            aceitam qualquer averbadora — não é enforcement completo.
          </li>
          <li>
            <b>Dev-user</b> (admin@atlas.test) entra sem claim de subperfil e é tratado como supervisor.
          </li>
          <li>
            Cada usuário pode ativar 2FA em <code style={mono}>/averbadora/conta</code>.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function perfilPode(p: AverbadoraPerfil, allowed: AverbadoraPerfil[]): boolean {
  if (p === "supervisor") return true;
  return allowed.includes(p);
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};
const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 11,
  letterSpacing: "0.06em",
  fontWeight: 700,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  textAlign: "center",
  background: "var(--surface)",
  borderBottom: "1px solid var(--border-strong)",
};
const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "center",
  fontSize: 13,
};
const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  padding: "1px 5px",
  borderRadius: 4,
  background: "var(--bg-elev-2)",
};
