import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Pill } from "@atlas/ui/web";
import {
  ContratoElegivelMock as ContratoElegivel,
  MatriculaInfo,
  readActiveMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";
import { atlas } from "../../lib/sdk";

// Bancos que aceitariam portabilidade (mock — em prod viria de
// atlas.servidor.ofertas() filtrado por convenio + produto portabilidade).
const BANCOS_DESTINO = [
  { nome: "SCred Financeira", taxaAm: 1.65 },
  { nome: "Banco Atlas",      taxaAm: 1.72 },
  { nome: "BMG Consignado",   taxaAm: 1.78 },
  { nome: "Daycoval",         taxaAm: 1.82 },
] as const;

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
  // Se veio "?banco=Nome" (vindo de uma oferta de portabilidade), pre-seleciona
  // esse banco na lista de destinos. Caso contrario, default = melhor taxa.
  const bancoPreselect = useMemo(() => {
    if (!bancoFiltro) return 0;
    const idx = BANCOS_DESTINO.findIndex((b) => b.nome.toLowerCase() === bancoFiltro.toLowerCase());
    return idx >= 0 ? idx : 0;
  }, [bancoFiltro]);
  const [bancoIdx, setBancoIdx] = useState(bancoPreselect);
  const BANCO_DESTINO = BANCOS_DESTINO[bancoIdx]!;

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

  // Estimativa de nova parcela com taxa do banco destino (calculo muito simplificado para mockup).
  const novoPrazo = 48;
  const novaParcela = totalSaldo > 0
    ? totalSaldo * (BANCO_DESTINO.taxaAm / 100) / (1 - Math.pow(1 + BANCO_DESTINO.taxaAm / 100, -novoPrazo))
    : 0;
  const economia = totalParcelaAtual - novaParcela;

  function consolidar() {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <MarketplaceBlock />
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

      <header>
        <span className="eyebrow">
          {modoRefin ? "Refinanciamento" : "Portabilidade / Compra de divida"}
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>
          {modoRefin ? `Refinanciar contrato com ${BANCO_DESTINO.nome}` : "Consolidar seus contratos"}
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
          {modoRefin ? (
            <>
              Selecione o contrato que voce quer renegociar com o <b>{BANCO_DESTINO.nome}</b>. O saldo devedor
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
              {BANCOS_DESTINO.map((b, i) => (
                <option key={b.nome} value={i}>
                  {b.nome} — {b.taxaAm.toFixed(2)}% a.m.
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 12, fontSize: ".82rem", color: "var(--text-muted)" }}>
            Taxa proposta pelo <b style={{ color: "var(--text)" }}>{BANCO_DESTINO.nome}</b>:{" "}
            <b style={{ color: "var(--emerald-500)" }}>{BANCO_DESTINO.taxaAm.toFixed(2)}% a.m.</b>
          </div>
        </Card>
      ) : null}

      {ELEGIVEIS.length === 0 ? (
        <Card>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            {modoRefin
              ? `Voce nao tem contrato ativo com ${BANCO_DESTINO.nome} pra refinanciar. Veja outras ofertas no MarketPlace.`
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
            Estimativa em {novoPrazo} parcelas com a taxa do {BANCO_DESTINO.nome}. O valor final pode variar apos a
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
          <Button onClick={consolidar}>
            {modoRefin ? "Refinanciar e ir para o termo →" : "Consolidar e ir para o termo →"}
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


// Marketplace de portabilidade: publica intencao a partir de um contrato
// ativo (dados vem da averbadora automaticamente). Depois bancos ofertam.
function MarketplaceBlock() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["servidor", "portabilidade"], queryFn: () => atlas.portabilidade.minhas(), refetchInterval: 15000 });
  const [info] = useState<MatriculaInfo | null>(() => readActiveMatricula());
  const publicar = useMutation({
    mutationFn: (adf: string) => atlas.portabilidade.publicar(adf),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servidor", "portabilidade"] }),
  });
  const cancelar = useMutation({
    mutationFn: (id: string) => atlas.portabilidade.cancelar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servidor", "portabilidade"] }),
  });
  const aceitar = useMutation({
    mutationFn: (v: { id: string; ofertaId: string }) => atlas.portabilidade.aceitar(v.id, v.ofertaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["servidor", "portabilidade"] }),
  });
  const intencoes = q.data?.intencoes ?? [];
  const elegiveis = info?.elegiveisPortabilidade ?? [];
  const jaPublicados = new Set(intencoes.filter((i) => i.status === "aberta").map((i) => i.contratoAdfOrigem));
  return (
    <Card style={{ borderColor: "var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 6%, var(--surface))" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, color: "var(--gold-500)", textTransform: "uppercase", marginBottom: 8 }}>
        Marketplace: deixe os bancos disputarem sua divida
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
        Publique um contrato ativo aqui e bancos concorrentes ofertam propostas de portabilidade. Voce escolhe a melhor.
      </p>
      {elegiveis.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Voce nao tem contratos elegiveis agora.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {elegiveis.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--bg-elev)", borderRadius: 8, gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13 }}>
                <b>{c.banco}</b> · ADF {c.id} · {fmtBRL(c.saldoDevedor)} saldo · {fmtBRL(c.parcela)} × {c.parcelasRestantes}x
              </div>
              {jaPublicados.has(c.id) ? (
                <Pill variant="aceita">publicado</Pill>
              ) : (
                <Button size="sm" onClick={() => publicar.mutate(c.id)} disabled={publicar.isPending}>Publicar</Button>
              )}
            </div>
          ))}
        </div>
      )}
      {intencoes.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Minhas intencoes publicadas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {intencoes.map((i) => (
              <div key={i.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 13 }}><b>{i.bancoOrigemNome}</b> · ADF {i.contratoAdfOrigem} · {fmtBRL(i.saldoDevedor)}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Pill variant={i.status === "aceita" ? "averbado" : i.status === "aberta" ? "aceita" : "expirado"}>{i.status}</Pill>
                    {i.status === "aberta" ? (
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Cancelar publicacao?")) cancelar.mutate(i.id); }}>Cancelar</Button>
                    ) : null}
                  </div>
                </div>
                {i.ofertas.length > 0 ? (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {i.ofertas.filter((o) => o.status === "ativa" || o.status === "aceita").map((o) => (
                      <div key={o.id} style={{ padding: 8, borderRadius: 6, background: o.status === "aceita" ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)" : "var(--bg-elev-2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12 }}>
                          <b>{o.bancoDestinoNome}</b> · {fmtBRL(o.novaParcela)} × {o.novoPrazo}x @ {(o.taxaAmProposta * 100).toFixed(2)}% a.m.
                          {o.economia > 0 ? <span style={{ color: "var(--emerald-500)", marginLeft: 6 }}>economia {fmtBRL(o.economia)}</span> : null}
                        </span>
                        {i.status === "aberta" && o.status === "ativa" ? (
                          <Button size="sm" onClick={() => aceitar.mutate({ id: i.id, ofertaId: o.id })}>Aceitar</Button>
                        ) : o.status === "aceita" ? (
                          <Pill variant="averbado">aceita</Pill>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>Aguardando ofertas dos bancos…</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}