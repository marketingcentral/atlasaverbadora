import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button, FormActions, Pill, SelectField, TextField, TextareaField,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type {
  EmailEvento, EmailPublico, EmailSimulacaoStatus, EmailSimulacaoTipo, EmailTemplate,
} from "@atlas/sdk";

const PUBLICO_LABEL: Record<EmailPublico, string> = {
  servidor: "Servidor",
  banco: "Banco",
  prefeitura: "Prefeitura",
  averbadora: "Averbadora",
};

const EVENTO_TITULO: Record<EmailEvento, string> = {
  primeiro_acesso: "Primeiro acesso",
  recuperar_senha: "Recuperar senha",
  redefinir_senha: "Redefinir senha",
  simulacao: "Simulação",
  beneficio: "Benefícios",
};

const EVENTO_DESCRICAO: Record<EmailEvento, string> = {
  primeiro_acesso: "E-mail enviado quando um usuário conclui o primeiro acesso à plataforma. Um modelo por perfil (servidor, banco, prefeitura, averbadora).",
  recuperar_senha: "E-mail com código para redefinir a senha após clicar em \"Esqueci minha senha\". Um modelo por perfil.",
  redefinir_senha: "E-mail de confirmação (verificação por código) quando o usuário troca a própria senha pela conta. Um modelo por perfil.",
  simulacao: "E-mails disparados a cada mudança de status de simulação (enviada, aprovada, recusada, averbada). Enviados ao servidor e ao banco.",
  beneficio: "Um e-mail por benefício cadastrado. Criado automaticamente ao criar o benefício em Benefícios; excluído junto se o benefício for removido.",
};

const SIM_TIPO_LABEL: Record<EmailSimulacaoTipo, string> = {
  emprestimo: "Empréstimo",
  cartao_consignado: "Cartão consignado",
  cartao_beneficio: "Cartão benefício",
  portabilidade: "Portabilidade",
};

const SIM_STATUS_LABEL: Record<EmailSimulacaoStatus, string> = {
  enviada: "Enviada ao banco",
  aprovada: "Aprovada pelo banco",
  recusada: "Recusada pelo banco",
  averbada: "Averbada em folha",
};

/**
 * Tela unificada. A rota escolhida define qual "evento" da lista aparece:
 * - primeiro_acesso, recuperar_senha, redefinir_senha: 4 cards (1 por perfil).
 * - simulacao: 32 cards (4 tipos x 4 status x 2 públicos) — dropdowns filtram.
 * - beneficio: N cards (auto-criados). Podem ser excluídos apenas via cascade
 *   quando o benefício correspondente for excluído.
 */
