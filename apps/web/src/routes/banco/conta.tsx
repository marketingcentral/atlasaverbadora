import { GerenciarDoisFA } from "../../components/GerenciarDoisFA";

/** Minha conta — operador do banco. */
export function BancoConta() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <header>
        <span className="eyebrow">Banco</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Minha conta</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Gerencie a seguranca do login do banco.
        </p>
      </header>
      <GerenciarDoisFA />
    </div>
  );
}
