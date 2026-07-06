// Marca Atlas — usa as logos oficiais (monograma "A360" + wordmark ATLAS AVERBADORA).
// Assets em apps/web/public: atlas-mark-white.png (monograma) e atlas-logo-white.png
// (wordmark completo). Ambos brancos com fundo transparente — para o tema escuro.

/** Marca compacta para sidebars/topbars: monograma + "Atlas <sub>". */
export function AtlasBrand({ sub, height = 30 }: { sub?: string; height?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: "1.05rem" }}>
      <img
        className="atlas-brand-img"
        src="/atlas-mark-white.png"
        alt="Atlas"
        style={{ height, width: "auto", display: "block", flexShrink: 0 }}
      />
      <span>
        Atlas
        {sub ? <small style={{ opacity: 0.6, fontSize: ".8rem", marginLeft: 4 }}>{sub}</small> : null}
      </span>
    </div>
  );
}

/** Logo completo (wordmark) — para telas de login / cabeçalhos de destaque. */
export function AtlasLogo({ height = 110 }: { height?: number }) {
  return (
    <img
      className="atlas-brand-img"
      src="/atlas-logo-white.png"
      alt="Atlas 360 Averbadora"
      style={{ height, width: "auto", maxWidth: "100%", display: "block" }}
    />
  );
}
