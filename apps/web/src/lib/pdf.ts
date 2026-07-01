// Minimal client-side PDF generator — single-page, monospaced Courier text.
// Mesma tecnica do miniPdf() do apps/api (prefeitura) — nenhum dependencia externa.
// Ideal para documentos oficiais curtos: ADF, comprovantes, recibos.

interface PdfLine {
  text: string;
  /** true = bold-ish (rendered via Courier-Bold). */
  bold?: boolean;
}

/** Build a PDF byte array with a title + list of lines, single A4 page. */
export function buildSimplePdf(title: string, lines: (string | PdfLine)[]): Uint8Array {
  const escape = (s: string) => s.replace(/([\\()])/g, "\\$1");
  const normalized: PdfLine[] = [
    { text: title, bold: true },
    { text: "" },
    ...lines.map((l) => (typeof l === "string" ? { text: l } : l)),
  ];

  // BT..ET stream. Toggle font between F1 (Courier) and F2 (Courier-Bold).
  const parts: string[] = ["BT", "/F1 10 Tf", "40 800 Td", "12 TL"];
  let currentFont: "F1" | "F2" = "F1";
  normalized.forEach((ln, i) => {
    const wantFont: "F1" | "F2" = ln.bold ? "F2" : "F1";
    if (wantFont !== currentFont) {
      parts.push(`/${wantFont} 10 Tf`);
      currentFont = wantFont;
    }
    if (i > 0) parts.push("T*");
    parts.push(`(${escape(ln.text)}) Tj`);
  });
  parts.push("ET");
  const stream = parts.join("\n");

  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function downloadPdf(filename: string, bytes: Uint8Array): void {
  // Cast para BlobPart — Uint8Array<ArrayBufferLike> nao unifica com o tipo
  // esperado por Blob() no TS strict, mas em runtime funciona perfeitamente.
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
