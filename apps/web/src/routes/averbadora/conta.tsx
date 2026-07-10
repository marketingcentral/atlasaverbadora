import { GerenciarDoisFA } from "../../components/GerenciarDoisFA";

/** Minha conta — subusuario da averbadora. Foco em seguranca (2FA self-service). */
export function AverbadoraConta() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <header>
        <span className="eyebrow">Averbadora</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Minha conta</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Gerencie a seguranca da sua conta de subusuario da averbadora.
        </p>
      </header>
      <GerenciarDoisFA />
    </div>
  );
}
