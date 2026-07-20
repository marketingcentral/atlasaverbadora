// Minimal CSV parser supporting RFC 4180 basics: quoted fields, escaped quotes, \r\n.

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): CsvParseResult {
  const stripped = text.replace(/^﻿/, ""); // strip BOM
  // Detecta separator: se a primeira linha nao tem virgula mas tem TAB, e' TSV
  // (copiado direto do Google Sheets/Excel). Converte pra CSV antes de parsear.
  // Sem essa deteccao, o parser trata toda a linha como um unico campo e
  // reporta "cpf obrigatorio" pra todas as linhas (erro do usuario 20/07/2026).
  const firstLine = stripped.split(/\r?\n/, 1)[0] ?? "";
  const normalized = !firstLine.includes(",") && firstLine.includes("\t")
    ? stripped.replace(/\t/g, ",")
    : stripped;
  const raw = parseRows(normalized);
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = (raw[0] ?? []).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i]!;
    if (r.length === 1 && r[0] === "") continue; // skip empty lines
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j]!;
      obj[key] = (r[j] ?? "").trim();
    }
    rows.push(obj);
  }
  return { headers, rows };
}

function parseRows(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); out.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* swallow */ }
      else field += ch;
    }
  }
  // flush
  if (field !== "" || row.length > 0) { row.push(field); out.push(row); }
  return out;
}

/** Build a CSV from header order + rows. Escapes quotes, wraps if needed. */
export function buildCsv(headers: string[], rows: Record<string, string | number | boolean | null | undefined>[]): string {
  const esc = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  lines.push(headers.join(","));
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return lines.join("\n");
}

export interface ImportOutcome<T> {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { line: number; message: string }[];
  rows: T[];
}
