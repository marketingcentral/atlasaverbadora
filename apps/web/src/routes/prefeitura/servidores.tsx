import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, CsvImportPanel, DataTable, FilterBar, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraServidor, ServidorCampoConfig } from "@atlas/sdk";
import { Modal, Field, inp, selStyle } from "./_ui";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const VINCULOS = ["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"];
const fmtCpf = (cpf: string) => {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (cpf || "—");
};
const fmtTel = (tel?: string) => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d || "—";
};

// Busca "LIKE PHP" — case-insensitive, sem acento, multi-termo (AND entre
// termos), matcha em TODOS os campos textuais (nome/matricula/cpf/telefone/
// cargo/vinculo/situacao/endereco/email/idConvenio). Se o termo e so digito,
// tambem casa contra a versao so-digitos dos campos (CPF/telefone/matricula
// pra usuario poder digitar "58088" e achar "580.886.363-53").
function stripAccents(s: string): string {
  // Remove diacriticos (combining marks U+0300-U+036F). Usado pra busca
  // funcionar com ou sem acento: "joao" acha "João", "MARIA" acha "Maria".
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function matchServidor(s: PrefeituraServidor, query: string): boolean {
  const q = stripAccents(query.trim().toLowerCase());
  if (!q) return true;
  const termos = q.split(/\s+/).filter(Boolean);
  const camposTxt = stripAccents(`${s.nome} ${s.matricula} ${s.cpf} ${s.cpfMasked} ${s.telefone ?? ""} ${s.cargo ?? ""} ${s.vinculo} ${s.situacaoFuncional} ${s.endereco ?? ""} ${s.email ?? ""} ${s.idConvenio}`.toLowerCase());
  const camposDigits = `${s.matricula} ${s.cpf} ${s.telefone ?? ""}`.replace(/\D/g, "");
  return termos.every((t) => {
    if (camposTxt.includes(t)) return true;
    if (/^\d+$/.test(t) && camposDigits.includes(t)) return true;
    return false;
  });
}

export function PrefeituraServidores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<PrefeituraServidor | null>(null);
  const q = useQuery({ queryKey: ["prefeitura", "servidores"], queryFn: () => atlas.prefeitura.servidores() });

  // Mais recentes primeiro (reverse do array retornado pelo backend, que vem
  // em ordem de insercao/import). Cliente pediu 23/07/2026: "ultima cadastro
  // se torna primeiro na lista mostrando os mais recentes".
  const filtered = (q.data?.servidores ?? [])
    .slice()
    .reverse()
    .filter((s) => matchServidor(s, search));

  const columns: Column<PrefeituraServidor>[] = [
    { key: "nome", header: "Nome" },
    { key: "matricula", header: "Matrícula", mono: true },
    { key: "cpf", header: "CPF", mono: true, render: (s) => fmtCpf(s.cpf) },
    { key: "telefone", header: "Telefone", render: (s) => fmtTel(s.telefone) },
    { key: "cargo", header: "Cargo", render: (s) => s.cargo || "—" },
    { key: "vinculo", header: "Vínculo" },
    { key: "situacaoFuncional", header: "Situação", render: (s) => {
      const situ = (s.situacaoFuncional || "").trim().toUpperCase();
      if (!situ) return <span style={{ color: "var(--text-dim)", fontSize: 12 }}>NÃO INFORMADO</span>;
      const variant: "expirado" | "averbado" | "pendente" =
        /desligado|aposentad/i.test(situ) ? "expirado"
        : /afastad|licenc|ferias/i.test(situ) ? "pendente"
        : "averbado";
      return <Pill variant={variant}>{situ}</Pill>;
    } },
    { key: "idConvenio", header: "Convênio", render: (s) => s.idConvenio || <span style={{ color: "var(--danger-500)" }}>sem convênio</span> },
    { key: "margemDisponivel", header: "Margem disp.", align: "right", render: (s) => (
      <MargemCell
        salario={s.salarioLiquido}
        margemTotal={s.margemTotal ?? 0}
        margemDisponivel={s.margemDisponivel ?? 0}
      />
    ) },
    {
      key: "acoes",
      header: "",
      align: "right",
      render: (s) => (
        <Button size="sm" variant="ghost" onClick={() => setEditing(s)} title={`Editar ${s.nome}`}>
          ✎ Editar
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>Prefeitura</span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Servidores do município</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>A prefeitura é a fonte da base. Campos críticos (cargo, endereço, matrícula) só a prefeitura edita.</p>
        </div>
        <Button onClick={() => setImportOpen((o) => !o)}>{importOpen ? "Fechar importação" : "+ Importar base (CSV)"}</Button>
      </header>

      {importOpen ? (
        <CsvImportPanel
          title="Importar base de servidores"
          columnsHint="nome, cpf, email, telefone, matricula, cargo, vinculo, endereco, codigoIbge, salarioLiquido, idConvenio"
          templateUrl={atlas.prefeitura.servidoresCsvTemplateUrl()}
          onImport={(csv) => atlas.prefeitura.importarServidores(csv)}
          onImported={() => { qc.invalidateQueries({ queryKey: ["prefeitura"] }); }}
        />
      ) : null}

      <FilterBar searchValue={search} onSearchChange={setSearch} onReset={() => setSearch("")} />
      <DataTable columns={columns} rows={filtered} rowKey={(s) => s.matricula} loading={q.isLoading} emptyState="Nenhum servidor. Importe a base via CSV." />

      {editing ? <EditModal servidor={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["prefeitura"] }); }} /> : null}
    </div>
  );
}

