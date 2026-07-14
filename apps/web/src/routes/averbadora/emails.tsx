import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button, FormActions, FormGrid, Pill, SelectField, TextField, TextareaField,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { EmailPublico, EmailTemplate } from "@atlas/sdk";

const PUBLICO_LABEL: Record<EmailPublico, string> = {
  servidor: "Servidor",
  banco: "Banco",
  prefeitura: "Prefeitura",
  averbadora: "Averbadora",
};

export function AdminEmails() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "email-templates"], queryFn: () => atlas.admin.emailTemplates.list() });
  const [editing, setEditing] = useState<EmailTemplate | "new" | null>(null);
  const [filtroPublico, setFiltroPublico] = useState<"" | EmailPublico>("");
  const [busca, setBusca] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "email-templates"] });
  const remover = useMutation({
    mutationFn: (id: string) => atlas.admin.emailTemplates.remover(id),
    onSuccess: invalidate,
  });

  const todos = data.data?.templates ?? [];
  const filtrados = useMemo(() => {
    return todos.filter((t) => {
      if (filtroPublico && t.publico !== filtroPublico) return false;
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        if (!t.nome.toLowerCase().includes(q) && !t.assunto.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [todos, filtroPublico, busca]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora · Modelos de e-mail
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Consultor de e-mails</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6, maxWidth: 680 }}>
            Edite os modelos de e-mail enviados pelo sistema. Use{" "}
            <code style={{ background: "var(--bg-elev-2)", padding: "1px 6px", borderRadius: 4 }}>&#123;&#123;variavel&#125;&#125;</code>{" "}
            no assunto e no corpo — as variáveis são substituídas na hora do envio real.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Novo modelo</Button>
      </header>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <SelectField
          label="Público"
          value={filtroPublico}
          onChange={(e) => setFiltroPublico(e.target.value as "" | EmailPublico)}
          options={[
            { value: "", label: "Todos" },
            { value: "servidor", label: "Servidor" },
            { value: "banco", label: "Banco" },
            { value: "prefeitura", label: "Prefeitura" },
            { value: "averbadora", label: "Averbadora" },
          ]}
        />
        <TextField label="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou assunto" />
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)", paddingBottom: 8 }}>
          {filtrados.length} de {todos.length} modelos
        </span>
      </div>

      {data.isLoading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14, border: "1px dashed var(--border)", borderRadius: 12 }}>
          Nenhum modelo neste filtro. Clique em "+ Novo modelo" pra criar.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {filtrados.map((t) => (
            <article
              key={t.id}
              style={{
                background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
                borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10,
                opacity: t.ativo ? 1 : 0.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{t.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{t.id}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Pill variant={pillPublico(t.publico)}>{PUBLICO_LABEL[t.publico]}</Pill>
                  {t.ativo ? null : <Pill variant="expirado">inativo</Pill>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700 }}>Assunto</div>
                <div style={{ fontSize: 13, color: "var(--text)", marginTop: 3 }}>{t.assunto || <em style={{ color: "var(--text-dim)" }}>(vazio)</em>}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700 }}>Prévia</div>
                <div style={{
                  fontSize: 12, color: "var(--text-muted)", marginTop: 3, whiteSpace: "pre-wrap",
                  maxHeight: 80, overflow: "hidden", position: "relative",
                }}>
                  {t.corpo.slice(0, 240)}{t.corpo.length > 240 ? "…" : ""}
                </div>
              </div>
              {t.variaveis && t.variaveis.length > 0 ? (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {t.variaveis.map((v) => (
                    <span key={v} style={{
                      fontSize: 10.5, padding: "2px 6px", borderRadius: 4,
                      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                      color: "var(--accent)", fontFamily: "var(--font-mono)",
                    }}>
                      &#123;&#123;{v}&#125;&#125;
                    </span>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>Editar</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={remover.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover o modelo "${t.nome}"?`)) remover.mutate(t.id);
                  }}
                  style={{ color: "#F87171", marginLeft: "auto" }}
                >
                  Remover
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <EmailTemplateModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { invalidate(); setEditing(null); }}
        />
      ) : null}
    </div>
  );
}

function pillPublico(p: EmailPublico): "averbado" | "emdia" | "aceita" | "pendente" {
  if (p === "servidor") return "averbado";
  if (p === "banco") return "emdia";
  if (p === "prefeitura") return "aceita";
  return "pendente";
}

function EmailTemplateModal({
  initial, onClose, onSaved,
}: {
  initial: EmailTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [publico, setPublico] = useState<EmailPublico>(initial?.publico ?? "servidor");
  const [assunto, setAssunto] = useState(initial?.assunto ?? "");
  const [corpo, setCorpo] = useState(initial?.corpo ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [variaveisRaw, setVariaveisRaw] = useState((initial?.variaveis ?? []).join(", "));
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);

  // Variaveis realmente usadas — extraidas do assunto+corpo por regex. Ajuda
  // o operador a ver o que sera substituido na hora do envio.
  const variaveisUsadas = useMemo(() => {
    const re = /\{\{\s*(\w+)\s*\}\}/g;
    const s = `${assunto}\n${corpo}`;
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) found.add(m[1]!);
    return Array.from(found);
  }, [assunto, corpo]);

  const save = useMutation({
    mutationFn: () => atlas.admin.emailTemplates.upsert({
      id: initial?.id,
      nome: nome.trim() || "Sem nome",
      publico,
      assunto,
      corpo,
      descricao: descricao.trim() || undefined,
      variaveis: variaveisRaw.split(",").map((v: string) => v.trim()).filter(Boolean),
      ativo,
    }),
    onSuccess: onSaved,
  });

  // Teste real por SMTP — o operador digita destino + mock das variaveis.
  const [testeAberto, setTesteAberto] = useState(false);
  const [testeDestino, setTesteDestino] = useState("");
  const [testeVars, setTesteVars] = useState<Record<string, string>>({});
  const [testeResultado, setTesteResultado] = useState<null | {
    sent: boolean; destino: string; reason?: string;
    preview: { assunto: string; corpo: string };
  }>(null);
  const enviarTeste = useMutation({
    mutationFn: () => {
      if (!initial?.id) throw new Error("Salve o modelo antes de enviar teste");
      return atlas.admin.emailTemplates.enviarTeste(initial.id, {
        destino: testeDestino,
        vars: testeVars,
      });
    },
    onSuccess: (r) => setTesteResultado(r),
  });

  return (
    <div style={modalBackdrop} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>{initial ? "Editar modelo" : "Novo modelo"}</h3>
        {initial ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6 }}>
            <code>{initial.id}</code> · atualizado em {new Date(initial.atualizadoEm).toLocaleString("pt-BR")}
          </div>
        ) : null}

        <FormGrid>
          <TextField label="Nome (uso interno)" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Boas-vindas ao servidor" />
          <SelectField
            label="Público-alvo"
            value={publico}
            onChange={(e) => setPublico(e.target.value as EmailPublico)}
            options={[
              { value: "servidor", label: "Servidor" },
              { value: "banco", label: "Banco parceiro" },
              { value: "prefeitura", label: "Prefeitura" },
              { value: "averbadora", label: "Averbadora (interno)" },
            ]}
          />
        </FormGrid>

        <TextField label="Assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: Bem-vindo(a) ao Atlas, {{nome}}!" />

        <TextareaField
          label="Corpo do e-mail"
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          rows={10}
          hint="Suporta placeholders {{nome}} substituídos no envio."
          placeholder="Olá {{nome}},&#10;&#10;..."
        />

        <TextField
          label="Descrição (interno)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Quando este e-mail é disparado (ex.: quando o banco aprova uma proposta)"
        />

        <TextField
          label="Variáveis declaradas (separadas por vírgula)"
          value={variaveisRaw}
          onChange={(e) => setVariaveisRaw(e.target.value)}
          placeholder="nome, matricula, banco, adf"
        />

        {variaveisUsadas.length > 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Detectadas no texto:{" "}
            {variaveisUsadas.map((v, i) => (
              <span key={v} style={{
                display: "inline-block", padding: "2px 6px", borderRadius: 4, marginLeft: i > 0 ? 4 : 0,
                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 11,
              }}>
                &#123;&#123;{v}&#125;&#125;
              </span>
            ))}
          </div>
        ) : null}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo (modelo disponível pra envio)
        </label>

        {initial?.id ? (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                Enviar teste
              </div>
              <button
                type="button"
                onClick={() => setTesteAberto((v) => !v)}
                style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
              >
                {testeAberto ? "Ocultar ▲" : "Mostrar ▼"}
              </button>
            </div>
            {testeAberto ? (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <TextField
                  label="Destino"
                  value={testeDestino}
                  onChange={(e) => setTesteDestino(e.target.value)}
                  placeholder="seu-email@dominio.com"
                  type="email"
                />
                {variaveisUsadas.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                    {variaveisUsadas.map((v) => (
                      <TextField
                        key={v}
                        label={v}
                        value={testeVars[v] ?? ""}
                        onChange={(e) => setTesteVars({ ...testeVars, [v]: e.target.value })}
                        placeholder={`valor de {{${v}}}`}
                      />
                    ))}
                  </div>
                ) : null}
                <div>
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={enviarTeste.isPending || !testeDestino}
                    onClick={() => enviarTeste.mutate()}
                  >
                    {enviarTeste.isPending ? "Enviando..." : "Enviar teste →"}
                  </Button>
                </div>
                {testeResultado ? (
                  <div style={{
                    padding: 12, borderRadius: 8,
                    background: testeResultado.sent
                      ? "color-mix(in srgb, var(--emerald-500) 10%, transparent)"
                      : "color-mix(in srgb, var(--gold-500) 10%, transparent)",
                    border: `1px solid ${testeResultado.sent ? "var(--emerald-500)" : "var(--gold-500)"}`,
                    fontSize: 12,
                  }}>
                    <div style={{ fontWeight: 700 }}>
                      {testeResultado.sent ? "✓ Enviado" : "⚠ Não enviado"}
                      {testeResultado.reason ? ` — ${testeResultado.reason}` : ""}
                    </div>
                    <div style={{ marginTop: 8, color: "var(--text-muted)" }}>Preview do que foi gerado:</div>
                    <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      <b>Assunto:</b> {testeResultado.preview.assunto}
                    </div>
                    <pre style={{
                      marginTop: 4, whiteSpace: "pre-wrap", fontSize: 11,
                      background: "var(--bg-elev-2)", padding: 8, borderRadius: 6,
                      maxHeight: 200, overflow: "auto",
                    }}>
                      {testeResultado.preview.corpo}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "6px 0" }}>
            Salve o modelo primeiro pra habilitar o envio de teste.
          </div>
        )}

        <FormActions>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando..." : (initial ? "Salvar alterações" : "Criar modelo")}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
  display: "grid", placeItems: "center", zIndex: 100, backdropFilter: "blur(6px)",
  padding: 16, overflow: "auto",
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 14, padding: 24, maxWidth: 720, width: "100%",
  display: "flex", flexDirection: "column", gap: 14, boxShadow: "var(--shadow-lg)",
  maxHeight: "90vh", overflow: "auto",
};
