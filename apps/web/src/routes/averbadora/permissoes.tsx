import { Card } from "@atlas/ui/web";
import { PRESETS, RESOURCE_GROUPS, TODAS_PERMISSOES, type AverbadoraPerfil } from "../../lib/averbadora-perms";

/** Visualizacao read-only dos presets disponiveis. Ajuda o supervisor a
 *  entender o que cada preset marca. A edicao real de permissoes acontece
 *  em /averbadora/perfis (modal de criar/editar usuario). */
export function AverbadoraPermissoes() {
  const presets: AverbadoraPerfil[] = ["supervisor", "operador", "comercial", "financeiro", "auditoria", "personalizado"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span className="eyebrow">Averbadora</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Presets de permissão</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, maxWidth: 780 }}>
          Presets são pontos de partida para novos usuários. Ao criar um usuário em <code style={mono}>/averbadora/perfis</code>,
          você escolhe um preset e ele pré-marca as caixas correspondentes. Depois, marque/desmarque caixa
          por caixa para customizar — a fonte da verdade é sempre o array <code style={mono}>permissoes</code> do usuário.
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
                {presets.map((p) => (
                  <th key={p} style={{ ...thStyle, textTransform: "uppercase" }}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCE_GROUPS.map((grupo) => (
                <>
                  <tr key={`g-${grupo.titulo}`}>
                    <td
                      colSpan={presets.length + 1}
                      style={{
                        padding: "10px 14px", fontSize: 11, letterSpacing: "0.08em", fontWeight: 700,
                        color: "var(--gold-500)", textTransform: "uppercase",
                        background: "var(--bg-elev-2)", borderTop: "1px solid var(--border-strong)",
                      }}
                    >
                      {grupo.titulo}
                    </td>
                  </tr>
                  {grupo.recursos.map((r) => (
                    <tr key={r.key} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ ...tdStyle, textAlign: "left", position: "sticky", left: 0, background: "var(--surface)" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
                        <code style={{ fontSize: 11, color: "var(--text-dim)" }}>{r.key}</code>
                      </td>
                      {presets.map((p) => {
                        const has = presetInclui(p, r.key);
                        return (
                          <td key={p} style={{ ...tdStyle, color: has ? "var(--emerald-500)" : "var(--text-dim)" }}>
                            {has ? "✓" : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Como funciona</h3>
        <ul style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          <li>
            <b>Fonte de verdade:</b> cada usuário guarda um array <code style={mono}>permissoes: string[]</code>.
            "*" é wildcard e libera tudo (supervisor).
          </li>
          <li>
            <b>Frontend:</b> o menu esconde abas cujo key não está nas permissões e a navegação direta redireciona.
          </li>
          <li>
            <b>Backend:</b> cada endpoint chama <code style={mono}>requirePermissao(j, "&lt;key&gt;")</code> — 403 se
            o usuário não tem a caixa marcada.
          </li>
          <li>
            <b>Dev-user</b> (admin@atlas.test) não tem claim de permissões — cai como supervisor por retrocompat.
          </li>
          <li>
            Total de recursos disponíveis para marcar: <b>{TODAS_PERMISSOES.length}</b>.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function presetInclui(p: AverbadoraPerfil, key: string): boolean {
  const set = PRESETS[p];
  if (!set) return false;
  return set.includes("*") || set.includes(key);
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