/**
 * Celula da coluna "Margem disp." com popover explicando a regra.
 * Hover mostra: base salario liquido, teto 35% (BACEN), quanto ja esta
 * comprometido em contratos ativos e quanto sobra. Cliente pediu 23/07/2026
 * um "recurso de Popovers para informar que esta sendo descontado do
 * salario liquido 35% da margem".
 */
function MargemCell({ salario, margemTotal, margemDisponivel }: { salario: number; margemTotal: number; margemDisponivel: number }) {
  const [aberto, setAberto] = useState(false);
  const comprometido = Math.max(0, margemTotal - margemDisponivel);
  const pctUso = margemTotal > 0 ? Math.round((comprometido / margemTotal) * 100) : 0;
  return (
    <span
      style={{ position: "relative", cursor: "help", display: "inline-flex", alignItems: "center", gap: 4 }}
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
      onFocus={() => setAberto(true)}
      onBlur={() => setAberto(false)}
      tabIndex={0}
    >
      <span>{fmtBRL(margemDisponivel)}</span>
      <span aria-label="Como esta margem é calculada" style={{
        fontSize: 10, color: "var(--text-dim)", border: "1px solid var(--border-strong)", borderRadius: "50%",
        width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
      }}>i</span>
      {aberto ? (
        <span
          role="tooltip"
          style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50,
            background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 8,
            padding: "10px 12px", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            minWidth: 260, fontSize: 12, color: "var(--text)", textAlign: "left",
            fontWeight: 400,
          }}
        >
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)", fontWeight: 700, marginBottom: 6 }}>
            Como calcula
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px" }}>
            <span style={{ color: "var(--text-muted)" }}>Salário líquido</span>
            <b style={{ fontFamily: "var(--font-mono)" }}>{fmtBRL(salario)}</b>
            <span style={{ color: "var(--text-muted)" }}>× 35% (teto BACEN empréstimo)</span>
            <b style={{ fontFamily: "var(--font-mono)" }}>{fmtBRL(margemTotal)}</b>
            <span style={{ color: "var(--text-muted)" }}>− contratos ativos</span>
            <b style={{ fontFamily: "var(--font-mono)", color: "var(--danger-500)" }}>−{fmtBRL(comprometido)}</b>
            <span style={{ fontWeight: 700, borderTop: "1px solid var(--border-strong)", paddingTop: 4 }}>Disponível</span>
            <b style={{ fontFamily: "var(--font-mono)", color: "var(--emerald-500)", borderTop: "1px solid var(--border-strong)", paddingTop: 4 }}>{fmtBRL(margemDisponivel)}</b>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)" }}>
            Uso atual: <b style={{ color: pctUso >= 90 ? "var(--danger-500)" : pctUso >= 70 ? "var(--gold-500)" : "var(--text)" }}>{pctUso}%</b>. Cartão consignado e cartão benefício têm buckets próprios (5%+5%), não descontam desta.
          </div>
        </span>
      ) : null}
    </span>
  );
}

// Fallback quando o backend nao retornar config (isolate frio, endpoint 404,
// etc). Cobre os mesmos campos SISTEMA que existiam antes da tela dinamica.
const CAMPOS_FALLBACK: ServidorCampoConfig[] = [
  { key: "cpf", label: "CPF", tipo: "texto", obrigatorio: true, visivel: true, ordem: 0, sistema: true, travado: true },
  { key: "matricula", label: "Matrícula", tipo: "texto", obrigatorio: true, visivel: true, ordem: 1, sistema: true, travado: true },
  { key: "nome", label: "Nome", tipo: "texto", obrigatorio: true, visivel: true, ordem: 2, sistema: true },
  { key: "email", label: "E-mail", tipo: "email", obrigatorio: false, visivel: true, ordem: 3, sistema: true },
  { key: "telefone", label: "Telefone", tipo: "telefone", obrigatorio: false, visivel: true, ordem: 4, sistema: true },
  { key: "cargo", label: "Cargo", tipo: "texto", obrigatorio: false, visivel: true, ordem: 5, sistema: true },
  { key: "vinculo", label: "Vínculo", tipo: "texto", obrigatorio: false, visivel: true, ordem: 6, sistema: true },
  { key: "endereco", label: "Endereço", tipo: "texto", obrigatorio: false, visivel: true, ordem: 7, sistema: true },
];

