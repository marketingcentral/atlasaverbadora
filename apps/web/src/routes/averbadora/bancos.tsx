import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DataTable,
  FormActions,
  FormGrid,
  IconButton,
  Pill,
  SelectField,
  TextField,
  type Column,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminBanco, AdminBancoInput } from "@atlas/sdk";

// Formata CNPJ progressivamente. Mesma logica do prefeituras.tsx.
function formatCnpj(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Formata telefone BR progressivamente. Max 11 digitos (celular com DDD).
function formatTelefone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Mesmo estilo do modal de prefeituras — leitura desativada com visual claro.
const readOnlyInputStyle: React.CSSProperties = {
  background: "var(--bg-elev-2)",
  color: "var(--text-muted)",
  cursor: "not-allowed",
};

/** Input de senha com toggle de visualizacao (olho). */
function PasswordFieldWithToggle({
  label, value, onChange, placeholder, hint, required, autoComplete, name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  name?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}{required ? <span style={{ color: "var(--danger-500)" }}> *</span> : null}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          name={name}
          style={{
            width: "100%", padding: "10px 44px 10px 12px", borderRadius: 8,
            border: "1px solid var(--border-strong)",
            background: "var(--bg-elev)", color: "var(--text)",
            fontSize: 14, boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          title={show ? "Ocultar senha" : "Mostrar senha"}
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            width: 32, height: 32, borderRadius: 6,
            border: "none", background: "transparent",
            color: "var(--text-muted)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
      {hint ? <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</div> : null}
    </div>
  );
}

export function AdminBancos() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "bancos"], queryFn: () => atlas.admin.listBancos() });
  const testar = useMutation({
    mutationFn: (id: number) => atlas.admin.testarBanco(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bancos"] }),
  });
  // Nunca exclui — desativa/reativa (status). Reversível, sem perda de dados.
  const toggleAtivo = useMutation({
    mutationFn: (b: AdminBanco) => atlas.admin.upsertBanco({
      id: b.id, nome: b.nome, status: b.status === "inativo" ? "ativo" : "inativo",
      adapter: b.adapter, contatoEmail: b.contatoEmail, loginEmail: b.loginEmail,
      scopes: b.scopes, mtlsHabilitado: b.mtlsHabilitado,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bancos"] }),
  });
  const [editing, setEditing] = useState<AdminBanco | "new" | null>(null);
  const [limparAberto, setLimparAberto] = useState(false);

  // Colunas espelham CSV exemplo (nome, status, adapter, contatoEmail,
  // loginEmail, password/senha) + extras uteis do fluxo CNPJ (CNPJ, telefone).
  const columns: Column<AdminBanco>[] = [
    {
      key: "status",
      header: "Situação",
      render: (b) => <Pill variant={b.status === "ativo" ? "averbado" : b.status === "pausado" ? "pendente" : "expirado"}>{b.status}</Pill>,
    },
    { key: "nome", header: "Banco" },
    {
      key: "cnpj",
      header: "CNPJ",
      mono: true,
      render: (b) => b.cnpj ? formatCnpj(b.cnpj) : <span style={{ color: "var(--text-dim)" }}>—</span>,
    },
    { key: "adapter", header: "Adapter" },
    { key: "contatoEmail", header: "Contato" },
    {
      key: "acesso",
      header: "Login",
      render: (b) => b.loginEmail
        ? <span style={{ color: "var(--emerald-500)" }}>{b.loginEmail}</span>
        : <span style={{ color: "var(--text-dim)" }}>—</span>,
    },
    {
      key: "senha",
      header: "Senha",
      render: (b) => b.hasPassword
        ? <span style={{ color: "var(--emerald-500)" }} title="Senha configurada">✓ cadastrada</span>
        : <span style={{ color: "var(--danger-500)" }} title="Sem senha — login nao funciona">— não configurada</span>,
    },
    {
      key: "telefone",
      header: "Telefone",
      render: (b) => b.telefone || <span style={{ color: "var(--text-dim)" }}>—</span>,
    },
    { key: "scopes", header: "Scopes", render: (b) => b.scopes.join(", ") || "—" },
    { key: "mtlsHabilitado", header: "mTLS", render: (b) => (b.mtlsHabilitado ? "sim" : "não") },
    {
      key: "teste",
      header: "Última conexão",
      render: (b) =>
        b.ultimoTeste ? (
          <span style={{ color: b.ultimoTesteOk ? "var(--emerald-500)" : "var(--danger-500)" }}>
            {b.ultimoTesteOk ? "OK" : "FALHA"} • {new Date(b.ultimoTeste).toLocaleString("pt-BR")}
          </span>
        ) : "—",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Bancos parceiros</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Botao "Limpar Base" removido (mesmo motivo de /prefeituras) */}
          <Button onClick={() => setEditing("new")}>+ Adicionar banco</Button>
        </div>
      </header>

      {/* CsvImportPanel removido a pedido do cliente (17/07/2026) — cadastro
          agora e SEMPRE via CNPJ (BrasilAPI + fallback), mesmo padrao das
          prefeituras. CSV importava linhas EXEMPLO como reais. */}

      <DataTable
        columns={columns}
        rows={data.data?.bancos ?? []}
        rowKey={(b) => String(b.id)}
        loading={data.isLoading}
        actions={(b) => (
          <>
            <IconButton title="Editar" onClick={() => setEditing(b)}>✎</IconButton>
            <IconButton title="Testar conexão" onClick={() => testar.mutate(b.id)}>↻</IconButton>
            {b.status === "inativo" ? (
              <IconButton title="Reativar" onClick={() => toggleAtivo.mutate(b)}>▶</IconButton>
            ) : (
              <IconButton danger title="Desativar" onClick={() => { if (confirm(`Desativar o banco "${b.nome}"?\n\nEle para de operar, mas os dados não são apagados — você pode reativar depois.`)) toggleAtivo.mutate(b); }}>⏸</IconButton>
            )}
          </>
        )}
      />

      {editing ? <BancoModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {limparAberto ? <LimparBaseBancosModal onClose={() => setLimparAberto(false)} onDone={() => { setLimparAberto(false); qc.invalidateQueries({ queryKey: ["admin", "bancos"] }); }} /> : null}
    </div>
  );
}

function BancoModal({ initial, onClose }: { initial: AdminBanco | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AdminBancoInput>({
    id: initial?.id,
    nome: initial?.nome ?? "",
    status: initial?.status ?? "ativo",
    adapter: initial?.adapter ?? "sandbox",
    contatoEmail: initial?.contatoEmail ?? "",
    loginEmail: initial?.loginEmail ?? "",
    password: "",
    scopes: initial?.scopes ?? ["propostas:rw"],
    mtlsHabilitado: initial?.mtlsHabilitado ?? false,
    cnpj: initial?.cnpj ?? "",
    razaoSocial: initial?.razaoSocial ?? "",
    nomeFantasia: initial?.nomeFantasia ?? "",
    dataFundacao: initial?.dataFundacao ?? "",
    atividade: initial?.atividade ?? "",
    telefone: initial?.telefone ?? "",
    endereco: initial?.endereco ?? {},
  });
  const [error, setError] = useState<string | null>(null);
  const [cnpjInput, setCnpjInput] = useState<string>(initial?.cnpj ?? "");
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [avancado, setAvancado] = useState(false);
  // Aviso "Falta preencher" so aparece apos primeira tentativa de submit.
  const [triedSubmit, setTriedSubmit] = useState(false);
  // Consulta CNPJ — mesmo endpoint das prefeituras.
  const consulta = useMutation({
    mutationFn: (cnpj: string) => atlas.admin.consultarCnpjPrefeitura(cnpj),
    onMutate: () => setCnpjError(null),
    onSuccess: (r) => {
      const d = r.dados;
      setForm((prev) => ({
        ...prev,
        cnpj: (d.cnpj as string | undefined) ?? cnpjInput.replace(/\D/g, ""),
        nome: (d.nome_fantasia as string | undefined) ?? (d.razao_social as string | undefined) ?? prev.nome,
        razaoSocial: (d.razao_social as string | undefined) ?? "",
        nomeFantasia: (d.nome_fantasia as string | undefined) ?? "",
        dataFundacao: (d.data_inicio_atividade as string | undefined) ?? "",
        atividade: (d.cnae_fiscal_descricao as string | undefined) ?? "",
        telefone: (d.ddd_telefone_1 as string | undefined) ?? "",
        contatoEmail: prev.contatoEmail || (d.email as string | undefined) || "",
        endereco: {
          logradouro: (d.logradouro as string | undefined) ?? "",
          numero: (d.numero as string | undefined) ?? "",
          complemento: (d.complemento as string | undefined) ?? "",
          bairro: (d.bairro as string | undefined) ?? "",
          cep: (d.cep as string | undefined) ?? "",
          municipio: (d.municipio as string | undefined) ?? "",
          uf: (d.uf as string | undefined) ?? "",
        },
      }));
    },
    onError: (err) => {
      const withDetails = err as { details?: { cnpj?: string }; message?: string; status?: number };
      const detalhe = withDetails.details?.cnpj;
      const msg = detalhe ?? withDetails.message ?? "Falha na consulta";
      if (withDetails.status === 404 || msg.includes("cnpj_nao_encontrado")) {
        setCnpjError("CNPJ não encontrado na Receita.");
      } else {
        setCnpjError(msg);
      }
    },
  });
  const buscarCnpj = () => {
    const digits = cnpjInput.replace(/\D/g, "");
    if (digits.length !== 14) {
      setCnpjError("CNPJ deve ter 14 dígitos.");
      return;
    }
    consulta.mutate(digits);
  };
  const dadosPreenchidos = !!(form.razaoSocial || form.nomeFantasia || form.dataFundacao || form.atividade || form.endereco?.logradouro);
  const save = useMutation({
    mutationFn: () => {
      const payload: AdminBancoInput = { ...form };
      if (!payload.loginEmail) delete payload.loginEmail;
      if (!payload.password) delete payload.password;
      if (!payload.cnpj) delete payload.cnpj;
      return atlas.admin.upsertBanco(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bancos"] });
      onClose();
    },
    onError: (err) => {
      // Expande details.fieldErrors do Zod pra o usuario ver qual campo falhou.
      const e = err as { message?: string; details?: Record<string, unknown> };
      const det = e.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
      const campos: string[] = [];
      if (det?.fieldErrors) {
        for (const [k, msgs] of Object.entries(det.fieldErrors)) {
          if (msgs?.length) campos.push(`${k}: ${msgs.join(", ")}`);
        }
      }
      if (det && !det.fieldErrors) {
        for (const [k, v] of Object.entries(det)) {
          if (typeof v === "string") campos.push(`${k}: ${v}`);
        }
      }
      if (det?.formErrors?.length) campos.push(...det.formErrors);
      const base = e.message || "Erro ao salvar";
      setError(campos.length > 0 ? `${base} — ${campos.join(" | ")}` : base);
    },
  });

  const senhaHint = initial?.hasPassword
    ? "Deixe em branco para manter a senha atual."
    : "Mínimo 6 caracteres. Será exigida em todo login do banco.";

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={modalBackdrop}
    >
      <div onMouseDown={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.nome}` : "Novo banco"}</h3>

        {/* PASSO 1 — Consulta CNPJ. Escondido em edicao. */}
        {!initial ? (
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              CNPJ do banco
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={cnpjInput}
                onChange={(e) => setCnpjInput(formatCnpj(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarCnpj(); } }}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg-elev)", color: "var(--text)",
                  fontSize: 14, fontFamily: "var(--font-mono)",
                }}
              />
              <Button type="button" onClick={buscarCnpj} disabled={consulta.isPending}>
                {consulta.isPending ? "Buscando…" : "Pesquisar"}
              </Button>
            </div>
            {cnpjError ? <div style={{ color: "var(--danger-500)", fontSize: 12, marginTop: 6 }}>{cnpjError}</div> : null}
            {!cnpjError && !dadosPreenchidos ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                Consulta pública (Receita + Junta Comercial). Preenche razão social, endereço, atividade e telefone automaticamente.
              </div>
            ) : null}
          </div>
        ) : null}

        {/* PASSO 2 — Dados oficiais. Aparece sempre em edicao (mesmo vazio pra
            registros antigos sem o campo salvo). Read-only exceto telefone. */}
        {(dadosPreenchidos || initial) ? (
          <div style={{ padding: 14, background: "var(--bg-elev-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--emerald-500)", textTransform: "uppercase", marginBottom: 4 }}>
              ✓ Dados oficiais preenchidos
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
              Somente leitura — provenientes da Receita/Junta Comercial. Apenas o telefone pode ser editado.
            </div>
            <FormGrid cols={2}>
              <TextField label="Razão social" value={form.razaoSocial ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Nome fantasia" value={form.nomeFantasia ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Data de fundação" value={form.dataFundacao ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Atividade principal" value={form.atividade ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Telefone" value={formatTelefone(form.telefone ?? "")} onChange={(e) => setForm({ ...form, telefone: formatTelefone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} required hint="Obrigatório — editável se o telefone oficial estiver desatualizado" />
              <TextField label="CEP" value={form.endereco?.cep ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Logradouro" value={form.endereco?.logradouro ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Número" value={form.endereco?.numero ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Bairro" value={form.endereco?.bairro ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Município" value={form.endereco?.municipio ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="UF" value={form.endereco?.uf ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
            </FormGrid>
          </div>
        ) : null}

        {/* PASSO 3 — Credenciais de acesso. Email + senha exigidos em todo login. */}
        <div style={{ padding: 14, background: "color-mix(in srgb, var(--accent) 6%, transparent)", borderRadius: 10, border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>
            🔑 Credenciais de acesso do banco
          </div>
          <FormGrid cols={2}>
            <TextField
              label="E-mail de login"
              type="email"
              value={form.loginEmail ?? ""}
              onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
              placeholder="operador@banco.com.br"
              required
              hint="O banco usa este e-mail em /login toda vez que acessa."
              autoComplete="off"
              name="atlas-novo-banco-login-email"
            />
            <PasswordFieldWithToggle
              label={initial?.hasPassword ? "Nova senha (opcional)" : "Senha"}
              value={form.password ?? ""}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder={initial?.hasPassword ? "••••••••" : "min. 6 caracteres"}
              hint={senhaHint}
              required={!initial?.hasPassword}
              autoComplete="new-password"
              name="atlas-novo-banco-senha"
            />
            <TextField
              label="E-mail de contato do responsável"
              type="email"
              value={form.contatoEmail}
              onChange={(e) => setForm({ ...form, contatoEmail: e.target.value })}
              placeholder="responsavel@banco.com.br"
              required
            />
          </FormGrid>
        </div>

        {/* PASSO 4 — Opcoes avancadas (adapter, scopes, mTLS, situacao). */}
        <details open={avancado} onToggle={(e) => setAvancado((e.currentTarget as HTMLDetailsElement).open)}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", userSelect: "none" }}>
            Opções avançadas
          </summary>
          <div style={{ marginTop: 12 }}>
            <FormGrid cols={2}>
              <SelectField
                label="Adapter"
                value={form.adapter}
                onChange={(e) => setForm({ ...form, adapter: e.target.value as AdminBancoInput["adapter"] })}
                options={[
                  { value: "sandbox", label: "Sandbox" },
                  { value: "ifractal", label: "iFractal" },
                ]}
              />
              <SelectField
                label="Situação"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AdminBancoInput["status"] })}
                options={[
                  { value: "ativo", label: "Ativo" },
                  { value: "pausado", label: "Pausado" },
                  { value: "inativo", label: "Inativo" },
                ]}
              />
              <TextField
                label="Scopes (vírgula)"
                value={(form.scopes ?? []).join(",")}
                onChange={(e) => setForm({ ...form, scopes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
              <SelectField
                label="mTLS"
                value={form.mtlsHabilitado ? "1" : "0"}
                onChange={(e) => setForm({ ...form, mtlsHabilitado: e.target.value === "1" })}
                options={[
                  { value: "0", label: "Desabilitado" },
                  { value: "1", label: "Habilitado" },
                ]}
              />
            </FormGrid>
          </div>
        </details>

        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
        {(() => {
          // Aviso so aparece APOS o user clicar Salvar sem preencher tudo.
          if (!triedSubmit) return null;
          const faltando: string[] = [];
          if (!form.nome) faltando.push("razão social (busque o CNPJ)");
          if (!form.telefone) faltando.push("telefone");
          if (!form.loginEmail) faltando.push("e-mail de login");
          if (!form.contatoEmail) faltando.push("e-mail de contato");
          if (!initial?.hasPassword && !form.password) faltando.push("senha");
          if (faltando.length === 0) return null;
          return (
            <div style={{ fontSize: 12, color: "var(--gold-500)", padding: "8px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--gold-500) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--gold-500) 30%, transparent)" }}>
              ⚠ Falta preencher: {faltando.join(", ")}.
            </div>
          );
        })()}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() => {
              const faltando =
                !form.nome
                || !form.loginEmail
                || !form.contatoEmail
                || !form.telefone
                || (!initial?.hasPassword && !form.password);
              if (faltando) {
                setTriedSubmit(true);
                return;
              }
              save.mutate();
            }}
          >
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

/** Modal de confirmacao para zerar a tabela de bancos. Mesma senha do
 *  ADMIN_PURGE_PASSWORD que ja e usada pra /prefeituras/limpar-base. */
function LimparBaseBancosModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const executar = async () => {
    if (!senha) { setErro("Informe a senha."); return; }
    setEnviando(true);
    setErro(null);
    try {
      const r = await atlas.admin.limparBaseBancos(senha);
      alert(`Base zerada. ${r.removidos} banco(s) removido(s).`);
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao limpar base";
      setErro(msg.includes("Senha invalida") ? "Senha incorreta." : msg);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div
      onMouseDown={enviando ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}
      style={modalBackdrop}
    >
      <div onMouseDown={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 460 }}>
        <h3 style={{ margin: 0, color: "var(--danger-500)" }}>⚠ Limpar Base de Bancos</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Esta ação vai <b style={{ color: "var(--danger-500)" }}>remover TODOS os bancos</b> cadastrados. Convênios, contratos e webhooks associados NÃO são apagados neste botão. Ação irreversível.
        </p>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Senha de confirmação <span style={{ color: "var(--danger-500)" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void executar(); } }}
              autoFocus
              placeholder="Digite a senha configurada em .env"
              style={{
                width: "100%", padding: "10px 44px 10px 12px", borderRadius: 8,
                border: "1px solid var(--danger-500)",
                background: "var(--bg-elev)", color: "var(--text)",
                fontSize: 14, boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowSenha((s) => !s)}
              aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                width: 32, height: 32, borderRadius: 6,
                border: "none", background: "transparent",
                color: "var(--text-muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}
            >
              {showSenha ? "🙈" : "👁"}
            </button>
          </div>
        </div>
        {erro ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{erro}</div> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button type="button" onClick={executar} disabled={enviando || !senha}>
            {enviando ? "Removendo…" : "Confirmar e limpar"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
  display: "flex", alignItems: "flex-start", justifyContent: "center",
  padding: "24px 16px", overflowY: "auto",
  zIndex: 100, backdropFilter: "blur(6px)",
};
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 14, padding: 24, maxWidth: 640, width: "calc(100% - 32px)",
  maxHeight: "calc(100vh - 48px)", overflowY: "auto",
  display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)",
  margin: "auto",
};
