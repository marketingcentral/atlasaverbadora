import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";

export function BancoMargemContratacaoBusca() {
  const nav = useNavigate();
  const [matricula, setMatricula] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState<"matricula" | "cpf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar(by: "matricula" | "cpf", e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(by);
    try {
      const { ficha } = await atlas.banco.margemBuscar(by === "cpf" ? { cpf } : { matricula });
      nav(`/banco/margem-contratacao/${ficha.idMatricula}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Margem / Contratação
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>Buscar colaborador</h1>
        <p style={{ color: "var(--text-muted)" }}>Informe a matrícula ou CPF para consultar margem e iniciar operação.</p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <form onSubmit={(e) => buscar("matricula", e)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input
            label="Matrícula"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            placeholder="Ex: 852029100"
            inputMode="numeric"
            autoFocus
          />
          <Button type="submit" disabled={loading !== null || !matricula}>
            {loading === "matricula" ? "Buscando..." : "Buscar por matrícula →"}
          </Button>
        </form>
        <form onSubmit={(e) => buscar("cpf", e)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input
            label="CPF"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.111.222-33"
            inputMode="numeric"
          />
          <Button variant="ghost" type="submit" disabled={loading !== null || !cpf}>
            {loading === "cpf" ? "Buscando..." : "Buscar por CPF →"}
          </Button>
        </form>
      </section>

      {error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 14 }}>
          {error.includes("not_found") ? "Colaborador não encontrado no convênio ativo." : error}
        </div>
      ) : null}
    </div>
  );
}
