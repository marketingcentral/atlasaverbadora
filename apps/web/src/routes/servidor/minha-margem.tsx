import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Pill } from "@atlas/ui/web";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

type TipoMargem = "EMPRESTIMO" | "CARTAO_CONSIGNADO" | "CARTAO_BENEFICIOS";

const MODALIDADES: { id: TipoMargem; nome: string; descricao: string; icone: string }[] = [
  {
    id: "EMPRESTIMO",
    nome: "Empréstimo Consignado",
    descricao:
      "Crédito parcelado com desconto direto na folha. Ideal para valores maiores em prazos mais longos. Após aprovação, o valor cai na sua conta e as parcelas passam a ser descontadas do salário.",
    icone: "💰",
  },
  {
    id: "CARTAO_CONSIGNADO",
    nome: "Cartão de Crédito Consignado",
    descricao:
      "Cartão de crédito com limite exclusivo. A fatura mensal é descontada em folha, sem risco de inadimplência. Alguns municípios oferecem tabelas exclusivas.",
    icone: "💳",
  },
  {
    id: "CARTAO_BENEFICIOS",
    nome: "Cartão Benefício Consignado",
    descricao:
      "Cartão específico para saúde e bem-estar (farmácias, mercados, óticas, telemedicina). A fatura é descontada em folha, como o cartão consignado, mas com uso restrito a benefícios.",
    icone: "🎁",
  },
];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/** Contratos "ativos" da matricula filtrados por modalidade — heurística por nome. */
function contratosDaModalidade(info: MatriculaInfo, tipo: TipoMargem) {
  return info.contratos.filter((c) => {
    if (c.status === "Quitado") return false;
    const bancoLower = c.banco.toLowerCase();
    const isRefin = bancoLower.includes("refin");
    if (tipo === "EMPRESTIMO") return !bancoLower.includes("cart") && !bancoLower.includes("benef") || isRefin;
    if (tipo === "CARTAO_CONSIGNADO") return bancoLower.includes("cart") && !bancoLower.includes("benef");
    if (tipo === "CARTAO_BENEFICIOS") return bancoLower.includes("benef");
    return false;
  });
}

