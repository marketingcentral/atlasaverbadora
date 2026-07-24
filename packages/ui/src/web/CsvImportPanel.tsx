import { useRef, useState, type ReactNode } from "react";
import { Button } from "./Button.js";
import { Card } from "./Card.js";

export interface CsvImportPanelProps {
  /** Title shown in the panel (ex: "Importar bancos"). */
  title: string;
  /** Columns shown in the hint line ("Colunas: nome, status, ..."). Opcional —
   *  omite quando o modelo eh grande e ja tem "Baixar exemplo" pra guiar.
   *  Aceita ReactNode pra permitir destaque de campos personalizados. */
  columnsHint?: ReactNode;
  /** URL para baixar CSV exemplo (gerado pelo backend). */
  templateUrl: string;
  /** Função que recebe o conteúdo do CSV (texto) e chama o endpoint de import. */
  onImport: (csv: string) => Promise<CsvImportResult>;
  /** Disparado após import com sucesso (qualquer >0). Para refetch da lista. */
  onImported?: (result: CsvImportResult) => void;
}

export interface CsvImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { line: number; message: string }[];
}

export function CsvImportPanel({ title, columnsHint, templateUrl, onImport, onImported }: CsvImportPanelProps) {
  const [open, setOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(text: string) {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const r = await onImport(text);
      setResult(r);
      if ((r.inserted + r.updated) > 0) onImported?.(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    setPasted(text);
    await run(text);
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
            Importar CSV
          </div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>{title}</div>
          {columnsHint ? <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{columnsHint}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={templateUrl} download style={{ textDecoration: "none" }}>
            <Button size="sm" variant="ghost">↓ Baixar exemplo</Button>
          </a>
          <Button size="sm" onClick={() => setOpen((o) => !o)}>{open ? "Cancelar" : "Importar CSV"}</Button>
        </div>
      </div>

      {open ? (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
            style={{ fontSize: 13 }}
          />
          <details>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>Ou cole o conteúdo CSV manualmente</summary>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={6}
              placeholder="nome,status,..."
              style={{ width: "100%", marginTop: 6, padding: 10, fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)", borderRadius: 8 }}
            />
            <div style={{ marginTop: 8 }}>
              <Button size="sm" onClick={() => run(pasted)} disabled={busy || !pasted.trim()}>
                {busy ? "Importando…" : "Importar texto colado"}
              </Button>
            </div>
          </details>

          {busy ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Processando…</p> : null}
          {error ? <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p> : null}
          {result ? (
            <div style={{ padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, fontSize: 13 }}>
              <div>
                <b>{result.inserted}</b> inseridos · <b>{result.updated}</b> atualizados · <b>{result.skipped}</b> pulados
                {result.errors.length > 0 ? <> · <span style={{ color: "#ef4444" }}>{result.errors.length} erros</span></> : null}
              </div>
              {result.errors.length > 0 ? (
                <ul style={{ marginTop: 8, paddingLeft: 16, color: "#ef4444", fontSize: 12 }}>
                  {result.errors.slice(0, 8).map((er, i) => (
                    <li key={i}>Linha {er.line}: {er.message}</li>
                  ))}
                  {result.errors.length > 8 ? <li>… e mais {result.errors.length - 8} erros</li> : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
