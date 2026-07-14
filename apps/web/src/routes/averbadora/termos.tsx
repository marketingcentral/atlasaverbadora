import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Pill, TextField, TextareaField } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { TermoTemplate, TermoTipo } from "@atlas/sdk";

/** Editor dos TERMOS que aparecem para o usuario aceitar in-app.
 *  Cada tipo tem um corpo com placeholders {{var}} — substituidos em tempo real
 *  quando o servidor abre a tela de aceite. */
export function AverbadoraTermos() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "termos"], queryFn: () => atlas.admin.listTermos() });
  const [editingId, setEditingId] = useState<TermoTipo | null>(null);
  const editing = q.data?.termos.find((t) => t.id === editingId) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Termos de aceite</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 780, fontSize: 13 }}>
          Textos que aparecem para o usuário aceitar in-app (termo de autorização de empréstimo,
          adesão a benefício, anuência LGPD, etc). Use <code style={{ fontFamily: "var(--font-mono)", padding: "1px 4px", background: "var(--bg-elev-2)", borderRadius: 4 }}>{"{{variavel}}"}</code> para
          inserir dados dinâmicos — vão ser substituídos pelo backend quando o servidor abrir a tela.
        </p>
      </header>

      {q.isLoading ? <p style={{ color: "var(--text-muted)" }}>Carregando…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
          {(q.data?.termos ?? []).map((t) => (
            <Card key={t.id} style={{ display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
                    {t.id}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{t.titulo}</div>
                </div>
                <Pill variant={t.ativo ? "averbado" : "expirado"}>{t.ativo ? "ativo" : "inativo"}</Pill>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{t.descricao}</p>
              {t.variaveis.length > 0 ? (
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Variáveis: {t.variaveis.map((v) => (
                    <code key={v} style={{ marginRight: 4, fontFamily: "var(--font-mono)", background: "var(--bg-elev-2)", padding: "1px 4px", borderRadius: 3 }}>
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                <span>v{t.versao}</span>
                <Button size="sm" onClick={() => setEditingId(t.id)}>Editar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing ? (
        <EditorModal
          termo={editing}
          onClose={() => setEditingId(null)}
          onSaved={() => { setEditingId(null); qc.invalidateQueries({ queryKey: ["admin", "termos"] }); }}
        />
      ) : null}
    </div>
  );
}

function EditorModal({ termo, onClose, onSaved }: { termo: TermoTemplate; onClose: () => void; onSaved: () => void }) {
  const [titulo, setTitulo] = useState(termo.titulo);
  const [descricao, setDescricao] = useState(termo.descricao);
  const [corpo, setCorpo] = useState(termo.corpo);
  const [versao, setVersao] = useState(termo.versao);
  const [ativo, setAtivo] = useState(termo.ativo);
  useEffect(() => {
    setTitulo(termo.titulo); setDescricao(termo.descricao); setCorpo(termo.corpo);
    setVersao(termo.versao); setAtivo(termo.ativo);
  }, [termo]);

  const save = useMutation({
    mutationFn: () => atlas.admin.upsertTermo(termo.id, { titulo, descricao, corpo, versao, ativo }),
    onSuccess: onSaved,
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24, maxWidth: 880, width: "100%", maxHeight: "calc(100vh - 48px)", overflowY: "auto", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            {termo.id}
          </div>
          <h3 style={{ margin: "4px 0 0" }}>Editando: {termo.titulo}</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 10 }}>
          <TextField label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <TextField label="Versão" value={versao} onChange={(e) => setVersao(e.target.value)} />
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
            Ativo
            <select
              value={ativo ? "1" : "0"}
              onChange={(e) => setAtivo(e.target.value === "1")}
              style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)" }}
            >
              <option value="1">Sim</option>
              <option value="0">Não</option>
            </select>
          </label>
        </div>

        <TextField label="Descrição interna (não aparece pro servidor)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Corpo do termo
          </label>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
            Use <code style={{ fontFamily: "var(--font-mono)" }}>{"{{variavel}}"}</code>. Suporta <b>**negrito**</b> markdown-style e parágrafos separados por linha em branco.
            {termo.variaveis.length > 0 ? (
              <> Variáveis disponíveis: {termo.variaveis.map((v) => (
                <code key={v} style={{ marginLeft: 4, fontFamily: "var(--font-mono)", background: "var(--bg-elev-2)", padding: "1px 4px", borderRadius: 3 }}>
                  {`{{${v}}}`}
                </code>
              ))}</>
            ) : null}
          </div>
          <textarea
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={16}
            style={{
              width: "100%", padding: 12, fontFamily: "var(--font-mono)", fontSize: 12,
              background: "var(--surface)", color: "var(--text)",
              border: "1px solid var(--border-strong)", borderRadius: 8,
              lineHeight: 1.6, resize: "vertical",
            }}
          />
        </div>

        <PreviewBlock corpo={corpo} variaveis={termo.variaveis} />

        {save.isError ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{(save.error as Error).message}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
        </div>
      </div>
    </div>
  );
  void TextareaField; // hint no-op
}

/** Preview do corpo — substitui {{var}} por exemplo em italico e renderiza
 *  paragrafos + **negrito**. Sem eval — regex simples. */
function PreviewBlock({ corpo, variaveis }: { corpo: string; variaveis: string[] }) {
  const exemplos: Record<string, string> = {
    tipoLabel: "Empréstimo Consignado",
    valor: "R$ 10.000,00",
    parcelas: "36",
    parcela: "R$ 320,50",
    banco: "Banco Atlas",
    prazo: "48 horas",
    limite: "R$ 1.500,00",
    produto: "Cartão de Crédito Consignado",
    parceiro: "Farmácia Central",
    duracaoMinima: "Compromisso mínimo de 12 meses.",
  };
  const rendered = corpo.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k: string) => exemplos[k] ?? `[${k}]`);
  const paragrafos = rendered.split(/\n\n+/);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        Preview (com valores de exemplo)
      </div>
      <div style={{ padding: 16, background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, maxHeight: 240, overflowY: "auto" }}>
        {paragrafos.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? "0 0 8px" : "8px 0" }} dangerouslySetInnerHTML={{
            __html: p.replace(/\*\*(.+?)\*\*/g, '<b style="color: var(--text)">$1</b>').replace(/\n/g, "<br/>"),
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
        {variaveis.length > 0 ? `Placeholders válidos: ${variaveis.map((v) => `{{${v}}}`).join(", ")}` : "Este termo não tem variáveis."}
      </div>
    </div>
  );
}
