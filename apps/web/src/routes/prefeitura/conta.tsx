import { GerenciarDoisFA } from "../../components/GerenciarDoisFA";

/** Minha conta — operador da prefeitura. */
export function PrefeituraConta() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <header>
        <span className="eyebrow">Prefeitura</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Minha conta</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Gerencie a seguranca do login da prefeitura.
        </p>
      </header>
      <GerenciarDoisFA />
    </div>
  );
}
