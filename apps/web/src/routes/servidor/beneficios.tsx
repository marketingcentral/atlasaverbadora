import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@atlas/ui/web";
import { useMutation, useQuery } from "@tanstack/react-query";
import { atlas } from "../../lib/sdk";
import type { ServidorBeneficio } from "@atlas/sdk";
import type { MatriculaInfo } from "../../lib/matricula-data";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// Cliente pediu (14/07/2026): aba Beneficios com mais categorias — academia,
// farmacia, super mercado, alem das existentes. Todas sao beneficios do Atlas
// (parceiros negociados), nao cartao beneficio.
type Categoria = "todos" | "alimentacao" | "farmacia" | "supermercado" | "academia" | "saude" | "educacao" | "lazer";

// Palavras-chave por categoria pra inferencia por nome. Quando o admin cadastra
// "Farmacia Sao Joao" tageado so como "saude", ele ainda aparece na aba Farmacia
// (o servidor esperava isso — nome fala por si). Case/acento-insensivel.
const KEYWORDS_POR_CATEGORIA: Partial<Record<Categoria, string[]>> = {
  farmacia: ["farmacia", "drogaria"],
  supermercado: ["supermercado", "mercado", "mercearia", "atacadao", "atacado"],
  academia: ["academia", "crossfit", "studio", "pilates"],
  saude: ["clinica", "hospital", "consultorio", "medic", "odonto", "dentist", "otica", "laboratorio"],
  alimentacao: ["restaurante", "lanchonete", "padaria", "cafeteria", "pizzaria", "hamburgueria"],
  educacao: ["escola", "colegio", "curso", "faculdade", "idiomas"],
  lazer: ["cinema", "parque", "clube"],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function matchesCategoriaPorNome(nome: string, tab: Categoria): boolean {
  const kws = KEYWORDS_POR_CATEGORIA[tab];
  if (!kws) return false;
  const n = normalize(nome);
  return kws.some((k) => n.includes(k));
}

const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "farmacia", label: "Farmácia" },
  { id: "supermercado", label: "Supermercado" },
  { id: "academia", label: "Academia" },
  { id: "saude", label: "Saúde" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "educacao", label: "Educação" },
  { id: "lazer", label: "Lazer" },
];

export function ServidorBeneficios() {
  const nav = useNavigate();
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());
  const [tab, setTab] = useState<Categoria>("todos");

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Descontos comerciais (nao-saude) cadastrados pela averbadora para a prefeitura.
  // Passa a matricula ATIVA pra respeitar o switcher (Adriana em Palhoca vs Floripa
  // ve beneficios diferentes).
  const beneficiosQ = useQuery({
    queryKey: ["servidor", "beneficios", "todos", info?.matricula],
    queryFn: () => atlas.servidor.getMyBeneficios(undefined, info?.matricula),
    refetchOnWindowFocus: true,
    enabled: !!info?.matricula,
  });
  // Todos os beneficios exceto telemedicina puro (esse aparece em banner separado
  // no topo da tela). Um beneficio com telemedicina + outra categoria aparece nos dois.
  const parceiros = useMemo(
    () => (beneficiosQ.data?.beneficios ?? []).filter((p) =>
      p.categorias.some((c) => c !== "telemedicina"),
    ),
    [beneficiosQ.data],
  );
  const filtrados = useMemo(() => {
    if (tab === "todos") return parceiros;
    return parceiros.filter((p) => p.categorias.includes(tab) || matchesCategoriaPorNome(p.nome, tab));
  }, [parceiros, tab]);

  if (!info) return null;

  const margemCartaoConsig = info.margem.margens_por_tipo.find((m) => m.tipo === "CARTAO_CONSIGNADO");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1080, width: "100%", margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => nav("/servidor/dashboard")}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-muted)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        ← Voltar ao início
      </button>

      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Portal do servidor
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", letterSpacing: "-0.02em" }}>Descontos e Benefícios</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 640 }}>
            Descontos em estabelecimentos comerciais da sua cidade, negociados pela averbadora.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIAS.map((c) => (
            <CategoriaTab key={c.id} active={tab === c.id} onClick={() => setTab(c.id)} label={c.label} />
          ))}
        </div>
      </header>

      <TelemedicinaCard matricula={info?.matricula} />

      {/* Parceiros comerciais */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Comércio local parceiro
        </span>
        {filtrados.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14, border: "1px dashed var(--border)", borderRadius: 12 }}>
            {beneficiosQ.data?.beneficios.some((b) => b.categorias.includes("saude")) && !parceiros.length ? (
              <>Você tem parceiros de <b>Saúde</b> ({beneficiosQ.data.beneficios.filter((b) => b.categorias.includes("saude")).length}) — clique na aba <b>Saúde</b> acima para ver.<br />Nenhum outro parceiro comercial disponível para <b>{info.prefeitura}</b> por enquanto.</>
            ) : (
              <>Nenhum parceiro nesta categoria em <b>{info.prefeitura}</b> — em breve mais opções.</>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtrados.map((p) => <ParceiroCard key={p.id} parceiro={p} />)}
          </div>
        )}
      </section>

      {/* Cartão Consignado — margem usada nesses estabelecimentos */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Cartão Consignado
        </span>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26 }}>💳</span>
            <div>
              <div style={{ fontWeight: 700 }}>Limite recorrente para compras</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Use nos parceiros acima — fatura descontada em folha.
              </div>
            </div>
          </div>
          <CartaoResumo margem={margemCartaoConsig ?? { total: 0, disponivel: 0 }} />
        </Card>
      </section>

      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "color-mix(in srgb, var(--accent) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5,
      }}>
        <b style={{ color: "var(--text)" }}>ℹ️ Sobre esses benefícios:</b> descontos comerciais são negociados pela <b>Atlas</b> junto ao comércio local da sua cidade. Benefícios de saúde (telemedicina, farmácia, ótica) estão nas abas <b>Saúde</b> e <b>Telemedicina</b> acima.
      </div>
    </div>
  );
}

function CategoriaTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 10,
        border: `1px solid ${active ? "var(--emerald-500)" : "var(--border)"}`,
        background: active ? "color-mix(in srgb, var(--emerald-500) 10%, transparent)" : "transparent",
        color: active ? "var(--emerald-500)" : "var(--text-muted)",
        fontSize: 13, fontWeight: 700, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ParceiroCard({ parceiro }: { parceiro: ServidorBeneficio }) {
  const catLabel = parceiro.categorias
    .map((c) => CATEGORIAS.find((x) => x.id === (c as Categoria))?.label)
    .filter(Boolean)
    .join(" · ");
  const modo = parceiro.modoImagens ?? "nenhum";
  const imagens = parceiro.imagens ?? [];
  const temImagens = modo !== "nenhum" && imagens.length > 0;

  return (
    <article style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Imagens (unica ou carrossel) — quando o admin configurou. */}
      {temImagens ? (
        <BeneficioImagens imagens={imagens} modo={modo} />
      ) : null}

      <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `color-mix(in srgb, ${parceiro.cor} 15%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0, overflow: "hidden",
        }}>
          {parceiro.icone.startsWith("http")
            ? <img src={parceiro.icone} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : parceiro.icone}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{parceiro.nome}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {catLabel} · {parceiro.local}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
            <b style={{ color: "var(--emerald-500)", fontSize: 14 }}>{parceiro.descontoLabel}</b> {parceiro.descontoComplemento}
          </div>
          {parceiro.linkAcesso?.url ? (
            <a
              href={parceiro.linkAcesso.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Best-effort: registra o interesse mas nao bloqueia a navegacao.
                void atlas.servidor.registrarCliqueBeneficio(parceiro.id, {
                  matricula: readActiveMatricula()?.matricula,
                  origemTela: "beneficios",
                }).catch(() => undefined);
              }}
              style={{
                display: "inline-block", marginTop: 12,
                padding: "8px 16px", borderRadius: 8,
                background: parceiro.cor, color: "white",
                fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}
            >
              {parceiro.linkAcesso.textoBotao || "Acessar"} →
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Carrossel simples (sem lib externa): 1 imagem visivel, botoes prev/next
 *  quando ha mais que 1 e o modo e carrossel. Modo "unica" sempre mostra a [0].
 *  Fallback onError esconde imagens quebradas. */
function BeneficioImagens({ imagens, modo }: { imagens: string[]; modo: "unica" | "carrossel" }) {
  const [idx, setIdx] = useState(0);
  const total = imagens.length;
  const atual = modo === "carrossel" ? imagens[Math.min(idx, total - 1)] : imagens[0];
  if (!atual) return null;

  return (
    <div style={{ position: "relative", aspectRatio: "16 / 9", background: "var(--bg-elev-2)" }}>
      <img
        src={atual}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      {modo === "carrossel" && total > 1 ? (
        <>
          <button
            type="button"
            onClick={() => setIdx((i) => (i - 1 + total) % total)}
            aria-label="Anterior"
            style={carrosselBtnStyle("left")}
          >‹</button>
          <button
            type="button"
            onClick={() => setIdx((i) => (i + 1) % total)}
            aria-label="Próximo"
            style={carrosselBtnStyle("right")}
          >›</button>
          <div style={{
            position: "absolute", bottom: 8, left: 0, right: 0,
            display: "flex", justifyContent: "center", gap: 6,
          }}>
            {imagens.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Ir para imagem ${i + 1}`}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  border: 0, cursor: "pointer",
                  background: i === Math.min(idx, total - 1) ? "white" : "rgba(255,255,255,.5)",
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function carrosselBtnStyle(lado: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", top: "50%", [lado]: 8, transform: "translateY(-50%)",
    width: 32, height: 32, borderRadius: "50%",
    background: "rgba(0,0,0,.55)", color: "white", border: 0,
    cursor: "pointer", fontSize: 20, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}

