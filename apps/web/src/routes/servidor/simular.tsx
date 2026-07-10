import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MatriculaInfo,
  readActiveMatricula,
  STORAGE_KEY_ID,
  STORAGE_KEY_META,
} from "../../lib/matricula-data";
import { SimuladorInline } from "./_simulador-inline";

// Number(...) | default — descarta NaN, Infinity e valores <= 0.
function num(raw: string | null, fallback: number): number {
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Pagina dedicada de simular. Hoje ela e um wrapper com header em volta do
 *  <SimuladorInline/> — a mesma logica agora vive tambem embutida no MarketPlace
 *  (o cliente pediu o "menuzinho" direto na home de ofertas). */
export function ServidorSimular() {
  const [sp] = useSearchParams();
  const [info, setInfo] = useState<MatriculaInfo | null>(() => readActiveMatricula());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_META || e.key === STORAGE_KEY_ID) {
        setInfo(readActiveMatricula());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const valorDefault = useMemo(() => num(sp.get("valor"), 8500), [sp]);
  const parcelasDefault = useMemo(() => num(sp.get("parcelas"), 36), [sp]);
  const taxaAmDefault = useMemo(() => num(sp.get("taxa"), 1.79) / 100, [sp]);
  // ?produto=X → tela dedicada por tipo. Sem tabs no SimuladorInline: cada
  // botao "Simular" do dashboard aponta pra esta URL com o produto certo.
  const produto = useMemo<"emprestimo" | "cartao_consignado" | "cartao_beneficio">(() => {
    const p = sp.get("produto");
    if (p === "cartao_consignado" || p === "cartao_beneficio") return p;
    return "emprestimo";
  }, [sp]);

  const meta = produto === "emprestimo"
    ? { eyebrow: "Simular empréstimo", titulo: "Quanto cabe no seu bolso?", icone: "💰" }
    : produto === "cartao_consignado"
      ? { eyebrow: "Simular cartão consignado", titulo: "Que limite cabe na sua margem?", icone: "💳" }
      : { eyebrow: "Simular cartão benefício", titulo: "Que limite cabe na sua margem?", icone: "🎫" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, width: "100%", margin: "0 auto" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          {meta.eyebrow}
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.6rem" }}>{meta.icone}</span>
          <span>{meta.titulo}</span>
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {info ? (
            <>Simulando para a matricula <b>{info.matricula}</b> ({info.prefeitura}). </>
          ) : null}
          {produto === "emprestimo"
            ? "Ajuste valor e parcelas para encontrar a melhor opção."
            : "Ajuste o limite pretendido — a fatura mínima precisa caber na sua margem cartão."}
        </p>
      </header>

      <SimuladorInline
        info={info}
        produto={produto}
        valorDefault={valorDefault}
        parcelasDefault={parcelasDefault}
        taxaAmDefault={taxaAmDefault}
      />
    </div>
  );
}