/** Sistema fields que o backend /editar-servidor aceita hoje. Campos fora
 *  desta lista (customs, dataAdmissao etc) sao exibidos read-only ate o
 *  backend expor um caminho pra persistir. */
const CAMPOS_EDITAVEIS = new Set(["nome", "cpf", "matricula", "cargo", "endereco", "vinculo", "email", "telefone"]);

function EditModal({ servidor, onClose, onSaved }: { servidor: PrefeituraServidor; onClose: () => void; onSaved: () => void }) {
  const cfgQ = useQuery({
    queryKey: ["prefeitura", "servidor-campos-config"],
    queryFn: () => atlas.prefeitura.getServidorCamposConfig(),
    staleTime: 60_000,
  });
  const campos = (cfgQ.data?.config?.campos ?? CAMPOS_FALLBACK)
    .filter((c) => c.visivel)
    .sort((a, b) => a.ordem - b.ordem);

  // Um state por campo. Chaves sistema conhecidas carregam do PrefeituraServidor;
  // resto (customs) comeca vazio ate o backend expor no shape.
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const src = servidor as unknown as Record<string, unknown>;
    for (const c of CAMPOS_FALLBACK) {
      const v = src[c.key];
      initial[c.key] = typeof v === "string" ? v : v == null ? "" : String(v);
    }
    initial.matricula = servidor.matricula;
    return initial;
  });
  const setV = (k: string, v: string) => setValores((prev) => ({ ...prev, [k]: v }));

  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      // Valida obrigatorios ANTES de bater no backend — feedback imediato.
      for (const c of campos) {
        if (!c.obrigatorio) continue;
        if (!CAMPOS_EDITAVEIS.has(c.key)) continue;
        if (!(valores[c.key] ?? "").trim()) throw new Error(`Campo "${c.label}" é obrigatório.`);
      }
      const cpfNovo = (valores.cpf ?? "").trim();
      const matNova = (valores.matricula ?? "").trim();
      return atlas.prefeitura.editarServidor(servidor.matricula, {
        nome: valores.nome,
        cargo: valores.cargo,
        endereco: valores.endereco,
        vinculo: valores.vinculo,
        email: valores.email,
        telefone: valores.telefone,
        ...(cpfNovo.replace(/\D/g, "") !== (servidor.cpf ?? "").replace(/\D/g, "") ? { cpf: cpfNovo } : {}),
        ...(matNova !== servidor.matricula ? { matriculaNova: matNova } : {}),
      });
    },
    onSuccess: () => { setErroValidacao(null); onSaved(); },
    onError: (e: Error) => setErroValidacao(e.message),
  });

  const renderInput = (c: ServidorCampoConfig) => {
    const val = valores[c.key] ?? "";
    const readOnly = !CAMPOS_EDITAVEIS.has(c.key) || c.travado === true;
    if (c.key === "vinculo") {
      return (
        <select style={selStyle} value={val} onChange={(e) => setV(c.key, e.target.value)} disabled={readOnly}>
          {!VINCULOS.includes(val) && val ? <option value={val}>{val}</option> : null}
          {VINCULOS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      );
    }
    const placeholder = c.key === "cpf" ? "000.000.000-00"
      : c.key === "telefone" ? "(00) 00000-0000"
      : c.tipo === "email" ? "email@dominio.com"
      : c.tipo === "moeda" ? "0,00"
      : c.tipo === "numero" ? "0"
      : "";
    const inputMode = c.tipo === "numero" || c.tipo === "moeda" || c.key === "cpf" || c.key === "telefone" ? "numeric" as const
      : c.tipo === "email" ? "email" as const
      : undefined;
    const type = c.tipo === "data" ? "date" : "text";
    return (
      <input
        style={{ ...inp, opacity: readOnly ? 0.7 : 1 }}
        value={val}
        onChange={(e) => setV(c.key, e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        type={type}
        readOnly={readOnly}
        aria-readonly={readOnly}
      />
    );
  };

  return (
    <Modal title={`Editar servidor — ${servidor.matricula}`} onClose={onClose}>
      {cfgQ.isPending ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Carregando campos configurados…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {campos.map((c) => (
            <Field
              key={c.key}
              lbl={c.label}
              required={c.obrigatorio}
              hint={c.key === "matricula" ? "Alterar remapeia o servidor" : !CAMPOS_EDITAVEIS.has(c.key) ? "Somente leitura" : undefined}
            >
              {renderInput(c)}
            </Field>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || cfgQ.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
      </div>
      {erroValidacao || save.isError ? (
        <p style={{ color: "var(--danger-500)", marginTop: 12, fontSize: 13 }}>
          {erroValidacao ?? (save.error as Error | undefined)?.message}
        </p>
      ) : null}
    </Modal>
  );
}
