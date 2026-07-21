import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DataTable,
  FormActions,
  FormGrid,
  IconButton,
  NumberField,
  Pill,
  SelectField,
  TextField,
  type Column,
} from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { AdminPrefeitura, AdminPrefeituraInput } from "@atlas/sdk";
export function AdminPrefeituras() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const sync = useMutation({
    mutationFn: (id: number) => atlas.admin.sincronizarPrefeitura(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] });
      const res = r.resultado;
      if (res.erro) alert(`Sincronizacao com aviso:\n${res.erro}`);
      else alert(`Sincronizado: ${res.novos} novos, ${res.atualizados} atualizados.`);
    },
    onError: (err) => alert(err instanceof Error ? err.message : "Falha ao sincronizar"),
  });
  // Nunca exclui — desativa/reativa (status). Reversível, sem perda de dados.
  const toggleAtivo = useMutation({
    mutationFn: (p: AdminPrefeitura) => atlas.admin.upsertPrefeitura({
      id: p.id, nome: p.nome, uf: p.uf, municipioIbge: p.municipioIbge,
      modoIntegracao: p.modoIntegracao, status: p.status === "inativo" ? "ativo" : "inativo",
      loginEmail: p.loginEmail, servidoresCount: p.servidoresCount,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] }),
  });
  const [editing, setEditing] = useState<AdminPrefeitura | "new" | null>(null);
  const [limparAberto, setLimparAberto] = useState(false);

  // Colunas espelham os campos do CSV exemplo (nome, uf, municipioIbge,
  // modoIntegracao, status, loginEmail) + campos extras uteis do fluxo de
  // cadastro por CNPJ (CNPJ, Telefone, contadores operacionais).
  const columns: Column<AdminPrefeitura>[] = [
    { key: "status", header: "Situação", render: (p) => <Pill variant={p.status === "ativo" ? "averbado" : p.status === "inativo" ? "expirado" : "pendente"}>{p.status}</Pill> },
    { key: "nome", header: "Nome" },
    { key: "uf", header: "UF", mono: true },
    {
      key: "municipioIbge",
      header: "Código IBGE",
      mono: true,
      render: (p) => p.municipioIbge > 0 ? p.municipioIbge : <span style={{ color: "var(--danger-500)" }}>—</span>,
    },
    {
      key: "cnpj",
      header: "CNPJ",
      mono: true,
      render: (p) => p.cnpj ? formatCnpj(p.cnpj) : <span style={{ color: "var(--text-dim)" }}>—</span>,
    },
    { key: "modoIntegracao", header: "Integração" },
    {
      key: "acesso",
      header: "Login",
      render: (p) => p.loginEmail
        ? <span style={{ color: "var(--emerald-500)" }}>{p.loginEmail}</span>
        : <span style={{ color: "var(--text-dim)" }}>—</span>,
    },
    {
      key: "senha",
      header: "Senha",
      render: (p) => p.hasPassword
        ? <span style={{ color: "var(--emerald-500)" }} title="Senha configurada">✓ cadastrada</span>
        : <span style={{ color: "var(--danger-500)" }} title="Sem senha — login nao funciona">— não configurada</span>,
    },
    {
      key: "telefone",
      header: "Telefone",
      render: (p) => p.telefone || <span style={{ color: "var(--text-dim)" }}>—</span>,
    },
    { key: "servidoresCount", header: "Servidores", align: "right", render: (p) => p.servidoresCount.toLocaleString("pt-BR") },
    {
      key: "ultimaSincronizacao",
      header: "Última sync",
      render: (p) => (p.ultimaSincronizacao ? new Date(p.ultimaSincronizacao).toLocaleString("pt-BR") : "—"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Prefeituras afiliadas</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Botao "Limpar Base" removido — operacao destrutiva demais pra
              expor no header. Continua acessivel via /averbadora/manutencao
              (permissao manutencao) ou POST direto na API. */}
          <Button onClick={() => setEditing("new")}>+ Adicionar prefeitura</Button>
        </div>
      </header>

      {/* CsvImportPanel removido a pedido do cliente (17/07/2026) — cadastro
          agora e SEMPRE via CNPJ (BrasilAPI + fallback), com dados oficiais
          da Receita/Junta Comercial. CSV import criava prefeituras placeholder
          "Palhoca/Joinville" quando importado sem editar. */}

      <DataTable
        columns={columns}
        rows={data.data?.prefeituras ?? []}
        rowKey={(p) => String(p.id)}
        loading={data.isLoading}
        actions={(p) => (
          <>
            <IconButton title="Editar" onClick={() => setEditing(p)}>✎</IconButton>
            <IconButton title="Sincronizar folha" onClick={() => sync.mutate(p.id)}>↻</IconButton>
            {p.status === "inativo" ? (
              <IconButton title="Reativar" onClick={() => toggleAtivo.mutate(p)}>▶</IconButton>
            ) : (
              <IconButton danger title="Desativar" onClick={() => { if (confirm(`Desativar a prefeitura "${p.nome}"?\n\nEla para de operar, mas os dados não são apagados — você pode reativar depois.`)) toggleAtivo.mutate(p); }}>⏸</IconButton>
            )}
          </>
        )}
      />

      {editing ? <PrefeituraModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {limparAberto ? <LimparBaseModal onClose={() => setLimparAberto(false)} onDone={() => { setLimparAberto(false); qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] }); }} /> : null}
    </div>
  );
}

