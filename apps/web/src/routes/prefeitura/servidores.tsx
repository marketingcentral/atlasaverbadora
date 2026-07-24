import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, CpfField, CsvImportPanel, CurrencyField, DataTable, FilterBar, FormGrid, NumberField, Pill, SelectField, TelefoneField, TextField, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraServidor, ServidorCampoConfig } from "@atlas/sdk";
import { matchAnyKeys } from "../../lib/text-search";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
// VINCULOS constante removida — modal dinamico usa VINCULO_OPTS ({value,label}).
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

// Busca via matchAny (lib/text-search) — fonte unica compartilhada com todas
// as outras telas do sistema.

export function PrefeituraServidores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<PrefeituraServidor | null>(null);
  const q = useQuery({ queryKey: ["prefeitura", "servidores"], queryFn: () => atlas.prefeitura.servidores() });
  // Config de campos que a averbadora definiu pra esta prefeitura — dita o
  // cabecalho do CSV (download + hint). Cliente pediu 24/07/2026.
  //  - staleTime alto: config muda raramente (averbadora edita "as vezes")
  //  - retry 1: se falhar por 1s de blip, tenta 1x; senao cai no fallback
  //  - refetchOnWindowFocus false: nao repete request cada vez que a aba volta
  const camposQ = useQuery({
    queryKey: ["prefeitura", "servidores-campos"],
    queryFn: () => atlas.prefeitura.servidorCamposConfig(),
    staleTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const camposVisiveis = (camposQ.data?.campos ?? [])
    .filter((c) => c.visivel)
    .sort((a, b) => a.ordem - b.ordem);
  // Header do CSV = keys visiveis (custom_ sem prefixo), na ordem configurada.
  const colunasCsv = camposVisiveis
    .map((c) => (c.key.startsWith("custom_") ? c.key.slice("custom_".length) : c.key))
    .join(", ");
  // Fallback minimo: se o endpoint falhar OU nao tem config, mostra as
  // colunas built-in obrigatorias em vez de "carregando..." infinito. Assim
  // a prefeitura consegue baixar/importar mesmo se a averbadora nao tiver
  // configurado nada ainda (o endpoint publico do CSV ja cai no default).
  const HINT_FALLBACK = "nome, cpf, matricula, email, telefone, cargo, vinculo, situacaoFuncional, salarioLiquido, idConvenio";
  const hintCarregando = camposQ.isPending;
  const columnsHint = colunasCsv || (hintCarregando ? "Carregando campos configurados pela averbadora…" : HINT_FALLBACK);

  // Busca RESTRITA a nome, matricula e CPF (cliente 23/07/2026). Antes usava
  // matchAny (todos os campos), o que trazia os numeros de margem/IBGE/salario
  // pra dentro da busca e gerava falso-positivo em pesquisa so-numerica. cpf +
  // cpfMasked cobrem CPF com e sem pontuacao. Ordem da tabela vem do backend.
  const filtered = (q.data?.servidores ?? [])
    .filter((s) => matchAnyKeys(s, search, ["nome", "matricula", "cpf", "cpfMasked"]));

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
          columnsHint={columnsHint}
          templateUrl={atlas.prefeitura.servidoresCsvTemplateUrl(camposQ.data?.prefeituraId)}
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
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  // Posicao FIXA (viewport) calculada a partir do "i" — o popover e' renderizado
  // via portal no <body>, FORA da tabela. A tabela tem overflow-x:auto (scroll
  // horizontal) que, por spec CSS, tambem recorta o eixo Y — entao um popover
  // absolute dentro da celula ficava CORTADO (cliente reportou 24/07/2026, o
  // "abrir pra cima" nao resolvia porque quem corta e' o container, nao a
  // janela). Com portal + position:fixed ele escapa do recorte.
  const [coords, setCoords] = useState<{ top: number; right: number; acima: boolean } | null>(null);
  const comprometido = Math.max(0, margemTotal - margemDisponivel);
  const pctUso = margemTotal > 0 ? Math.round((comprometido / margemTotal) * 100) : 0;
  const abrir = () => {
    const el = wrapRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const acima = window.innerHeight - rect.bottom < 220; // ~200px de altura
      setCoords({
        top: acima ? rect.top - 6 : rect.bottom + 6,
        right: window.innerWidth - rect.right,
        acima,
      });
    }
    setAberto(true);
  };
  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", cursor: "help", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, whiteSpace: "nowrap" }}
      onMouseEnter={abrir}
      onMouseLeave={() => setAberto(false)}
      onFocus={abrir}
      onBlur={() => setAberto(false)}
      tabIndex={0}
    >
      <span>{fmtBRL(margemDisponivel)}</span>
      <span aria-label="Como esta margem é calculada" style={{
        fontSize: 10, color: "var(--text-dim)", border: "1px solid var(--border-strong)", borderRadius: "50%",
        width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
        flexShrink: 0,
      }}>i</span>
      {aberto && coords ? createPortal(
        <span
          role="tooltip"
          style={{
            position: "fixed", right: coords.right,
            ...(coords.acima ? { bottom: window.innerHeight - coords.top } : { top: coords.top }),
            zIndex: 1000, pointerEvents: "none",
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
        </span>,
        document.body,
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

/** Sistema fields que o backend PATCH aceita persistir. Custom fields
 *  (nao-sistema) tambem sao editaveis — vao no payload camposCustom. */
const CAMPOS_EDITAVEIS = new Set([
  "nome", "cpf", "matricula", "cargo", "endereco", "vinculo", "email",
  "telefone", "codigoIbge", "salarioLiquido", "situacaoFuncional",
  "idConvenio", "dataAdmissao", "dataNascimento",
]);
function ehEditavel(c: ServidorCampoConfig): boolean {
  if (c.travado === true) return false;
  if (CAMPOS_EDITAVEIS.has(c.key)) return true;
  return c.sistema === false; // custom field
}

const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 };
const modalStyle: React.CSSProperties = { background: "var(--surface-solid)", borderRadius: 12, padding: 24, maxWidth: 720, width: "100%", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto" };

const VINCULO_OPTS = [
  { value: "ESTATUTARIO", label: "Estatutário" },
  { value: "CLT", label: "CLT" },
  { value: "COMISSIONADO", label: "Comissionado" },
  { value: "APOSENTADO", label: "Aposentado" },
  { value: "PENSIONISTA", label: "Pensionista" },
];

function EditModal({ servidor, onClose, onSaved }: { servidor: PrefeituraServidor; onClose: () => void; onSaved: () => void }) {
  const cfgQ = useQuery({
    queryKey: ["prefeitura", "servidor-campos-config"],
    queryFn: () => atlas.prefeitura.getServidorCamposConfig(),
    staleTime: 60_000,
  });
  const campos = (cfgQ.data?.config?.campos ?? CAMPOS_FALLBACK)
    .filter((c) => c.visivel)
    .sort((a, b) => a.ordem - b.ordem);

  const [valores, setValores] = useState<Record<string, string | number>>(() => {
    const src = servidor as unknown as Record<string, unknown>;
    const out: Record<string, string | number> = {};
    const keys = ["nome","cpf","matricula","vinculo","situacaoFuncional","salarioLiquido","idConvenio","cargo","endereco","email","telefone","codigoIbge","dataAdmissao","dataNascimento"];
    for (const k of keys) {
      const v = src[k];
      if (typeof v === "number" || typeof v === "string") out[k] = v;
      else out[k] = "";
    }
    out.matricula = servidor.matricula;
    return out;
  });
  const setV = (k: string, v: string | number) => setValores((prev) => ({ ...prev, [k]: v }));

  const [erro, setErro] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      for (const c of campos) {
        if (!c.obrigatorio) continue;
        if (!CAMPOS_EDITAVEIS.has(c.key)) continue;
        const v = valores[c.key];
        const vazio = v == null || (typeof v === "string" && !v.trim()) || (c.tipo === "moeda" && Number(v) === 0);
        if (vazio) throw new Error(`Campo "${c.label}" é obrigatório.`);
      }
      const cpfNovo = String(valores.cpf ?? "").trim();
      const matNova = String(valores.matricula ?? "").trim();
      const cpfDigitos = cpfNovo.replace(/\D/g, "");
      if (cpfNovo && cpfDigitos.length !== 11) throw new Error("CPF deve ter 11 dígitos.");
      // Monta o body so com campos que a config marca como visiveis E que
      // o backend aceita persistir. Reduz risco de sobrescrever com vazio
      // um campo que a prefeitura escondeu do formulario dela.
      const patch: Record<string, string | number> = {};
      const put = (k: string, v: string | number | undefined) => {
        if (v === undefined) return;
        if (!campos.some((c) => c.key === k && c.visivel)) return;
        if (!CAMPOS_EDITAVEIS.has(k)) return;
        patch[k] = v;
      };
      put("nome", String(valores.nome ?? ""));
      put("cargo", String(valores.cargo ?? ""));
      put("endereco", String(valores.endereco ?? ""));
      put("vinculo", String(valores.vinculo ?? ""));
      put("email", String(valores.email ?? ""));
      put("telefone", String(valores.telefone ?? ""));
      put("situacaoFuncional", String(valores.situacaoFuncional ?? ""));
      put("idConvenio", String(valores.idConvenio ?? ""));
      put("dataAdmissao", String(valores.dataAdmissao ?? ""));
      put("dataNascimento", String(valores.dataNascimento ?? ""));
      if (valores.salarioLiquido != null && valores.salarioLiquido !== "") put("salarioLiquido", Number(valores.salarioLiquido));
      if (valores.codigoIbge != null && valores.codigoIbge !== "") put("codigoIbge", Number(valores.codigoIbge));
      if (cpfDigitos !== (servidor.cpf ?? "").replace(/\D/g, "")) patch.cpf = cpfNovo;
      if (matNova !== servidor.matricula) patch.matriculaNova = matNova;
      // Custom fields visiveis viram um objeto camposCustom no payload.
      const custom: Record<string, string> = {};
      for (const c of campos) {
        if (c.sistema || c.travado) continue;
        const v = valores[c.key];
        if (v == null) continue;
        custom[c.key] = String(v);
      }
      const patchFinal: Record<string, string | number | Record<string, string>> = { ...patch };
      if (Object.keys(custom).length > 0) patchFinal.camposCustom = custom;
      return atlas.prefeitura.editarServidor(servidor.matricula, patchFinal);
    },
    onSuccess: () => { setErro(null); onSaved(); },
    onError: (e: Error) => setErro(e.message),
  });

  const renderCampo = (c: ServidorCampoConfig) => {
    const val = valores[c.key];
    const readOnly = !ehEditavel(c);
    const hint = c.travado ? "Travado (identidade do servidor)"
      : c.key === "matricula" ? "Alterar remapeia o servidor"
      : !ehEditavel(c) ? "Somente leitura"
      : undefined;

    if (c.key === "cpf") {
      const cpfDigits = String(val ?? "").replace(/\D/g, "");
      const cpfValido = cpfDigits.length === 11 || cpfDigits.length === 0;
      return (
        <CpfField
          label={c.label}
          value={String(val ?? "")}
          onChange={(e) => setV(c.key, e.target.value)}
          required={c.obrigatorio}
          hint={hint}
          error={!cpfValido ? "CPF deve ter 11 dígitos" : undefined}
          readOnly={readOnly}
        />
      );
    }
    if (c.key === "telefone" || c.tipo === "telefone") {
      return (
        <TelefoneField
          label={c.label}
          value={String(val ?? "")}
          onChange={(e) => setV(c.key, e.target.value)}
          required={c.obrigatorio}
          hint={hint}
          readOnly={readOnly}
        />
      );
    }
    if (c.key === "vinculo") {
      const cur = String(val ?? "ESTATUTARIO");
      const opts = VINCULO_OPTS.slice();
      if (!opts.some((o) => o.value === cur) && cur) opts.unshift({ value: cur, label: cur });
      return (
        <SelectField
          label={c.label}
          value={cur}
          onChange={(e) => setV(c.key, e.target.value)}
          options={opts}
          required={c.obrigatorio}
          hint={hint}
          disabled={readOnly}
        />
      );
    }
    if (c.tipo === "moeda") {
      return (
        <CurrencyField
          label={c.label}
          value={typeof val === "number" ? val : Number(val) || null}
          onValueChange={(n) => setV(c.key, n ?? 0)}
          required={c.obrigatorio}
          hint={hint}
          readOnly={readOnly}
        />
      );
    }
    if (c.tipo === "numero") {
      return (
        <NumberField
          label={c.label}
          value={val ?? ""}
          onChange={(e) => setV(c.key, e.target.value)}
          required={c.obrigatorio}
          hint={hint}
          readOnly={readOnly}
        />
      );
    }
    if (c.tipo === "data") {
      return (
        <TextField
          label={c.label}
          type="date"
          value={String(val ?? "")}
          onChange={(e) => setV(c.key, e.target.value)}
          required={c.obrigatorio}
          hint={hint}
          readOnly={readOnly}
        />
      );
    }
    return (
      <TextField
        label={c.label}
        type={c.tipo === "email" ? "email" : "text"}
        value={String(val ?? "")}
        onChange={(e) => setV(c.key, e.target.value)}
        required={c.obrigatorio}
        hint={hint}
        readOnly={readOnly}
      />
    );
  };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Editar servidor</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: -4 }}>
          Matrícula <b style={{ fontFamily: "var(--font-mono)" }}>{servidor.matricula}</b>
        </p>

        {cfgQ.isPending ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Carregando configuração de campos…</p>
        ) : (
          <FormGrid>
            {campos.map((c) => (
              <span key={c.key}>{renderCampo(c)}</span>
            ))}
          </FormGrid>
        )}

        {erro || save.isError ? (
          <p style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 12 }}>
            {erro ?? (save.error as Error | undefined)?.message}
          </p>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || cfgQ.isPending}>
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
