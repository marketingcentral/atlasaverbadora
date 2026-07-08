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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, width: "100%", margin: "0 auto" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Simular crédito
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Quanto cabe no seu bolso?</h1>
        <p style={{ color: "var(--text-muted)" }}>
          {info ? (
            <>Simulando para a matricula <b>{info.matricula}</b> ({info.prefeitura}). </>
          ) : null}
          Ajuste valor e parcelas para encontrar a melhor opção.
        </p>
      </header>

      <SimuladorInline
        info={info}
        valorDefault={valorDefault}
        parcelasDefault={parcelasDefault}
        taxaAmDefault={taxaAmDefault}
      />
    </div>
  );
}