// Formata CNPJ progressivamente. Aplica os pontos/barras/hifen conforme o
// usuario digita — nao espera atingir 14 digitos pra mascarar. Aceita input
// parcial (usado no onChange do input) e completo (usado na tabela).
function formatCnpj(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Formata telefone BR progressivamente. Limita a 11 digitos (celular com DDD).
// Fixo (10 digitos): (XX) XXXX-XXXX. Celular (11 digitos): (XX) XXXXX-XXXX.
function formatTelefone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Estilo aplicado nos campos "read-only" (dados oficiais do CNPJ). Deixa claro
// visualmente que o operador nao deve alterar — cor cinza + cursor bloqueado
// + fundo mais escuro. Copia/paste continua funcionando (readOnly, nao disabled).
const readOnlyInputStyle: React.CSSProperties = {
  background: "var(--bg-elev-2)",
  color: "var(--text-muted)",
  cursor: "not-allowed",
};

/** Input de senha com toggle de visualizacao (olho). Mantem semantica HTML
 *  correta: type=password por padrao, alterna pra text ao clicar no botao. */
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

function PrefeituraModal({ initial, onClose }: { initial: AdminPrefeitura | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AdminPrefeituraInput>({
    id: initial?.id,
    nome: initial?.nome ?? "",
    uf: initial?.uf ?? "SC",
    municipioIbge: initial?.municipioIbge ?? 0,
    modoIntegracao: initial?.modoIntegracao ?? "REST",
    status: initial?.status ?? "ativo",
    loginEmail: initial?.loginEmail ?? "",
    contatoEmail: initial?.contatoEmail ?? "",
    password: "",
    servidoresCount: initial?.servidoresCount ?? 0,
    folhaSincUrl: initial?.folhaSincUrl ?? "",
    permiteServidorEditarContato: initial?.permiteServidorEditarContato ?? false,
    exclusividadesCartaoConsig: initial?.exclusividadesCartaoConsig ?? "",
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
  // Antes: aparecia assim que o modal abria, poluindo a UI (cliente 21/07/2026).
  const [triedSubmit, setTriedSubmit] = useState(false);
  // Consulta CNPJ — BrasilAPI (Receita + Junta Comercial). Prefill do form.
  const consulta = useMutation({
    mutationFn: (cnpj: string) => atlas.admin.consultarCnpjPrefeitura(cnpj),
    onMutate: () => setCnpjError(null),
    onSuccess: (r) => {
      const d = r.dados;
      setForm((prev) => ({
        ...prev,
        cnpj: (d.cnpj as string | undefined) ?? cnpjInput.replace(/\D/g, ""),
        nome: (d.razao_social as string | undefined) ?? prev.nome,
        razaoSocial: (d.razao_social as string | undefined) ?? "",
        nomeFantasia: (d.nome_fantasia as string | undefined) ?? "",
        dataFundacao: (d.data_inicio_atividade as string | undefined) ?? "",
        atividade: (d.cnae_fiscal_descricao as string | undefined) ?? "",
        telefone: (d.ddd_telefone_1 as string | undefined) ?? "",
        uf: ((d.uf as string | undefined) ?? prev.uf).slice(0, 2).toUpperCase(),
        municipioIbge: (d.codigo_municipio_ibge as number | undefined) ?? prev.municipioIbge,
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
      // Backend retorna 400 com details.cnpj = mensagem detalhada; fallback
      // pra err.message se nao vier no shape esperado.
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
      const payload: AdminPrefeituraInput = { ...form };
      if (!payload.loginEmail) delete payload.loginEmail;
      if (!payload.contatoEmail) delete payload.contatoEmail;
      if (!payload.password) delete payload.password;
      if (!payload.folhaSincUrl) delete payload.folhaSincUrl;
      if (!payload.cnpj) delete payload.cnpj;
      return atlas.admin.upsertPrefeitura(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] });
      onClose();
    },
    onError: (err) => {
      // Backend retorna 400 com details.fieldErrors[campo] = mensagem. Expande
      // pra mostrar CAMPO+MOTIVO ao inves de so "Dados invalidos" generico.
      const e = err as { message?: string; details?: Record<string, unknown> };
      const det = e.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
      const campos: string[] = [];
      if (det?.fieldErrors) {
        for (const [k, msgs] of Object.entries(det.fieldErrors)) {
          if (msgs?.length) campos.push(`${k}: ${msgs.join(", ")}`);
        }
      }
      // Erros no nivel raiz (ex.: loginEmail ja em uso vem em details.loginEmail direto)
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
    : "Mínimo 6 caracteres. Será exigida em todo login da prefeitura.";

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={modalBackdrop}
    >
      <div onMouseDown={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.nome}/${initial.uf}` : "Nova prefeitura"}</h3>

        {/* PASSO 1 — Consulta CNPJ. Prefill de todos os campos oficiais via
            BrasilAPI (base publica que agrega Receita Federal + Junta Comercial).
            Escondido em modo edicao — CNPJ ja esta persistido no cadastro
            original. Se precisar rebuscar (dados oficiais mudaram), edite o
            CNPJ direto no PG e recarregue. */}
        {!initial ? (
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              CNPJ da prefeitura
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
                Consulta pública (Receita + Junta Comercial). Preenche razão social, endereço, atividade e código IBGE automaticamente.
              </div>
            ) : null}
          </div>
        ) : null}

        {/* PASSO 2 — Dados oficiais. Aparece:
            - No cadastro: apos consulta CNPJ bem-sucedida (dadosPreenchidos=true)
            - Em edicao: SEMPRE (mesmo se vazios — cadastros antigos nao tinham
              o campo salvo; permite pelo menos editar telefone) */}
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
              <TextField label="UF" value={form.uf} readOnly style={readOnlyInputStyle} onChange={() => undefined} required />
              <NumberField
                label="Código IBGE"
                value={form.municipioIbge}
                readOnly
                style={readOnlyInputStyle}
                onChange={() => undefined}
                hint={form.municipioIbge > 0 ? undefined : "⚠ Não preenchido — refaça a busca por CNPJ antes de salvar"}
                error={form.municipioIbge > 0 ? undefined : "Código IBGE é obrigatório"}
              />
              <TextField label="Telefone" value={formatTelefone(form.telefone ?? "")} onChange={(e) => setForm({ ...form, telefone: formatTelefone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} required hint="Obrigatório — editável se o telefone oficial estiver desatualizado" />
              <TextField label="CEP" value={form.endereco?.cep ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Logradouro" value={form.endereco?.logradouro ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Número" value={form.endereco?.numero ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Bairro" value={form.endereco?.bairro ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
              <TextField label="Município" value={form.endereco?.municipio ?? ""} readOnly style={readOnlyInputStyle} onChange={() => undefined} />
            </FormGrid>
          </div>
        ) : null}

        {/* PASSO 3 — Credenciais de acesso da prefeitura. Email + senha
            exigidos em todo login (via /login universal). */}
        <div style={{ padding: 14, background: "color-mix(in srgb, var(--accent) 6%, transparent)", borderRadius: 10, border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 10 }}>
            🔑 Credenciais de acesso da prefeitura
          </div>
          <FormGrid cols={2}>
            <TextField
              label="E-mail de login"
              type="email"
              value={form.loginEmail ?? ""}
              onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
              placeholder="rh@prefeitura.gov.br"
              required
              hint="A prefeitura usa este e-mail em /login toda vez que acessa."
              // Evita Chrome autofill (com CPF do login) — nome unico +
              // autoComplete off (cliente 21/07/2026: nao vazar credencial anterior).
              autoComplete="off"
              name="atlas-nova-prefeitura-login-email"
            />
            <PasswordFieldWithToggle
              label={initial?.hasPassword ? "Nova senha (opcional)" : "Senha"}
              value={form.password ?? ""}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder={initial?.hasPassword ? "••••••••" : "min. 6 caracteres"}
              hint={senhaHint}
              required={!initial?.hasPassword}
              autoComplete="new-password"
              name="atlas-nova-prefeitura-senha"
            />
          </FormGrid>
        </div>

        {/* PASSO 4 — Opções avançadas (colapsadas). Preservam funcionalidade
            legada de integracao/folha/exclusividades sem poluir o novo fluxo. */}
        <details open={avancado} onToggle={(e) => setAvancado((e.currentTarget as HTMLDetailsElement).open)}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", userSelect: "none" }}>
            Opções avançadas
          </summary>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <FormGrid cols={2}>
              <SelectField
                label="Modo de integração"
                value={form.modoIntegracao}
                onChange={(e) => setForm({ ...form, modoIntegracao: e.target.value as AdminPrefeituraInput["modoIntegracao"] })}
                options={[
                  { value: "REST", label: "REST" },
                  { value: "SOAP", label: "SOAP" },
                  { value: "CSV", label: "CSV" },
                  { value: "MANUAL", label: "MANUAL" },
                ]}
              />
              <SelectField
                label="Situação"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AdminPrefeituraInput["status"] })}
                options={[
                  { value: "ativo", label: "Ativo" },
                  { value: "pausado", label: "Pausado" },
                ]}
              />
              <TextField
                label="E-mail de contato do responsável"
                type="email"
                value={form.contatoEmail ?? ""}
                onChange={(e) => setForm({ ...form, contatoEmail: e.target.value })}
                placeholder="responsavel@prefeitura.gov.br"
              />
              <NumberField label="Servidores cadastrados" value={form.servidoresCount} onChange={(e) => setForm({ ...form, servidoresCount: Number(e.target.value) })} />
              <TextField
                label="URL do CSV da folha (modo CSV)"
                value={form.folhaSincUrl ?? ""}
                onChange={(e) => setForm({ ...form, folhaSincUrl: e.target.value })}
                placeholder="https://prefeitura.gov.br/folha.csv"
              />
            </FormGrid>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.permiteServidorEditarContato ?? false}
                onChange={(e) => setForm({ ...form, permiteServidorEditarContato: e.target.checked })}
                style={{ marginTop: 3 }}
              />
              <span>
                <b style={{ color: "var(--text)" }}>Permitir que servidores editem contato pelo app</b>
                <br />
                Se ligado, o servidor pode alterar e-mail e telefone em Meus dados. Se desligado, mostra somente-leitura.
              </span>
            </label>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Exclusividades do Cartão Consignado (opcional)
              </label>
              <textarea
                value={form.exclusividadesCartaoConsig ?? ""}
                onChange={(e) => setForm({ ...form, exclusividadesCartaoConsig: e.target.value })}
                placeholder="Ex.: Cartão Elo Consignado com 1,5% a.m. exclusivo."
                maxLength={500}
                rows={3}
                style={{
                  width: "100%", padding: 10, borderRadius: 8,
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg-elev)", color: "var(--text)",
                  fontSize: 13, resize: "vertical", fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </details>

        {error ? <div style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</div> : null}
        {(() => {
          // Aviso so aparece APOS o user clicar Salvar sem preencher tudo.
          if (!triedSubmit) return null;
          const faltando: string[] = [];
          if (!form.nome) faltando.push("razão social (busque o CNPJ)");
          if (!form.municipioIbge || form.municipioIbge <= 0) faltando.push("código IBGE (refaça a busca do CNPJ)");
          if (!form.telefone) faltando.push("telefone");
          if (!form.loginEmail) faltando.push("e-mail de login");
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
              // Validacao: se algo faltar, marca triedSubmit e nao dispara save.
              const faltando =
                !form.nome
                || !form.loginEmail
                || (!initial?.hasPassword && !form.password)
                || !form.telefone
                || !form.municipioIbge
                || form.municipioIbge <= 0;
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

// Backdrop cobre a viewport toda. overflow-y no proprio backdrop garante que
// modal maior que a tela role NELE (nao no body de tras). padding vertical
// evita que o modal cole nas bordas quando ocupa a altura maxima.
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(10,22,40,.6)",
  display: "flex", alignItems: "flex-start", justifyContent: "center",
  padding: "24px 16px", overflowY: "auto",
  zIndex: 100, backdropFilter: "blur(6px)",
};
// maxHeight impede o card de exceder a viewport; overflowY:auto faz o proprio
// card rolar quando o conteudo passa (fluxo CNPJ + dados + credenciais +
// opcoes avancadas fica alto num modal so).
const modalCard: React.CSSProperties = {
  background: "var(--bg-elev)", border: "1px solid var(--border-strong)",
  borderRadius: 14, padding: 24, maxWidth: 640, width: "calc(100% - 32px)",
  maxHeight: "calc(100vh - 48px)", overflowY: "auto",
  display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)",
  margin: "auto",
};

/** Modal de confirmacao para zerar a tabela de prefeituras. Exige senha
 *  compartilhada configurada em env (ADMIN_PURGE_PASSWORD). Backend
 *  valida — front so passa a senha digitada. */
function LimparBaseModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const executar = async () => {
    if (!senha) { setErro("Informe a senha."); return; }
    setEnviando(true);
    setErro(null);
    try {
      const r = await atlas.admin.limparBasePrefeituras(senha);
      alert(`Base zerada. ${r.removidas} prefeitura(s) removida(s).`);
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
        <h3 style={{ margin: 0, color: "var(--danger-500)" }}>⚠ Limpar Base de Prefeituras</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Esta ação vai <b style={{ color: "var(--danger-500)" }}>remover TODAS as prefeituras</b> cadastradas. Convênios, folhas e servidores associados NÃO são apagados neste botão — só a tabela de prefeituras. Ação irreversível.
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
