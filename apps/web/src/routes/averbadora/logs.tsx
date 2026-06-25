import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar, FilterCheckboxGroup } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

const LEVELS = [
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
];

const SOURCES = [
  { value: "system", label: "System" },
  { value: "auth", label: "Auth" },
  { value: "bank", label: "Bank" },
  { value: "webhook", label: "Webhook" },
  { value: "cron", label: "Cron" },
  { value: "admin", label: "Admin" },
];

export function AdminLogs() {
  const [levels, setLevels] = useState<Set<string>>(new Set(["info", "warn", "error"]));
  const [sources, setSources] = useState<Set<string>>(new Set(SOURCES.map((s) => s.value)));

  const data = useQuery({
    queryKey: ["admin", "logs"],
    queryFn: () => atlas.admin.logs(),
    refetchInterval: 5000,
  });

  const filtered = (data.data?.logs ?? []).filter((e) => levels.has(e.level) && sources.has(e.source));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Logs em tempo real</h1>
        <p style={{ color: "var(--text-muted)" }}>Atualiza a cada 5s. Em produção será SSE com filtros server-side.</p>
      </header>

      <FilterBar
        onReset={() => {
          setLevels(new Set(["info", "warn", "error"]));
          setSources(new Set(SOURCES.map((s) => s.value)));
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>Nível</div>
            <FilterCheckboxGroup options={LEVELS} selected={levels} onChange={setLevels} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>Origem</div>
            <FilterCheckboxGroup options={SOURCES} selected={sources} onChange={setSources} />
          </div>
        </div>
      </FilterBar>

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
          <div style={{ color: "#6B7E9B" }}>Sem eventos.</div>
        ) : (
          filtered.map((e) => (
            <div key={e.trace_id + e.ts} style={{ display: "flex", gap: 10, padding: "2px 0", whiteSpace: "nowrap" }}>
              <span style={{ color: "#6B7E9B" }}>{new Date(e.ts).toLocaleTimeString("pt-BR")}</span>
              <span style={{ color: e.level === "error" ? "#FCA5A5" : e.level === "warn" ? "#F59E0B" : "#34D399", width: 50 }}>{e.level.toUpperCase()}</span>
              <span style={{ color: "#93C5FD", width: 80 }}>{e.source}</span>
              <span style={{ color: "#94A3B8" }}>{e.trace_id}</span>
              <span>{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
