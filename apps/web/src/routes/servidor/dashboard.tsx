import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, MargemCard, Pill } from "@atlas/ui/web";
import type { MargemResponse } from "@atlas/types";

interface MatriculaMeta {
  idMatricula: string;
  matricula: string;
  prefeitura: string;
  uf: string;
  cargo: string;
  vinculo?: string;
}

interface ContratoAtivoMock {
  id: string;
  banco: string;
  parcela: number;
  parcelasPagas: number;
  total: number;
  status: "Averbado" | "Em dia";
}

interface MatriculaData {
  prefeitura_id: number;
  servidor_id: number;
  vinculo: "ESTATUTARIO" | "CLT" | "COMISSIONADO";
  cargo: string;
  margem: MargemResponse;
  contratos: ContratoAtivoMock[];
}

const META_KEY = "atlas:idMatricula:meta";

// Mock por matricula. Cada idMatricula tem margem + contratos proprios — o
// switcher do header altera o idMatricula salvo e o dashboard re-renderiza
// com os numeros corretos. Em prod, isso viria de
// GET /v1/servidores/me/margem-consignavel?idMatricula=...
const MATRICULA_DATA: Record<string, MatriculaData> = {
  "MAT-852029100": {
    prefeitura_id: 1,
    servidor_id: 1,
    vinculo: "ESTATUTARIO",
    cargo: "Analista Administrativo",
    margem: {
      servidor_id: 1,
      matricula: "852029100",
      prefeitura_id: 1,
      margem: {
        salario_base: 4620,
        comprometido: 355.74,
        disponivel: 1261.26,
        percentual_uso: 0.22,
      },
      margens_por_tipo: [
        { tipo: "EMPRESTIMO", disponivel: 1261.26, total: 1617 },
        { tipo: "CARTAO_CONSIGNADO", disponivel: 207.9, total: 231 },
        { tipo: "CARTAO_BENEFICIOS", disponivel: 231, total: 231 },
      ],
      fonte: {
        tipo: "folha_prefeitura",
        sincronizado_em: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        cache_status: "MISS",
      },
    },
    contratos: [
      { id: "ADF-S0003", banco: "SCred Financeira", parcela: 1176.37, parcelasPagas: 3, total: 60, status: "Averbado" },
      { id: "ADF-S0002", banco: "SCred Financeira", parcela: 1773.79, parcelasPagas: 4, total: 48, status: "Em dia" },
    ],
  },
  "MAT-009821": {
    prefeitura_id: 2,
    servidor_id: 2,
    vinculo: "ESTATUTARIO",
    cargo: "Professor II",
    margem: {
      servidor_id: 2,
      matricula: "M-009821",
      prefeitura_id: 2,
      margem: {
        salario_base: 6890,
        comprometido: 542.1,
        disponivel: 2347.9,
        percentual_uso: 0.19,
      },
      margens_por_tipo: [
        { tipo: "EMPRESTIMO", disponivel: 2347.9, total: 2890 },
        { tipo: "CARTAO_CONSIGNADO", disponivel: 410.5, total: 445 },
        { tipo: "CARTAO_BENEFICIOS", disponivel: 380, total: 445 },
      ],
      fonte: {
        tipo: "folha_prefeitura",
        sincronizado_em: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        cache_status: "HIT",
      },
    },
    contratos: [
      { id: "ADF-F0021", banco: "Banco Y", parcela: 412.4, parcelasPagas: 8, total: 36, status: "Averbado" },
    ],
  },
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorDashboard() {
  const nav = useNavigate();
  // Track meta in state so a remount/route change causes re-read.
  const [meta, setMeta] = useState<MatriculaMeta | null>(() => readMeta());

  useLayoutEffect(() => {
    if (!window.localStorage.getItem(META_KEY)) {
      nav("/servidor/selecionar-matricula", { replace: true });
    } else {
      setMeta(readMeta());
    }
  }, [nav]);

  const data = useMemo<MatriculaData | null>(() => {
    if (!meta) return null;
    return MATRICULA_DATA[meta.idMatricula] ?? null;
  }, [meta]);

  if (!meta) return null;

  if (!data) {
    return (
      <Card>
        <h3 style={{ marginTop: 0 }}>Matricula sem dados</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Nao encontramos dados para a matricula {meta.matricula}. Selecione outra ou contate o RH.
        </p>
      </Card>
    );
  }

  const nome = "Ana Carolina Silva"; // mesmo titular em ambas matriculas (acumulacao de cargos)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 960, margin: "0 auto", width: "100%" }}>
      <div>
        <span className="eyebrow">Bem-vindo(a)</span>
        <h1 style={{ margin: "6px 0 0", fontSize: "2rem", letterSpacing: "-.02em" }}>{nome}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          Matricula <b>{meta.matricula}</b> · {data.cargo} · {data.vinculo}
        </p>
      </div>

      <MatriculaDropdown meta={meta} />

      <MargemCard data={data.margem} />

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
            {data.margem.margens_por_tipo.map((m) => (
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
            {data.contratos.length === 0 ? (
              <div style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: ".88rem" }}>
                Nenhum contrato ativo nesta matricula.
              </div>
            ) : (
              data.contratos.map((c) => (
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
          <div>Tipo: {data.margem.fonte.tipo}</div>
          <div>Sincronizado: {new Date(data.margem.fonte.sincronizado_em).toLocaleString("pt-BR")}</div>
          <div>
            Cache: <b style={{ color: "var(--accent)" }}>{data.margem.fonte.cache_status}</b>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MatriculaDropdown({ meta }: { meta: MatriculaMeta }) {
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
                {meta.prefeitura}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: ".82rem", fontFamily: "var(--font-mono)" }}>
                {meta.matricula}
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
              {meta.cargo} · {meta.uf}<br />
              <span style={{ fontFamily: "var(--font-mono)" }}>Mat. {meta.matricula}</span>
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

function readMeta(): MatriculaMeta | null {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as MatriculaMeta) : null;
  } catch {
    return null;
  }
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
