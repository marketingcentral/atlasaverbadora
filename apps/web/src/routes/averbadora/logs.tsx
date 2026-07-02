import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterCheckboxGroup } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const LEVELS = [
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
];

type Perfil = "averbadora" | "banco" | "prefeitura" | "servidor" | "sistema";
const ABAS: { value: Perfil | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "averbadora", label: "Averbadora" },
  { value: "banco", label: "Banco" },
  { value: "prefeitura", label: "Prefeitura" },
  { value: "servidor", label: "Servidor" },
  { value: "sistema", label: "Sistema" },
];

export function AdminLogs() {
  const [aba, setAba] = useState<Perfil | "todos">("todos");
  const [levels, setLevels] = useState<Set<string>>(new Set(["info", "warn", "error"]));

  const data = useQuery({
    queryKey: ["admin", "logs"],
    queryFn: () => atlas.admin.logs(),
    refetchInterval: 5000,
  });

  const todos = data.data?.logs ?? [];
  const filtered = todos.filter((e) => levels.has(e.level) && (aba === "todos" || e.perfil === aba));
  const contarPerfil = (p: Perfil) => todos.filter((e) => e.perfil === p).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Logs por perfil</h1>
        <p style={{ color: "var(--text-muted)" }}>Toda alteração (criar / editar / desativar / importar) aparece no log do perfil que a fez. Atualiza a cada 5s.</p>
      </header>

      {/* Abas de perfil */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ABAS.map((a) => {
          const ativo = aba === a.value;
          const n = a.value === "todos" ? todos.length : contarPerfil(a.value);
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => setAba(a.value)}
              style={{
                padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: ativo ? 700 : 500,
                border: `1px solid ${ativo ? "var(--accent)" : "var(--border-strong)"}`,
                background: ativo ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--surface)",
                color: "var(--text)",
              }}
            >
              {a.label} <span style={{ color: "var(--text-muted)", fontSize: 12 }}>({n})</span>
            </button>
          );
        })}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>Nível</div>
        <FilterCheckboxGroup options={LEVELS} selected={levels} onChange={setLevels} />
      </div>

      <div
        style={{
          background: "var(--navy-900)",
          border: "1px solid var(--border-strong)",
          borderRadius: 12,
          padding: 16,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#DCE3F2",
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: "#6B7E9B" }}>Sem eventos neste perfil.</div>
        ) : (
          filtered.map((e) => (
            <div key={e.trace_id + e.ts} style={{ display: "flex", gap: 10, padding: "2px 0", whiteSpace: "nowrap" }}>
              <span style={{ color: "#6B7E9B" }}>{new Date(e.ts).toLocaleTimeString("pt-BR")}</span>
              <span style={{ color: e.level === "error" ? "#FCA5A5" : e.level === "warn" ? "#F59E0B" : "#34D399", width: 46 }}>{e.level.toUpperCase()}</span>
              {aba === "todos" ? <span style={{ color: "#C4B5FD", width: 84 }}>{e.perfil}</span> : null}
              <span style={{ color: "#93C5FD", width: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{e.source}</span>
              <span>{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