export function AdminEmails({ evento }: { evento: EmailEvento }) {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "email-templates"], queryFn: () => atlas.admin.emailTemplates.list() });
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [tipoSel, setTipoSel] = useState<"" | EmailSimulacaoTipo>("");
  const [statusSel, setStatusSel] = useState<"" | EmailSimulacaoStatus>("");
  const [publicoSel, setPublicoSel] = useState<"" | EmailPublico>("");

  const todos = data.data?.templates ?? [];
  const doEvento = useMemo(() => todos.filter((t) => t.evento === evento), [todos, evento]);
  const filtrados = useMemo(() => {
    return doEvento.filter((t) => {
      if (publicoSel && t.publico !== publicoSel) return false;
      if (evento === "simulacao") {
        if (tipoSel && t.simulacaoTipo !== tipoSel) return false;
        if (statusSel && t.simulacaoStatus !== statusSel) return false;
      }
      return true;
    });
  }, [doEvento, publicoSel, tipoSel, statusSel, evento]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "email-templates"] });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora · E-mails do sistema
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{EVENTO_TITULO[evento]}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, maxWidth: 720 }}>
          {EVENTO_DESCRICAO[evento]}
        </p>
        <p style={{ color: "var(--text-dim)", marginTop: 8, fontSize: 12 }}>
          💡 Use <code style={codeInline}>&#123;&#123;variavel&#125;&#125;</code> no assunto e no corpo — serão substituídas na hora do envio real. Ex.: <code style={codeInline}>&#123;&#123;contract_name&#125;&#125;</code>, <code style={codeInline}>&#123;&#123;nome&#125;&#125;</code>, <code style={codeInline}>&#123;&#123;codigo&#125;&#125;</code>.
        </p>
      </header>

      {/* Filtros — variam por evento */}
      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <SelectField
          label="Público"
          value={publicoSel}
          onChange={(e) => setPublicoSel(e.target.value as "" | EmailPublico)}
          options={[
            { value: "", label: "Todos" },
            ...(evento === "simulacao"
              ? [{ value: "servidor", label: "Servidor" }, { value: "banco", label: "Banco" }]
              : evento === "beneficio"
                ? [{ value: "servidor", label: "Servidor" }, { value: "averbadora", label: "Averbadora" }]
                : Object.entries(PUBLICO_LABEL).map(([v, l]) => ({ value: v, label: l }))),
          ]}
        />
        {evento === "simulacao" ? (
          <>
            <SelectField
              label="Tipo de simulação"
              value={tipoSel}
              onChange={(e) => setTipoSel(e.target.value as "" | EmailSimulacaoTipo)}
              options={[
                { value: "", label: "Todos" },
                ...Object.entries(SIM_TIPO_LABEL).map(([v, l]) => ({ value: v, label: l })),
              ]}
            />
            <SelectField
              label="Status"
              value={statusSel}
              onChange={(e) => setStatusSel(e.target.value as "" | EmailSimulacaoStatus)}
              options={[
                { value: "", label: "Todos" },
                ...Object.entries(SIM_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l })),
              ]}
            />
          </>
        ) : null}
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)", paddingBottom: 8 }}>
          {filtrados.length} de {doEvento.length} modelos
        </span>
      </div>

      {data.isLoading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando…</div>
      ) : filtrados.length === 0 ? (
        <div style={emptyBox}>
          {evento === "beneficio"
            ? "Nenhum benefício cadastrado ainda. Ao criar um benefício em Benefícios, um modelo de e-mail é criado automaticamente aqui."
            : "Nenhum modelo neste filtro."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
          {filtrados.map((t) => (
            <article key={t.id} style={{ ...card, opacity: t.ativo ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{t.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{t.id}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Pill variant={pillPublico(t.publico)}>{PUBLICO_LABEL[t.publico]}</Pill>
                  {evento === "simulacao" && t.simulacaoStatus ? (
                    <Pill variant={pillStatus(t.simulacaoStatus)}>{t.simulacaoStatus}</Pill>
                  ) : null}
                  {!t.ativo ? <Pill variant="expirado">inativo</Pill> : null}
                </div>
              </div>
              <div>
                <div style={sectionLabel}>Assunto</div>
                <div style={{ fontSize: 13, color: "var(--text)", marginTop: 3 }}>{t.assunto || <em style={{ color: "var(--text-dim)" }}>(vazio)</em>}</div>
              </div>
              <div>
                <div style={sectionLabel}>Prévia</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, whiteSpace: "pre-wrap", maxHeight: 84, overflow: "hidden" }}>
                  {t.corpo.slice(0, 260)}{t.corpo.length > 260 ? "…" : ""}
                </div>
              </div>
              {t.variaveis && t.variaveis.length > 0 ? (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {t.variaveis.map((v) => (
                    <span key={v} style={chipVariavel}>&#123;&#123;{v}&#125;&#125;</span>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>Editar</Button>
                {evento === "beneficio" ? (
                  <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto", alignSelf: "center" }}>
                    Removido automaticamente com o benefício
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto", alignSelf: "center" }}>
                    Modelo fixo — não pode ser excluído
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <EmailTemplateModal
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { invalidate(); setEditing(null); }}
        />
      ) : null}
    </div>
  );
}

function EmailTemplateModal({
  template, onClose, onSaved,
}: {
  template: EmailTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [assunto, setAssunto] = useState(template.assunto);
  const [corpo, setCorpo] = useState(template.corpo);
  const [descricao, setDescricao] = useState(template.descricao ?? "");
  const [variaveisRaw, setVariaveisRaw] = useState((template.variaveis ?? []).join(", "));
  const [ativo, setAtivo] = useState(template.ativo);

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
      id: template.id,
      assunto,
      corpo,
      descricao: descricao.trim() || undefined,
      variaveis: variaveisRaw.split(",").map((v: string) => v.trim()).filter(Boolean),
      ativo,
    }),
    onSuccess: onSaved,
  });

  // Teste real por SMTP.
  const [testeAberto, setTesteAberto] = useState(false);
  const [testeDestino, setTesteDestino] = useState("");
  const [testeVars, setTesteVars] = useState<Record<string, string>>({});
  const [testeResultado, setTesteResultado] = useState<null | {
    sent: boolean; destino: string; reason?: string;
    preview: { assunto: string; corpo: string };
  }>(null);
  const enviarTeste = useMutation({
    mutationFn: () => atlas.admin.emailTemplates.enviarTeste(template.id, {
      destino: testeDestino,
      vars: testeVars,
    }),
    onSuccess: (r) => setTesteResultado(r),
  });

  return (
    <div style={modalBackdrop} onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>{template.nome}</h3>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6 }}>
          <code>{template.id}</code> · {PUBLICO_LABEL[template.publico]} · atualizado em {new Date(template.atualizadoEm).toLocaleString("pt-BR")}
        </div>

        <TextField label="Assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: Confirme seu primeiro acesso ao Atlas" />

        <TextareaField
          label="Corpo do e-mail"
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          rows={12}
          hint="Suporta placeholders {{variavel}} substituídos no envio."
          placeholder="Olá {{nome}},&#10;&#10;..."
        />

        <TextField
          label="Descrição (interna, aparece só aqui)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Enviado quando o servidor faz primeiro acesso"
        />

        <TextField
          label="Variáveis declaradas (separadas por vírgula)"
          value={variaveisRaw}
          onChange={(e) => setVariaveisRaw(e.target.value)}
          placeholder="nome, codigo, contract_name"
          hint="Documenta as variáveis que esse template usa. O sistema preenche na hora do envio real."
        />

        {variaveisUsadas.length > 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Detectadas no texto:{" "}
            {variaveisUsadas.map((v, i) => (
              <span key={v} style={{ ...chipVariavel, marginLeft: i > 0 ? 4 : 0 }}>
                &#123;&#123;{v}&#125;&#125;
              </span>
            ))}
          </div>
        ) : null}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo (modelo disponível para envio real)
        </label>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={sectionLabel}>Enviar teste</div>
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

        <FormActions>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

function pillPublico(p: EmailPublico): "averbado" | "emdia" | "aceita" | "pendente" {
  if (p === "servidor") return "averbado";
  if (p === "banco") return "emdia";
  if (p === "prefeitura") return "aceita";
  return "pendente";
}

function pillStatus(s: EmailSimulacaoStatus): "aceita" | "pendente" | "expirado" | "averbado" {
  if (s === "enviada") return "pendente";
  if (s === "aprovada") return "aceita";
  if (s === "recusada") return "expirado";
  return "averbado";
}

const codeInline: React.CSSProperties = { background: "var(--bg-elev-2)", padding: "1px 6px", borderRadius: 4, fontSize: 11 };
const sectionLabel: React.CSSProperties = { fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700 };
const chipVariavel: React.CSSProperties = {
  fontSize: 10.5, padding: "2px 6px", borderRadius: 4, display: "inline-block",
  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
  color: "var(--accent)", fontFamily: "var(--font-mono)",
};
const card: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10,
};
const emptyBox: React.CSSProperties = {
  padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14,
  border: "1px dashed var(--border)", borderRadius: 12,
};
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