function CartaoResumo({ margem }: { margem: { total: number; disponivel: number } }) {
  const utilizado = Math.max(0, margem.total - margem.disponivel);
  const pct = margem.total > 0 ? Math.min(100, Math.round((utilizado / margem.total) * 100)) : 0;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
        <Stat label="Total" value={fmtBRL(margem.total)} />
        <Stat label="Utilizado" value={fmtBRL(utilizado)} muted />
        <Stat label="Disponível" value={fmtBRL(margem.disponivel)} accent />
      </div>
      <div style={{ marginTop: 12, height: 6, background: "var(--bg-elev-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: pct > 80 ? "var(--danger-500)" : pct > 60 ? "var(--gold-500)" : "var(--emerald-500)",
        }} />
      </div>
    </>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 700, color: accent ? "var(--emerald-500)" : muted ? "var(--text-muted)" : "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

/** Card de Telemedicina — sempre visivel em /servidor/beneficios (independe
 *  de admin ter cadastrado um beneficio de telemedicina). 3 estados:
 *   - Plano Ativo: barra de progresso + "faltam X meses" (como card contrato)
 *   - Cotacao pendente: "Aguardando contato da equipe"
 *   - Sem cotacao: botao Solicitar Cotacao (abre modal do termo aqui mesmo —
 *     antes redirecionava pra /servidor/saude que mostrava o mesmo card
 *     duplicado). */
function TelemedicinaCard({ matricula }: { matricula?: string }) {
  const [showCotar, setShowCotar] = useState(false);
  const q = useQuery({
    queryKey: ["servidor", "telemedicina", "minhas-cotacoes"],
    queryFn: () => atlas.servidor.minhasCotacoesTelemedicina(),
    refetchOnWindowFocus: true,
  });
  // Propostas do servidor — pra bloquear cotacao quando ha emprestimo ocupando
  // a margem consignavel (telemedicina desconta da MESMA margem, entao pedir
  // as duas em paralelo geraria duplo comprometimento). O backend tambem
  // bloqueia (422 emprestimo_em_andamento) — aqui e' pra o UX ja mostrar
  // sem precisar clicar e receber erro.
  const propostasQ = useQuery({
    queryKey: ["servidor", "propostas", matricula ?? "all"],
    queryFn: () => atlas.servidor.propostas(matricula),
    refetchOnWindowFocus: true,
  });
  const emprestimoAtivo = (propostasQ.data?.propostas ?? []).some((p) => {
    const t = p.situacao.toLowerCase();
    // Situacoes que NAO consomem margem: recusada, cancelada, expirada, quitada.
    // Tambem ignora a propria reserva da telemedicina (obs contem "telemedicina")
    // pra o card nao se auto-bloquear.
    if (t.includes("cancel") || t.includes("recus") || t.includes("expir") || t.includes("quitad")) return false;
    if (/telemedicina/i.test(p.observacoes ?? "")) return false;
    return true;
  });
  const cotacoes = q.data?.cotacoes ?? [];
  const pendente = cotacoes.some((c) => c.situacao === "nova" || c.situacao === "contatado");
  const ativo = cotacoes.find((c) => c.situacao === "fechado");
  const plano = ativo?.ativadoEm ? (() => {
    const ini = new Date(ativo.ativadoEm as string).getTime();
    const fim = ini + 12 * 30 * 24 * 3600 * 1000;
    const agora = Date.now();
    return {
      pct: Math.max(0, Math.min(1, (agora - ini) / (fim - ini))),
      restante: Math.max(0, Math.ceil((fim - agora) / (30 * 24 * 3600 * 1000))),
    };
  })() : null;

  const cotacao = useMutation({
    mutationFn: () => atlas.servidor.solicitarCotacaoTelemedicina({ matricula }),
    onSuccess: () => { setShowCotar(false); q.refetch(); },
  });
  // Termo oficial (averbadora) — mesma fonte do fluxo antigo em /saude.
  const termoQ = useQuery({
    queryKey: ["servidor", "termo", "telemedicina"],
    queryFn: () => atlas.servidor.getTermo("telemedicina", { meses: 12, valor: "R$ 50,00", banco: "Banco Atlas" }),
    enabled: showCotar,
  });

  return (
    <>
      <article style={{
        background: "linear-gradient(120deg, var(--emerald-600, #059669), var(--emerald-500))",
        borderRadius: 16, padding: 22,
        display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
        color: "white", boxShadow: "0 4px 14px rgba(16,185,129,.25)",
      }}>
        <div style={{
          width: 62, height: 62, borderRadius: 14,
          background: "rgba(255,255,255,.16)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, flexShrink: 0,
        }}>🩺</div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", opacity: 0.85, textTransform: "uppercase" }}>
            Benefício exclusivo · Servidor
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, marginTop: 2 }}>Telemedicina Gratuita</div>
          <div style={{ fontSize: 13, opacity: 0.92, marginTop: 4 }}>
            Consultas online 24h · Clínico Geral, Pediatria, Psicologia, Nutrição
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            background: "rgba(255,255,255,.2)", color: "white",
            border: "1px solid rgba(255,255,255,.3)",
          }}>
            Plano mínimo de 12 meses
          </span>
          {plano ? (
            <div style={{ background: "rgba(255,255,255,.18)", borderRadius: 10, padding: 14, minWidth: 240 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}>
                <span>✓ Plano Ativo</span>
                <span>faltam {plano.restante} {plano.restante === 1 ? "mês" : "meses"}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.25)", overflow: "hidden", marginTop: 8 }}>
                <div style={{ width: `${plano.pct * 100}%`, height: "100%", background: "white" }} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>
                Plano de 12 meses · {Math.round(plano.pct * 100)}% concluído
              </div>
            </div>
          ) : pendente ? (
            <span style={{
              padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "rgba(255,255,255,.18)", color: "white", textAlign: "center", maxWidth: 280,
            }}>
              Cotação em análise. Em breve, a equipe da Atlas entrará em contato.
            </span>
          ) : emprestimoAtivo ? (
            // Bloqueio: telemedicina usa a mesma margem consignavel do
            // emprestimo. Enquanto ha uma proposta/contrato ativo, o botao
            // fica travado com o motivo explicito (evita clique + erro 422).
            <span style={{
              padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "rgba(255,255,255,.18)", color: "white", textAlign: "center", maxWidth: 280,
            }}>
              🔒 Empréstimo em andamento ocupa sua margem. Aguarde a conclusão para solicitar Telemedicina.
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowCotar(true)}
              style={{
                padding: "10px 18px", borderRadius: 10,
                background: "white", color: "var(--emerald-600, #059669)",
                fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              Solicitar Cotação
            </button>
          )}
        </div>
      </article>

      {showCotar && (
        <div
          onClick={() => !cotacao.isPending && setShowCotar(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 24, maxWidth: 460, width: "100%" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.25rem" }}>
              {termoQ.data?.termo.titulo ?? "Telemedicina — Solicitar Cotação"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {termoQ.data?.termo.corpo
                ?? "Consultas online 24h com médicos parceiros. Plano com compromisso mínimo de 12 meses. Ao solicitar a cotação, o time da Atlas recebe seus dados de contato e entra em contato com você para formalizar a solicitação."}
            </p>
            {cotacao.isError && (
              <p style={{ color: "var(--danger, #dc2626)", fontSize: 13 }}>Não foi possível enviar. Tente novamente.</p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowCotar(false)}
                disabled={cotacao.isPending}
                style={{ padding: "10px 16px", borderRadius: 10, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-strong)", fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => cotacao.mutate()}
                disabled={cotacao.isPending}
                style={{ padding: "10px 18px", borderRadius: 10, background: "var(--emerald-500)", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}
              >
                {cotacao.isPending ? "Enviando…" : "Solicitar Cotação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
