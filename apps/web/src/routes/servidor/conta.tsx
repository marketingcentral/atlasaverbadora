import { Button, Card, useThemeMode } from "@atlas/ui/web";
import { useNavigate } from "react-router-dom";
import { atlas } from "../../lib/sdk";

export function ServidorConta() {
  const nav = useNavigate();
  const { mode, setMode } = useThemeMode();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Conta
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Minha conta</h1>
      </header>

      <Card>
        <h3 style={{ marginTop: 0 }}>Aparência</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["system", "light", "dark"] as const).map((m) => (
            <Button key={m} variant={mode === m ? "primary" : "ghost"} size="sm" onClick={() => setMode(m)}>
              {m === "system" ? "Seguir sistema" : m === "light" ? "Claro" : "Escuro"}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Segurança</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Login biométrico está disponível apenas no app mobile (Face/Touch ID).
        </p>
      </Card>

      <div>
        <Button
          variant="ghost"
          onClick={async () => {
            await atlas.logout().catch(() => undefined);
            window.localStorage.removeItem("atlas:role");
            window.localStorage.removeItem("atlas:tokens");
            nav("/login");
          }}
        >
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
