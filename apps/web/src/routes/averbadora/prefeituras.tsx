import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  CsvImportPanel,
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

  const columns: Column<AdminPrefeitura>[] = [
    { key: "status", header: "Situação", render: (p) => <Pill variant={p.status === "ativo" ? "averbado" : p.status === "inativo" ? "expirado" : "pendente"}>{p.status}</Pill> },
    { key: "nome", header: "Prefeitura", render: (p) => `${p.nome}/${p.uf}` },
    { key: "modoIntegracao", header: "Integração" },
    {
      key: "acesso",
      header: "Acesso /login",
      render: (p) =>
        p.loginEmail && p.hasPassword ? (
          <span style={{ color: "var(--emerald-500)" }}>{p.loginEmail}</span>
        ) : p.loginEmail ? (
          <span style={{ color: "var(--danger-500)" }} title="Login cadastrado mas sem senha">{p.loginEmail} (sem senha)</span>
        ) : (
          <span style={{ color: "var(--text-dim)" }}>—</span>
        ),
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
        <Button onClick={() => setEditing("new")}>+ Adicionar prefeitura</Button>
      </header>

      <CsvImportPanel
        title="Importar prefeituras"
        columnsHint="Colunas: nome, uf, municipioIbge, modoIntegracao (REST|SOAP|CSV|MANUAL), status, loginEmail, password (min 6)"
        templateUrl={atlas.admin.csvTemplateUrl("prefeituras")}
        onImport={async (csv) => atlas.admin.importCsv("prefeituras", csv)}
        onImported={() => qc.invalidateQueries({ queryKey: ["admin", "prefeituras"] })}
      />

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
    </div>
  );
}

function formatCnpj(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length !== 14) return raw;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
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
  label, value, onChange, placeholder, hint, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
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
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });

  const senhaHint = initial?.hasPassword
    ? "Deixe em branco para manter a senha atual."
    : "Mínimo 6 caracteres. Será exigida em todo login da prefeitura.";

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <h3 style={{ margin: 0 }}>{initial ? `Editar ${initial.nome}/${initial.uf}` : "Nova prefeitura"}</h3>

        {/* PASSO 1 — Consulta CNPJ. Prefill de todos os campos oficiais via
            BrasilAPI (base publica que agrega Receita Federal + Junta Comercial). */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            CNPJ da prefeitura
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={cnpjInput}
              onChange={(e) => setCnpjInput(e.target.value)}
              onBlur={() => setCnpjInput((v) => formatCnpj(v))}
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

        {/* PASSO 2 — Dados oficiais (mostrados só depois da consulta ou em edição).
            Todos read-only exceto telefone — os dados vem da Receita/Junta Comercial
            e sao a fonte da verdade. Se precisar corrigir algo (exceto telefone),
            atualize la e refaca a consulta. */}
        {dadosPreenchidos ? (
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
              <TextField label="Telefone" value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" required hint="Obrigatório — editável se o telefone oficial estiver desatualizado" />
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
            />
            <PasswordFieldWithToggle
              label={initial?.hasPassword ? "Nova senha (opcional)" : "Senha"}
              value={form.password ?? ""}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder={initial?.hasPassword ? "••••••••" : "min. 6 caracteres"}
              hint={senhaHint}
              required={!initial?.hasPassword}
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
          // Validacao unificada — mostra o motivo do botao Salvar ficar desabilitado
          // pra o usuario nao ficar adivinhando o que falta.
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
            disabled={
              save.isPending
              || !form.nome
              || !form.loginEmail
              || (!initial?.hasPassword && !form.password)
              || !form.telefone
              || !form.municipioIbge
              || form.municipioIbge <= 0
            }
            onClick={() => save.mutate()}
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
