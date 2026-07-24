import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button, Card } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import { readActiveMatricula, STORAGE_KEY_META, STORAGE_KEY_ID } from "../../lib/matricula-data";
import { ImpersonateReadOnlyNotice, useIsImpersonating } from "../../components/ImpersonateBar";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/** Solicitacao de cartao (consignado ou beneficio) — fatia C do plano de ofertas.
 *  Recebe via query string:
 *    ?produto=cartao_consignado|cartao_beneficio (obrigatorio)
 *    &banco=NomeDoBanco  &limite=50000  &oferta=OFT-B1-3
 *  Mostra o produto, a margem cartao correspondente, o limite proposto e um
 *  botao que faz POST /me/cartoes. Nao cria contrato tradicional (o backend
 *  registra a solicitacao pra o banco emissor processar via canal proprio). */
export function ServidorSolicitarCartao() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const impersonando = useIsImpersonating();
  // Listener de storage: sem isso, trocar matricula no switcher enquanto
  // esta tela esta aberta continuava mostrando margem/limite da matricula
  // anterior e o POST subia matricula errada.
  const [info, setInfo] = useState(() => readActiveMatricula());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ?produto=cartao_consignado|cartao_beneficio — ambos sao produtos validos
  // do app do servidor. A margem/limite lidos abaixo mudam conforme o produto.
  const produtoParam = sp.get("produto");
  const produto: "cartao_consignado" | "cartao_beneficio" =
    produtoParam === "cartao_beneficio" ? "cartao_beneficio" : "cartao_consignado";
  const bancoNome = sp.get("banco") ?? "Banco";
  const limiteProposto = Math.max(500, Number(sp.get("limite") ?? "0") || 0);
  const ofertaId = sp.get("oferta") ?? undefined;

  const meta = produto === "cartao_consignado"
    ? {
        titulo: "Cartão consignado",
        icone: "💳",
        descricao: "Cartão de crédito com fatura mínima descontada em folha. Você usa como um cartão normal — a fatura mínima sai automaticamente do seu contracheque.",
        margemLabel: "Sua margem cartão consignado",
      }
    : {
        titulo: "Cartão benefício",
        icone: "🎫",
        descricao: "Cartão restrito a farmácia, mercado e saúde. Descontado em folha, com limite exclusivo desses estabelecimentos.",
        margemLabel: "Sua margem cartão benefício",
      };

  // Le a margem do tipo correspondente da matricula ativa (ja calculada no backend).
  const margemTipo = produto === "cartao_consignado" ? "CARTAO_CONSIGNADO" : "CARTAO_BENEFICIOS";
  const margem = info?.margem.margens_por_tipo.find((m) => m.tipo === margemTipo);
  const margemDisp = margem?.disponivel ?? 0;
  const semMargem = margemDisp <= 0;

  // Limite final: min entre o limite proposto pela oferta e um teto derivado da
  // margem (regra pragmatica: limite = 30x a margem mensal). Frontend so mostra —
  // backend valida a margem no POST /me/cartoes.
  const tetoPorMargem = Math.floor(margemDisp * 30);
  const limiteFinal = Math.min(limiteProposto, tetoPorMargem || limiteProposto);

  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const solicitar = useMutation({
    mutationFn: () => atlas.servidor.solicitarCartao({
      produto,
      bancoNome,
      limite: limiteFinal,
      matricula: info?.matricula,
      ofertaId,
    }),
    onSuccess: (res) => {
      setProtocolo(res.protocolo);
      setMensagemSucesso(res.mensagem);
    },
  });

  if (!info) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, width: "100%", margin: "0 auto" }}>
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
      >
        ← Voltar ao MarketPlace
      </button>

      <header>
        <span className="eyebrow">Solicitar cartão</span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.6rem" }}>{meta.icone}</span>
          <span>{meta.titulo} · {bancoNome}</span>
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6 }}>{meta.descricao}</p>
      </header>

      {/* Card 1: margem disponivel do tipo */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
              {meta.margemLabel}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: semMargem ? "var(--danger-500)" : "var(--emerald-500)", marginTop: 4 }}>
              {fmtBRL(margemDisp)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 320, textAlign: "right" }}>
            Margem mensal disponível na sua folha pra fatura mínima deste cartão. Fixada por regulação em 5% do salário líquido.
          </div>
        </div>
      </Card>

      {semMargem ? (
        <Card style={{ borderColor: "var(--danger-500)" }}>
          <h3 style={{ marginTop: 0, color: "var(--danger-500)" }}>Sem margem disponível</h3>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Sua margem de {meta.titulo.toLowerCase()} está zerada nesta matrícula. Não é possível solicitar o cartão agora.
            {" "}Volte a este espaço quando a margem for liberada (após quitar / suspender outro cartão do mesmo tipo).
          </p>
        </Card>
      ) : (
        <>
          {/* Card 2: limite proposto */}
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
              Limite proposto
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>
              {fmtBRL(limiteFinal)}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "12px 0 0" }}>
              Estimado a partir da oferta do <b>{bancoNome}</b> ({fmtBRL(limiteProposto)}) e da sua margem disponível.
              O <b>{bancoNome}</b> pode ajustar o limite após análise interna de crédito.
            </p>
          </Card>

          {/* Card 3: CTA */}
          {protocolo ? (
            <Card style={{ borderColor: "var(--emerald-500)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <h3 style={{ marginTop: 0 }}>Solicitação enviada</h3>
              <p style={{ color: "var(--text-muted)", margin: "0 0 12px" }}>{mensagemSucesso}</p>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
                Protocolo: <b style={{ color: "var(--text)" }}>{protocolo}</b>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <Button onClick={() => nav("/servidor/contratos")}>
                  Ir para Contratos
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <h3 style={{ marginTop: 0 }}>Confirmar solicitação</h3>
              <p style={{ color: "var(--text-muted)", margin: "0 0 12px" }}>
                Ao confirmar, o <b>{bancoNome}</b> recebe seu pedido e entra em contato pra emitir e ativar o cartão.
                A margem só é comprometida quando o banco confirma a averbação — nada é descontado agora.
              </p>
              {solicitar.error ? (
                <div style={{ color: "var(--danger-500)", fontSize: 13, marginBottom: 12 }}>
                  {solicitar.error instanceof Error ? solicitar.error.message : "Erro ao enviar solicitação."}
                </div>
              ) : null}
              <ImpersonateReadOnlyNotice acao={`Solicitar ${meta.titulo.toLowerCase()}`} />
              <div style={{ display: "flex", gap: 8 }}>
                <Button disabled={solicitar.isPending || impersonando} onClick={() => solicitar.mutate()}>
                  {solicitar.isPending ? "Enviando..." : impersonando ? "Ação indisponível em modo impersonate" : `Solicitar ${meta.titulo.toLowerCase()} →`}
                </Button>
                <Button variant="ghost" onClick={() => nav("/servidor/marketplace/portabilidade")}>
                  Cancelar
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
