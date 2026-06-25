import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Input } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import { ApiHttpError } from "@atlas/sdk";

function formatCpfDisplay(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function BancoMargemContratacaoBusca() {
  const nav = useNavigate();
  const [matricula, setMatricula] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState<"matricula" | "cpf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exemplos = useQuery({
    queryKey: ["banco", "margem", "exemplos"],
    queryFn: () => atlas.banco.margemExemplos(),
  });

  async function buscar(by: "matricula" | "cpf", e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(by);
    try {
      const { ficha } = await atlas.banco.margemBuscar(by === "cpf" ? { cpf } : { matricula });
      nav(`/banco/margem-contratacao/${ficha.idMatricula}`);
    } catch (err) {
      if (err instanceof ApiHttpError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Erro ao buscar");
      }
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
        <div style={{ color: "var(--danger-500)", fontSize: 14 }}>{error}</div>
      ) : null}

      {exemplos.data ? (
        <section
          style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Exemplos no convênio ativo ({exemplos.data.activeConvenioNome})
          </div>
          {exemplos.data.noConvenio.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Nenhum servidor cadastrado neste convênio. Importe servidores em <code>/averbadora/servidores</code>.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {exemplos.data.noConvenio.map((s) => (
                <button
                  key={s.matricula}
                  type="button"
                  onClick={() => { setMatricula(s.matricula); setCpf(formatCpfDisplay(s.cpf)); }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-strong)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: "var(--text)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                  title="Preencher matrícula e CPF nos campos"
                >
                  {s.nome} • MAT {s.matricula} • {s.cpfMasked}
                </button>
              ))}
            </div>
          )}
          {exemplos.data.outrosConvenios.length > 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              Em outros convênios:{" "}
              {exemplos.data.outrosConvenios.map((s, i) => (
                <span key={s.matricula}>
                  {i > 0 ? " • " : ""}
                  {s.nome} ({s.convenio})
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
