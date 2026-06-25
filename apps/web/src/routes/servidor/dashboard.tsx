import { useQuery } from "@tanstack/react-query";
import { Card, MargemCard } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

export function ServidorDashboard() {
  const profile = useQuery({ queryKey: ["me"], queryFn: () => atlas.getMyProfile() });
  const margem = useQuery({ queryKey: ["margem"], queryFn: () => atlas.getMyMargem() });

  if (profile.isLoading || margem.isLoading) {
    return <Card><span style={{ color: "var(--text-muted)" }}>Carregando seus dados...</span></Card>;
  }

  if (profile.error || margem.error) {
    return (
      <Card>
        <h3 style={{ marginTop: 0 }}>Erro ao carregar</h3>
        <p style={{ color: "var(--text-muted)" }}>{(profile.error ?? margem.error) instanceof Error ? (profile.error ?? margem.error)!.message : "Erro desconhecido"}</p>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 1fr", maxWidth: 960, margin: "0 auto", width: "100%" }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <span className="eyebrow">Bem-vindo(a)</span>
        <h1 style={{ margin: "6px 0 0", fontSize: "2rem", letterSpacing: "-.02em" }}>
          {profile.data?.nome}
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Matricula <b>{profile.data?.matricula}</b> · {profile.data?.vinculo}
        </p>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        {margem.data ? <MargemCard data={margem.data} /> : null}
      </div>

      <Card>
        <span className="eyebrow">Margens por tipo</span>
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {margem.data?.margens_por_tipo.map((m) => (
            <div key={m.tipo} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-elev-2)", borderRadius: 10, fontSize: ".95rem" }}>
              <span>{m.tipo.replace("_", " ").toLowerCase()}</span>
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(m.disponivel)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <span className="eyebrow">Fonte</span>
        <div style={{ marginTop: 12, fontSize: ".9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          <div>Tipo: {margem.data?.fonte.tipo}</div>
          <div>Sincronizado: {margem.data ? new Date(margem.data.fonte.sincronizado_em).toLocaleString("pt-BR") : "-"}</div>
          <div>Cache: <b style={{ color: "var(--accent)" }}>{margem.data?.fonte.cache_status}</b></div>
        </div>
      </Card>
    </div>
  );
}
