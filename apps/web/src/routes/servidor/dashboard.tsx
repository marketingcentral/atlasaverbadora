import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, MargemCard, Pill } from "@atlas/ui/web";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorDashboard() {
  const nav = useNavigate();
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());

  useLayoutEffect(() => {
    const active = readActiveMatricula();
    if (!active) {
      nav("/servidor/selecionar-matricula", { replace: true });
    } else {
      setInfo(active);
    }
  }, [nav]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!info) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 960, margin: "0 auto", width: "100%" }}>
      <div>
        <span className="eyebrow">Bem-vindo(a)</span>
        <h1 style={{ margin: "6px 0 0", fontSize: "2rem", letterSpacing: "-.02em" }}>{info.nome}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Matricula <b>{info.matricula}</b> · {info.cargo} · {info.vinculo}
        </p>
      </div>

      <MatriculaDropdown info={info} />

      <MargemCard data={info.margem} />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <AtalhoCard
          titulo="Simular"
          descricao="Calcule parcelas e veja ofertas de bancos parceiros."
          icon="💰"
          accent="emerald"
          onClick={() => nav("/servidor/simular")}
        />
        <AtalhoCard
          titulo="Portabilidade"
          descricao="Consolide contratos em outro banco com taxa menor."
          icon="🔁"
          accent="gold"
          onClick={() => nav("/servidor/portabilidade")}
        />
        <AtalhoCard
          titulo="Meus contratos"
          descricao="Veja parcelas, progresso e baixe PDFs."
          icon="📄"
          accent="navy"
          onClick={() => nav("/servidor/contratos")}
        />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <Card>
          <span className="eyebrow">Margens por tipo</span>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {info.margem.margens_por_tipo.map((m) => (
              <div
                key={m.tipo}
                style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 12px", background: "var(--bg-elev-2)",
                  borderRadius: 10, fontSize: ".95rem",
                }}
              >
                <span>{m.tipo.replace("_", " ").toLowerCase()}</span>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>{fmtBRL(m.disponivel)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow">Contratos ativos</span>
            <button
              type="button"
              onClick={() => nav("/servidor/contratos")}
              style={{ background: "transparent", border: 0, color: "var(--accent)", fontSize: ".82rem", cursor: "pointer", fontWeight: 600 }}
            >
              Ver todos →
            </button>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {info.contratos.filter((c) => c.status !== "Quitado").length === 0 ? (
              <div style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: ".88rem" }}>
                Nenhum contrato ativo nesta matricula.
              </div>
            ) : (
              info.contratos
                .filter((c) => c.status !== "Quitado")
                .slice(0, 2)
                .map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: "10px 12px", background: "var(--bg-elev-2)", borderRadius: 10,
                      display: "flex", flexDirection: "column", gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: ".92rem" }}>{c.banco}</span>
                      <Pill variant={c.status === "Averbado" ? "averbado" : "aceita"}>{c.status}</Pill>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem", color: "var(--text-muted)" }}>
                      <span>{fmtBRL(c.parcela)}/mes</span>
                      <span>{c.parcelasPagas}/{c.total} parcelas</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <span className="eyebrow">Fonte</span>
        <div style={{ marginTop: 12, fontSize: ".9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          <div>Tipo: {info.margem.fonte.tipo}</div>
          <div>Sincronizado: {new Date(info.margem.fonte.sincronizado_em).toLocaleString("pt-BR")}</div>
          <div>
            Cache: <b style={{ color: "var(--accent)" }}>{info.margem.fonte.cache_status}</b>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MatriculaDropdown({ info }: { info: MatriculaInfo }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function trocar() {
    setOpen(false);
    nav("/servidor/selecionar-matricula?trocar=1");
  }

  return (
    <div ref={ref} style={{ position: "relative", zIndex: 30 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          color: "var(--text)",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--emerald-500)",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
              Matricula ativa
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
              <span style={{ fontWeight: 700, fontSize: ".98rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {info.prefeitura}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: ".82rem", fontFamily: "var(--font-mono)" }}>
                {info.matricula}
              </span>
            </div>
          </div>
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: ".9rem", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg-elev)",
            border: "1px solid var(--border-strong)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,.45)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 50,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
              Detalhes
            </div>
            <div style={{ marginTop: 6, fontSize: ".88rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {info.cargo} · {info.uf}<br />
              <span style={{ fontFamily: "var(--font-mono)" }}>Mat. {info.matricula}</span>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border)" }} />
          <Button size="sm" variant="ghost" onClick={trocar}>
            Trocar matricula →
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function AtalhoCard({
  titulo,
  descricao,
  icon,
  accent,
  onClick,
}: {
  titulo: string;
  descricao: string;
  icon: string;
  accent: "emerald" | "gold" | "navy";
  onClick: () => void;
}) {
  const accentColor =
    accent === "emerald" ? "var(--emerald-500)" : accent === "gold" ? "var(--gold-500)" : "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left", cursor: "pointer",
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: 18, display: "flex", flexDirection: "column", gap: 8,
        transition: "transform .12s ease, border-color .12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)" }}>{titulo}</span>
      <span style={{ fontSize: ".88rem", color: "var(--text-muted)" }}>{descricao}</span>
    </button>
  );
}