export function ServidorMinhaMargem() {
  const nav = useNavigate();
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());
  const [tab, setTab] = useState<TipoMargem>("EMPRESTIMO");

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const porTipo = useMemo(() => {
    const map = new Map<TipoMargem, { total: number; disponivel: number }>();
    for (const m of info?.margem.margens_por_tipo ?? []) {
      map.set(m.tipo as TipoMargem, { total: m.total, disponivel: m.disponivel });
    }
    return map;
  }, [info]);

  if (!info) return null;

  const modalidadeAtiva = MODALIDADES.find((m) => m.id === tab)!;
  const dados = porTipo.get(tab) ?? { total: 0, disponivel: 0 };
  const utilizado = Math.max(0, dados.total - dados.disponivel);
  const pctUsado = dados.total > 0 ? (utilizado / dados.total) * 100 : 0;
  const pctLivre = 100 - pctUsado;
  const contratos = contratosDaModalidade(info, tab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1000, width: "100%", margin: "0 auto" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Meu painel
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>Minha Margem</h1>
        <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Cada modalidade tem seu próprio limite — o disponível em uma não pode ser usado em outra.
        </div>
      </header>

      {/* Tabs de modalidade */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {MODALIDADES.map((m) => {
          const d = porTipo.get(m.id);
          const disp = d?.disponivel ?? 0;
          return (
            <ModalidadeTab
              key={m.id}
              ativa={tab === m.id}
              onClick={() => setTab(m.id)}
              icone={m.icone}
              nome={m.nome}
              disponivel={disp}
            />
          );
        })}
      </div>

      {/* Card grande com detalhamento da modalidade escolhida */}
      <article style={{
        background: "linear-gradient(160deg, var(--navy-700), var(--navy-900))",
        border: "1px solid var(--navy-700)",
        borderRadius: 16,
        padding: 24,
        color: "#EAF0FA",
        boxShadow: "var(--shadow-md)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: "rgba(255,255,255,.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, flexShrink: 0,
          }}>{modalidadeAtiva.icone}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9BAAC2" }}>
              Modalidade
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, marginTop: 2 }}>{modalidadeAtiva.nome}</div>
            <div style={{ fontSize: 12.5, color: "#C7D2E0", marginTop: 6, lineHeight: 1.5, maxWidth: 700 }}>
              {modalidadeAtiva.descricao}
            </div>
          </div>
        </div>

        {/* 3 blocos: Total / Utilizado / Disponível */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 18 }}>
          <BigStat label="Total" value={fmtBRL(dados.total)} color="#EAF0FA" />
          <BigStat label="Utilizado" value={fmtBRL(utilizado)} color={utilizado > 0 ? "#C9A961" : "#7A8CA8"} />
          <BigStat label="Disponível" value={fmtBRL(dados.disponivel)} color="#10B981" bold />
        </div>

        {/* Barra de progresso grande */}
        <div style={{ height: 8, background: "rgba(255,255,255,.08)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            width: `${pctUsado}%`,
            height: "100%",
            background: utilizado === 0 ? "#10B981" : pctUsado > 80 ? "#EF4444" : "#C9A961",
            transition: "width .4s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
          <span style={{ color: utilizado > 0 ? "#C9A961" : "#7A8CA8" }}>
            {utilizado === 0 ? "0% utilizado" : `${pctUsado.toFixed(1)}% utilizado`}
          </span>
          <span style={{ color: "#10B981" }}>{pctLivre.toFixed(1)}% livre</span>
        </div>
      </article>

      {/* Exclusividades do cartão consignado — só na aba CARTAO_CONSIGNADO e quando
          a prefeitura definiu algo. Aparece antes dos contratos pra dar destaque. */}
      {tab === "CARTAO_CONSIGNADO" && info.exclusividadesCartaoConsig?.trim() ? (
        <article style={{
          background: "color-mix(in srgb, var(--gold-500) 8%, var(--surface))",
          border: "1px solid var(--gold-500)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "color-mix(in srgb, var(--gold-500) 20%, transparent)",
            color: "var(--gold-500)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>⭐</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: ".08em", fontWeight: 700, color: "var(--gold-500)", textTransform: "uppercase", marginBottom: 3 }}>
              Exclusividade da sua prefeitura
            </div>
            <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {info.exclusividadesCartaoConsig}
            </div>
          </div>
        </article>
      ) : null}

      {/* Contratos ativos dessa modalidade */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Contratos que consomem esta margem
        </span>
        {contratos.length === 0 ? (
          <div style={{
            padding: 20, borderRadius: 12, border: "1px dashed var(--border)",
            color: "var(--text-muted)", fontSize: 13, textAlign: "center",
          }}>
            Você não tem contratos ativos consumindo esta margem no momento.
          </div>
        ) : (
          contratos.map((c) => (
            <article key={c.id} style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
              padding: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.banco}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {c.parcelasPagas} / {c.total} parcelas · próxima {c.proximaParcela}
                </div>
              </div>
              <Pill variant={c.status === "Averbado" ? "averbado" : "aceita"}>{c.status}</Pill>
              <div style={{ textAlign: "right", minWidth: 100 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtBRL(c.parcela)}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>/mês</div>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Ação sugerida — vinculada à modalidade escolhida.
          EMPRESTIMO e CARTAO_CONSIGNADO -> Simular (/servidor/simular).
          CARTAO_BENEFICIOS -> Ver ofertas no marketplace (não simula). */}
      {dados.disponivel > 0 ? (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
                {tab === "EMPRESTIMO"
                  ? "Quer simular um empréstimo?"
                  : tab === "CARTAO_CONSIGNADO"
                    ? "Quer simular um cartão de crédito consignado?"
                    : "Quer ativar este produto?"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Você tem <b style={{ color: "var(--emerald-500)" }}>{fmtBRL(dados.disponivel)}</b> disponível nesta modalidade. {tab === "CARTAO_BENEFICIOS" ? "Veja as ofertas dos bancos parceiros." : "As ofertas dos bancos parceiros aparecem abaixo do simulador."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => nav(tab === "CARTAO_BENEFICIOS" ? "/servidor/marketplace" : "/servidor/simular")}
              style={{
                padding: "10px 18px", borderRadius: 10, border: "none",
                background: "var(--emerald-500)", color: "white", fontWeight: 700, cursor: "pointer",
              }}
            >
              {tab === "CARTAO_BENEFICIOS" ? "Ver ofertas →" : "Simular →"}
            </button>
          </div>
        </Card>
      ) : null}

      {/* Aviso importante */}
      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "color-mix(in srgb, var(--gold-500) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--gold-500) 30%, transparent)",
        fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5,
      }}>
        <b style={{ color: "var(--text)" }}>ℹ️ Margens independentes:</b> cada produto tem seu próprio limite. Você não pode usar sobras de empréstimo em cartão nem vice-versa.
      </div>
    </div>
  );
}

function ModalidadeTab({
  ativa, onClick, icone, nome, disponivel,
}: {
  ativa: boolean; onClick: () => void; icone: string; nome: string; disponivel: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "12px 16px",
        borderRadius: 12,
        border: `1px solid ${ativa ? "var(--emerald-500)" : "var(--border)"}`,
        background: ativa ? "color-mix(in srgb, var(--emerald-500) 10%, transparent)" : "var(--surface)",
        color: ativa ? "var(--emerald-500)" : "var(--text-muted)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flex: "1 1 220px",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icone}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ativa ? "var(--emerald-500)" : "var(--text)" }}>{nome}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          disponível: <b style={{ color: "var(--emerald-500)" }}>{fmtBRL(disponivel)}</b>
        </div>
      </div>
    </button>
  );
}

function BigStat({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "#7A8CA8", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: bold ? 800 : 700, color, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
