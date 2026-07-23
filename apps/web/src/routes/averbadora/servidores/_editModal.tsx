import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, TextField, SelectField, CurrencyField, NumberField, FormGrid, CpfField, TelefoneField } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import type { AdminServidor, AdminServidorUpdate, ServidorCampoConfig } from "@atlas/sdk";
import { DEFAULT_CAMPOS_FALLBACK } from "./_defaults";

const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 };
const modal: React.CSSProperties = { background: "var(--surface-solid)", borderRadius: 12, padding: 24, maxWidth: 720, width: "100%", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto" };

/** Campos SISTEMA que o backend /admin/updateServidor aceita persistir. Campos
 *  fora desta lista (customs por enquanto) aparecem read-only ate o backend
 *  expor persistencia de custom fields no /editar. */
const CAMPOS_EDITAVEIS = new Set([
  "nome", "cpf", "matricula", "vinculo", "situacaoFuncional", "salarioLiquido",
  "idConvenio", "cargo", "endereco", "email", "telefone", "codigoIbge",
  "dataAdmissao", "dataNascimento",
]);

const VINCULO_OPTS = [
  { value: "ESTATUTARIO", label: "Estatutário" },
  { value: "CLT", label: "CLT" },
  { value: "COMISSIONADO", label: "Comissionado" },
];

export function EditModal({ servidor, prefeituraId, onClose, onSaved }: {
  servidor: AdminServidor;
  prefeituraId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const cfgQ = useQuery({
    queryKey: ["admin", "servidor-campos-config", prefeituraId],
    queryFn: () => atlas.admin.getServidorCamposConfig(prefeituraId),
    enabled: !!prefeituraId,
    staleTime: 60_000,
  });
  const camposCfg: ServidorCampoConfig[] = useMemo(() => {
    const raw = cfgQ.data?.config?.campos ?? DEFAULT_CAMPOS_FALLBACK;
    return raw.filter((c) => c.visivel).sort((a, b) => a.ordem - b.ordem);
  }, [cfgQ.data?.config?.campos]);

  // State central por key. Inicializa das colunas conhecidas do AdminServidor
  // + camposCustom. Numero/moeda ficam como number; resto string.
  const [valores, setValores] = useState<Record<string, string | number>>(() => {
    const src = servidor as unknown as Record<string, unknown>;
    const out: Record<string, string | number> = {};
    // Chaves sistema com nomes que casam com o shape do AdminServidor.
    const keys = ["nome","cpf","matricula","vinculo","situacaoFuncional","salarioLiquido","idConvenio","cargo","endereco","email","telefone","codigoIbge","dataAdmissao","dataNascimento"];
    for (const k of keys) {
      const v = src[k];
      if (typeof v === "number" || typeof v === "string") out[k] = v;
      else out[k] = "";
    }
    // Customs (camposCustom no shape do servidor).
    const custom = (src.camposCustom ?? {}) as Record<string, string | number | null>;
    for (const [k, v] of Object.entries(custom)) {
      out[k] = v == null ? "" : v;
    }
    return out;
  });
  const setV = (k: string, v: string | number) => setValores((prev) => ({ ...prev, [k]: v }));
  const [erro, setErro] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      // Valida obrigatorios ANTES do POST — feedback imediato.
      for (const c of camposCfg) {
        if (!c.obrigatorio) continue;
        if (!CAMPOS_EDITAVEIS.has(c.key)) continue;
        const v = valores[c.key];
        const vazio = v == null || (typeof v === "string" && !v.trim()) || (c.tipo === "moeda" && Number(v) === 0);
        if (vazio) throw new Error(`Campo "${c.label}" é obrigatório.`);
      }
      const cpfDigits = String(valores.cpf ?? "").replace(/\D/g, "");
      const cpfMudou = cpfDigits !== servidor.cpf;
      if (String(valores.cpf ?? "") && cpfDigits.length !== 11) {
        throw new Error("CPF deve ter 11 dígitos.");
      }
      // So envia campos que estao visiveis na config atual — evita sobrescrever
      // com vazio um campo que a prefeitura escondeu propositalmente. Mesmo
      // padrao do modal da prefeitura.
      const visivel = (k: string) => camposCfg.some((c) => c.key === k);
      const body: AdminServidorUpdate = { status: servidor.status };
      if (visivel("nome")) body.nome = String(valores.nome ?? "");
      if (visivel("vinculo")) body.vinculo = (VINCULO_OPTS.some((v) => v.value === valores.vinculo) ? valores.vinculo : "ESTATUTARIO") as AdminServidorUpdate["vinculo"];
      if (visivel("situacaoFuncional")) body.situacaoFuncional = String(valores.situacaoFuncional ?? "");
      if (visivel("salarioLiquido")) body.salarioLiquido = Number(valores.salarioLiquido ?? 0);
      if (visivel("idConvenio")) body.idConvenio = String(valores.idConvenio ?? "");
      if (visivel("email")) body.email = String(valores.email ?? "");
      if (visivel("telefone")) body.telefone = String(valores.telefone ?? "");
      if (visivel("cargo")) body.cargo = String(valores.cargo ?? "");
      if (visivel("endereco")) body.endereco = String(valores.endereco ?? "");
      if (visivel("dataAdmissao")) body.dataAdmissao = String(valores.dataAdmissao ?? "");
      if (visivel("dataNascimento")) body.dataNascimento = String(valores.dataNascimento ?? "");
      if (visivel("codigoIbge") && valores.codigoIbge != null && valores.codigoIbge !== "") body.codigoIbge = Number(valores.codigoIbge);
      if (cpfMudou && cpfDigits.length === 11) body.cpf = cpfDigits;
      return atlas.admin.updateServidor(servidor.matricula, body);
    },
    onSuccess: () => { setErro(null); onSaved(); },
    onError: (e: Error) => setErro(e.message),
  });

  const renderCampo = (c: ServidorCampoConfig) => {
    const val = valores[c.key];
    const readOnly = !CAMPOS_EDITAVEIS.has(c.key) || c.travado === true;
    const hint = c.travado ? "Travado (identidade do servidor)"
      : c.key === "matricula" ? "Alterar remapeia o servidor"
      : !CAMPOS_EDITAVEIS.has(c.key) ? "Somente leitura"
      : undefined;

    // CPF: componente com mascara.
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
    // Telefone: componente com mascara.
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
    // Vinculo: select de opcoes fixas do backend.
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
    // Status: hoje nao esta na config, ignora aqui (o admin edita via outro caminho).

    // Moeda.
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
    // Numero.
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
    // Data.
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
    // Email + Texto default.
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
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Editar servidor</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: -4 }}>
          Matrícula <b style={{ fontFamily: "var(--font-mono)" }}>{servidor.matricula}</b> · {servidor.origem}
        </p>

        {cfgQ.isPending ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Carregando configuração de campos…</p>
        ) : (
          <FormGrid>
            {camposCfg.map((c) => (
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
