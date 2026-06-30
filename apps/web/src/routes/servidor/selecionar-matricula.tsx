import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { clearAtlasState } from "../../lib/session";
import {
  MATRICULAS,
  STORAGE_KEY_ID,
  readActiveIdMatricula,
  setActiveMatricula,
} from "../../lib/matricula-data";

export function ServidorSelecionarMatricula() {
  const nav = useNavigate();
  const [search] = useSearchParams();
  const forceShow = search.get("trocar") === "1";

  useEffect(() => {
    if (forceShow) return;
    const already = readActiveIdMatricula();
    if (already && MATRICULAS.some((m) => m.idMatricula === already)) {
      nav("/servidor/dashboard", { replace: true });
      return;
    }
    if (MATRICULAS.length === 1) {
      setActiveMatricula(MATRICULAS[0]!.idMatricula);
      nav("/servidor/dashboard", { replace: true });
    }
  }, [nav, forceShow]);

  function escolher(idMatricula: string) {
    setActiveMatricula(idMatricula);
    nav("/servidor/dashboard", { replace: true });
  }

  async function sair() {
    await atlas.logout().catch(() => undefined);
    clearAtlasState();
    nav("/login", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-400) 40%, var(--emerald-500))",
              display: "grid", placeItems: "center", color: "var(--navy-900)", fontWeight: 800,
              boxShadow: "var(--shadow-gold)",
            }}
          >
            A
          </span>
          <div style={{ fontWeight: 700 }}>Atlas</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {window.localStorage.getItem(STORAGE_KEY_ID) ? (
            <Button variant="ghost" size="sm" onClick={() => nav("/servidor/dashboard")}>
              ← Voltar
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={sair}>
            Sair
          </Button>
        </div>
      </header>

      <main style={{ flex: 1, padding: "48px 24px", maxWidth: 720, width: "100%", margin: "0 auto" }}>
        <span className="eyebrow">Selecione sua matricula</span>
        <h1 style={{ margin: "8px 0 0", fontSize: "1.8rem", letterSpacing: "-.02em" }}>
          Voce tem mais de uma matricula
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Como voce tem cargos em mais de uma prefeitura (acumulacao de cargos), escolha qual deseja visualizar agora.
          Voce pode trocar a qualquer momento pelo menu da sua Conta.
        </p>

        <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
          {MATRICULAS.map((m) => (
            <Card key={m.idMatricula} style={{ padding: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{m.prefeitura}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: ".9rem", marginTop: 4 }}>
                    {m.nome} · {m.cargo}
                  </div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: ".82rem",
                      marginTop: 8,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Matricula <b style={{ color: "var(--text)" }}>{m.matricula}</b> · {m.uf}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: ".75rem",
                      fontWeight: 700,
                      background: m.ativa
                        ? "color-mix(in srgb, var(--emerald-500) 20%, transparent)"
                        : "var(--bg-elev-2)",
                      color: m.ativa ? "var(--emerald-500)" : "var(--text-muted)",
                    }}
                  >
                    {m.ativa ? "Ativa" : "Inativa"}
                  </span>
                  <Button size="sm" onClick={() => escolher(m.idMatricula)}>
                    Entrar →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 14,
            borderRadius: 10,
            background: "var(--bg-elev-2)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: ".85rem",
            lineHeight: 1.6,
          }}
        >
          <b>Acumulacao legal de cargos.</b> Cada matricula tem sua propria margem consignavel, contratos e folha de
          pagamento. Operacoes feitas em uma nao afetam a outra.
        </div>
      </main>
    </div>
  );
}
