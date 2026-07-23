import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Pill } from "@atlas/ui/web";
import {
  ContratoElegivelMock as ContratoElegivel,
  MatriculaInfo,
  readActiveMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";
import { atlas } from "../../lib/sdk";

// Bancos-destino de portabilidade vêm das OFERTAS REAIS cadastradas pelos
// bancos (via /banco/cadastros/tabela-emprestimos). Cliente pediu 22/07/2026:
// remover mocks (SCred Financeira/BMG/Daycoval) que não existiam de fato.
// Fallback vazio → botão "Solicitar" fica desabilitado até algum banco
// cadastrar tabela pra este convênio.

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function ServidorPortabilidade() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());
  // Modo refin: mesma tela, mas so lista contratos com o banco da oferta
  // (o "destino" e o proprio banco de origem) e a copy muda. Cliente que
  // caiu aqui via oferta "Refinanciamento" ganhou o CTA `?modo=refin&banco=X`.
  const modoRefin = sp.get("modo") === "refin";
  const bancoFiltro = sp.get("banco") ?? "";
  // Ofertas ativas do convenio da matricula ativa. Usa MENOR taxa como banco
  // preferido — mesma logica do simulador. Poll 3s pra refletir mudancas do
  // banco na hora.
  const ofertasQ = useQuery({
    queryKey: ["servidor", "ofertas", info?.matricula],
    queryFn: () => atlas.servidor.ofertas(info?.matricula),
    enabled: !!info?.matricula,
    refetchInterval: 3_000,
  });
  const BANCOS_DESTINO_REAIS = useMemo(() => {
    const of = ofertasQ.data?.ofertas ?? [];
    // Dedup por bancoNome (multiplas tabelas do mesmo banco viram uma so —
    // usa menor taxa como melhor oferta).
    const porBanco = new Map<string, number>();
    for (const o of of) {
      const t = o.taxaAm ?? 0;
      if (!(t > 0)) continue;
      const atual = porBanco.get(o.bancoNome);
      if (atual == null || t < atual) porBanco.set(o.bancoNome, t);
    }
    return Array.from(porBanco.entries())
      .map(([nome, taxaAm]) => ({ nome, taxaAm: taxaAm * 100 }))
      .sort((a, b) => a.taxaAm - b.taxaAm);
  }, [ofertasQ.data]);
  // Se veio "?banco=Nome" (vindo de uma oferta), pre-seleciona esse banco.
  // Se nao, default = melhor taxa (indice 0 apos sort ascendente).
  const bancoPreselect = useMemo(() => {
    if (!bancoFiltro) return 0;
    const idx = BANCOS_DESTINO_REAIS.findIndex((b) => b.nome.toLowerCase() === bancoFiltro.toLowerCase());
    return idx >= 0 ? idx : 0;
  }, [bancoFiltro, BANCOS_DESTINO_REAIS]);
  const [bancoIdx, setBancoIdx] = useState(bancoPreselect);
  useEffect(() => { setBancoIdx(bancoPreselect); }, [bancoPreselect]);
  const BANCO_DESTINO = BANCOS_DESTINO_REAIS[bancoIdx] ?? null;

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
        setSelecionados(new Set());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Refin: so contratos do proprio banco da oferta. Portabilidade: todos.
  // Comparacao case-insensitive porque o nome do banco vem do backend com
  // capitalizacao variada ("SCred Financeira" vs "Scred Financeira").
  const ELEGIVEIS: ContratoElegivel[] = useMemo(() => {
    const todos = info?.elegiveisPortabilidade ?? [];
    if (!modoRefin || !bancoFiltro) return todos;
    return todos.filter((c) => c.banco.toLowerCase() === bancoFiltro.toLowerCase());
  }, [info, modoRefin, bancoFiltro]);

  function toggle(id: string) {
    setSelecionados((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  }

  const totalSaldo = ELEGIVEIS
    .filter((c) => selecionados.has(c.id))
    .reduce((a, c) => a + c.saldoDevedor, 0);
  const totalParcelaAtual = ELEGIVEIS
    .filter((c) => selecionados.has(c.id))
    .reduce((a, c) => a + c.parcela, 0);

  // Estimativa de nova parcela com taxa do banco destino (mockup). Se nao ha
  // banco destino cadastrado, novaParcela=0 e economia=0 — botao Consolidar
  // fica desabilitado por !BANCO_DESTINO.
  const novoPrazo = 48;
  const taxaMes = BANCO_DESTINO ? BANCO_DESTINO.taxaAm / 100 : 0;
  const novaParcela = BANCO_DESTINO && totalSaldo > 0
    ? totalSaldo * taxaMes / (1 - Math.pow(1 + taxaMes, -novoPrazo))
    : 0;
  const economia = totalParcelaAtual - novaParcela;

  function consolidar() {
    if (!BANCO_DESTINO) return;
    const params = new URLSearchParams({
      // termo.tsx aceita "refinanciamento" (nao "refin"); enviar a chave errada
      // faz cair no default "novo" e o backend criar como EMPRESTIMO.
      tipo: modoRefin ? "refinanciamento" : "portabilidade",
      banco: BANCO_DESTINO.nome,
      valor: String(Math.round(totalSaldo)),
      parcelas: String(novoPrazo),
      parcela: novaParcela.toFixed(2),
      taxaAm: BANCO_DESTINO.taxaAm.toFixed(2),
    });
    nav(`/servidor/termo?${params.toString()}`);
  }

  // Bloqueio: se ja ha proposta em analise (emprestimo/portabilidade/refin/
  // telemedicina), o servidor NAO pode iniciar outra — a margem ja esta
  // travada. O backend rejeita com 422 proposta_em_andamento; aqui na UI
  // e' pra o servidor ver antes de perder tempo selecionando contratos.
  // refetchInterval de 10s pra desbloquear rapido quando o banco decide.
  const propostasQ = useQuery({
    queryKey: ["servidor", "propostas", info?.matricula ?? "all"],
    queryFn: () => atlas.servidor.propostas(info?.matricula),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
  const propostaBloqueadora = (propostasQ.data?.propostas ?? []).find((p) => {
    // Whitelist EXPLICITA (mesma logica do backend em POST /me/propostas):
    // proposta esta "em analise" se aguard/aprov/formaliz/em analise. Ativo
    // ou Averbado significa que ja passou pra contrato — nao bloqueia mais.
    // Nao dava pra usar blacklist (t.includes("averb")) porque "aguardando
    // averbacao" tambem contem "averb".
    const t = p.situacao.toLowerCase();
    return t.includes("aguard") || t.startsWith("aprov") || t.includes("formaliz") || t.includes("em analise") || t.includes("em análise");
  });

  const voltarBtn = (
    <button
      type="button"
      onClick={() => nav("/servidor/marketplace/portabilidade")}
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
      ← Voltar ao MarketPlace
    </button>
  );

  // Estado bloqueado: proposta em analise ocupa margem. Servidor precisa
  // aguardar decisao (banco aprovar/recusar) OU cancelar em /servidor/contratos
  // antes de solicitar outra.
  if (propostaBloqueadora) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {voltarBtn}
        <Card style={{ borderColor: "var(--gold-500)", padding: 28, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "color-mix(in srgb, var(--gold-500) 20%, transparent)",
            color: "var(--gold-500)", display: "grid", placeItems: "center",
            fontSize: 26, margin: "0 auto 12px",
          }}>
            🔒
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: "1.35rem" }}>Você tem uma proposta em andamento</h2>
          <p style={{ color: "var(--text-muted)", margin: "0 auto", maxWidth: 520, lineHeight: 1.5 }}>
            A proposta <b style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>{propostaBloqueadora.id}</b> ({propostaBloqueadora.banco}) está aguardando decisão do banco e ocupa sua margem consignável.
            Aguarde a resposta ou cancele antes de solicitar uma nova portabilidade.
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Button onClick={() => nav("/servidor/contratos")}>Acompanhar proposta →</Button>
            <Button variant="ghost" onClick={() => nav("/servidor/dashboard")}>Voltar ao início</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {voltarBtn}

      <header>
        <span className="eyebrow">
          {modoRefin ? "Refinanciamento" : "Portabilidade / Compra de divida"}
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>
          {modoRefin ? `Refinanciar contrato com ${BANCO_DESTINO?.nome ?? "banco destino"}` : "Consolidar seus contratos"}
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          {modoRefin ? (
            <>
              Selecione o contrato que voce quer renegociar com o <b>{BANCO_DESTINO?.nome ?? "banco destino"}</b>. O saldo devedor
              vira um novo contrato com prazo estendido — a diferenca de parcela vira troco liberado na sua conta.
            </>
          ) : (
            <>
              Selecione os contratos que voce quer mover e escolha a instituição de destino. A trava de margem para
              portabilidade dura <b>7 dias uteis</b>.
            </>
          )}
        </p>
      </header>

      {/* No modo refin o banco esta travado: origem = destino. Nao mostra o select. */}
      {!modoRefin ? (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Instituição de destino
              </div>
              <div style={{ marginTop: 4, fontSize: ".92rem", color: "var(--text-muted)" }}>
                Escolha o banco que vai receber os contratos.
              </div>
            </div>
            <select
              value={bancoIdx}
              onChange={(e) => setBancoIdx(Number(e.target.value))}
              disabled={BANCOS_DESTINO_REAIS.length === 0}
              style={{
                minWidth: 240,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-elev-2)",
                border: "1px solid var(--border-strong)",
                color: "var(--text)",
                fontSize: ".92rem",
                cursor: "pointer",
              }}
            >
              {BANCOS_DESTINO_REAIS.length === 0 ? (
                <option value={0}>Nenhum banco com oferta ativa neste convênio</option>
              ) : (
                BANCOS_DESTINO_REAIS.map((b, i) => (
                  <option key={b.nome} value={i}>
                    {b.nome} — {b.taxaAm.toFixed(2)}% a.m.
                  </option>
                ))
              )}
            </select>
          </div>
          {BANCO_DESTINO ? (
            <div style={{ marginTop: 12, fontSize: ".82rem", color: "var(--text-muted)" }}>
              Taxa proposta pelo <b style={{ color: "var(--text)" }}>{BANCO_DESTINO.nome}</b>:{" "}
              <b style={{ color: "var(--emerald-500)" }}>{BANCO_DESTINO.taxaAm.toFixed(2)}% a.m.</b>
            </div>
          ) : (
            <div style={{ marginTop: 12, fontSize: ".82rem", color: "var(--text-muted)" }}>
              Nenhum banco com oferta ativa neste convênio ainda.
            </div>
          )}
        </Card>
      ) : null}

      {ELEGIVEIS.length === 0 ? (
        <Card>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            {modoRefin
              ? `Voce nao tem contrato ativo com ${BANCO_DESTINO?.nome ?? "este banco"} pra refinanciar. Veja outras ofertas no MarketPlace.`
              : "Voce nao tem contratos elegiveis para portabilidade no momento."}
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {ELEGIVEIS.map((c) => {
            const checked = selecionados.has(c.id);
            return (
              <Card
                key={c.id}
                style={{
                  borderColor: checked ? "var(--gold-500)" : undefined,
                  cursor: "pointer",
                }}
              >
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    style={{ marginTop: 4 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{c.banco}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {c.id} · {c.tipoContrato}
                        </div>
                      </div>
                      <Pill variant="pendente">Elegivel</Pill>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 14, fontSize: 13 }}>
                      <KV label="Saldo devedor" v={fmtBRL(c.saldoDevedor)} accent />
                      <KV label="Parcela atual" v={fmtBRL(c.parcela)} />
                      <KV label="Restantes" v={`${c.parcelasRestantes}/${c.totalParcelas}`} />
                      <KV label="Taxa atual" v={`${c.taxaAm.toFixed(2)}% a.m.`} />
                    </div>
                  </div>
                </label>
              </Card>
            );
          })}
        </div>
      )}

      {selecionados.size > 0 ? (
        <Card style={{ position: "sticky", bottom: 16, borderColor: "var(--gold-500)" }}>
          <h3 style={{ marginTop: 0 }}>
            {modoRefin
              ? `Simulacao de refinanciamento (${selecionados.size} contrato(s))`
              : `Simulacao de portabilidade (${selecionados.size} contrato(s))`}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginTop: 8 }}>
            <KV label={modoRefin ? "Saldo devedor" : "Saldo a quitar"} v={fmtBRL(totalSaldo)} />
            <KV label="Parcela atual (soma)" v={fmtBRL(totalParcelaAtual)} />
            <KV label="Nova parcela" v={fmtBRL(novaParcela)} accent />
            {economia > 0 ? (
              <KV label="Economia / parcela" v={`- ${fmtBRL(economia)}`} accent />
            ) : (
              <KV label="Diferença" v={`+ ${fmtBRL(Math.abs(economia))}`} muted />
            )}
          </div>
          <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 12, marginBottom: 16 }}>
            Estimativa em {novoPrazo} parcelas com a taxa do {BANCO_DESTINO?.nome ?? "banco destino"}. O valor final pode variar apos a
            analise do banco.
            {economia <= 0 ? (
              <>
                {" "}
                <b>Atencao:</b> nesta simulacao a parcela nova ficou maior que a soma das atuais. {modoRefin
                  ? "O refinanciamento pode ainda valer a pena se o objetivo for alongar prazo ou liberar troco."
                  : "A portabilidade pode ainda valer a pena se o objetivo for alongar prazo ou consolidar contratos."}
              </>
            ) : null}
          </p>
          <Button onClick={consolidar} disabled={!BANCO_DESTINO}>
            {!BANCO_DESTINO
              ? "Aguardando banco destino cadastrar oferta"
              : modoRefin ? "Refinanciar e ir para o termo →" : "Consolidar e ir para o termo →"}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

function KV({ label, v, accent, muted }: { label: string; v: string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          color: accent ? "var(--emerald-500)" : muted ? "var(--text-muted)" : "var(--text)",
          fontWeight: accent ? 700 : 500,
        }}
      >
        {v}
      </div>
    </div>
  );
}

