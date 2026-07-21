import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, SelectField } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import type { CsvImportOutcome, ServidorCampoConfig, ServidorCamposConfig } from "@atlas/sdk";
import { CamposEditor } from "./_camposEditor";
import { DEFAULT_CAMPOS_FALLBACK } from "./_defaults";

/** Detecta se os headers do CSV batem com pelo menos os travados (cpf/matricula/email).
 *  Suficiente pra rejeitar arquivo em formato completamente estranho antes de
 *  bater no backend. Validacao completa fica no import. */
function detectHeaderMismatch(csv: string, obrigatorios: string[]): { compat: boolean; found: string[] } {
  const firstLine = csv.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const found = firstLine.split(/[,;\t]/).map((h) => h.replace(/^"|"$/g, "").trim());
  const compat = obrigatorios.every((h) => found.includes(h)) && found.length > 0;
  return { compat, found };
}

export function AdminServidoresImportar() {
  const qc = useQueryClient();
  const prefeituras = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const [prefId, setPrefId] = useState<string>("");
  const prefIdNum = Number(prefId);
  const prefSelecionada = (prefeituras.data?.prefeituras ?? []).find((p) => String(p.id) === prefId);

  const configQ = useQuery({
    queryKey: ["admin", "servidor-campos-config", prefIdNum],
    queryFn: () => atlas.admin.getServidorCamposConfig(prefIdNum),
    enabled: !!prefId,
  });

  // Rascunho local pra o editor: comeca com o que veio do backend, marca dirty
  // ao editar. Salvar envia pro backend + reset do dirty.
  // Fallback: se o endpoint /campos-config nao existe (backend antigo) ou
  // falhou, cai no default local pra tela nao ficar em "Carregando..." pra
  // sempre. Save vai falhar ate API deployar, mas UI segue interativa.
  const [rascunho, setRascunho] = useState<ServidorCampoConfig[] | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const configIndisponivel = configQ.isError;
  useEffect(() => {
    if (!prefId) { setRascunho(null); setSavedAt(null); return; }
    if (configQ.data?.config?.campos) {
      setRascunho(configQ.data.config.campos);
      setSavedAt(configQ.data.config.atualizadoEm ?? null);
    } else if (configQ.isError) {
      setRascunho(DEFAULT_CAMPOS_FALLBACK);
      setSavedAt(null);
    }
  }, [prefId, configQ.data?.config?.atualizadoEm, configQ.isError]);
  const dirty = useMemo(() => {
    if (!rascunho || !configQ.data?.config?.campos) return false;
    return JSON.stringify(rascunho) !== JSON.stringify(configQ.data.config.campos);
  }, [rascunho, configQ.data?.config?.campos]);

  const saveConfig = useMutation({
    mutationFn: (campos: ServidorCampoConfig[]) => atlas.admin.updateServidorCamposConfig(prefIdNum, campos),
    onSuccess: (r) => {
      setSavedAt(r.config.atualizadoEm);
      setRascunho(r.config.campos);
      qc.setQueryData<{ config: ServidorCamposConfig }>(["admin", "servidor-campos-config", prefIdNum], { config: r.config });
    },
  });

  // Auto-save silencioso (debounce 800ms). Cliente pediu 21/07/2026: nao
  // ficar pedindo pra salvar quando mexer nos toggles/label do custom, so
  // salva automatico. UI nao mostra "Alteracoes nao salvas" nem "Salvar agora"
  // — passa a ser transparente pra quem esta editando.
  useEffect(() => {
    if (!prefId || !dirty || !rascunho || saveConfig.isPending) return;
    const timer = setTimeout(() => saveConfig.mutate(rascunho), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunho, dirty, prefId]);

  // ===== Import =====
  const [pasted, setPasted] = useState("");
  const [importResult, setImportResult] = useState<CsvImportOutcome | null>(null);
  const [mismatch, setMismatch] = useState<{ found: string[] } | null>(null);
  const [aiResult, setAiResult] = useState<{ csv: string; mapping: Record<string, string>; summary: string; usage: { input: number; output: number } } | null>(null);

  const aiStatus = useQuery({ queryKey: ["admin", "ai", "config"], queryFn: () => atlas.admin.aiConfig() });

  const obrigatorios = useMemo(() => {
    const list = rascunho ?? configQ.data?.config?.campos ?? [];
    return list.filter((c) => c.obrigatorio).map((c) => c.key);
  }, [rascunho, configQ.data?.config?.campos]);

  const expectedHeaders = useMemo(() => {
    const list = rascunho ?? configQ.data?.config?.campos ?? [];
    return list.filter((c) => c.visivel).sort((a, b) => a.ordem - b.ordem).map((c) => c.key);
  }, [rascunho, configQ.data?.config?.campos]);

  const importMut = useMutation({
    mutationFn: (csv: string) => atlas.admin.importCsv("servidores", csv, { prefeituraId: prefIdNum }),
    onSuccess: (r) => {
      setImportResult(r);
      qc.invalidateQueries({ queryKey: ["admin", "servidores"] });
    },
  });

  const aiNormalize = useMutation({
    mutationFn: (csv: string) =>
      atlas.admin.aiNormalizeCsv({
        csv,
        expectedHeaders,
        contextHint: "base de servidores publicos municipais para credito consignado",
      }),
    onSuccess: (r) => setAiResult(r),
  });

  function checkAndMaybeImport(text: string) {
    setPasted(text);
    setAiResult(null);
    setImportResult(null);
    const { compat, found } = detectHeaderMismatch(text, obrigatorios);
    if (compat) {
      setMismatch(null);
      importMut.mutate(text);
    } else {
      setMismatch({ found });
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    checkAndMaybeImport(text);
  }

  const templateUrl = prefId ? atlas.admin.servidoresCsvTemplateUrl(prefIdNum) : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Averbadora
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Importar servidores</h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", maxWidth: 720 }}>
          Escolha a prefeitura, configure os campos e envie o CSV. O modelo baixado e a validação
          seguem exatamente essa configuração — cada prefeitura pode ter campos diferentes.
        </p>
      </header>

      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 20 }}>
        <div style={{ maxWidth: 420 }}>
          <SelectField
            label="Prefeitura"
            value={prefId}
            onChange={(e) => setPrefId(e.target.value)}
            options={[{ value: "", label: "— Selecione —" }, ...((prefeituras.data?.prefeituras ?? []).map((p) => ({ value: String(p.id), label: `${p.nome}/${p.uf}` })))]}
          />
        </div>
      </div>

      {!prefId ? (
        <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12 }}>
          Selecione uma prefeitura acima para configurar os campos e importar servidores.
        </div>
      ) : configQ.isLoading && !rascunho ? (
        <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12 }}>
          Carregando configuração da prefeitura…
        </div>
      ) : !rascunho ? (
        <div style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12 }}>
          Não foi possível carregar a configuração.
        </div>
      ) : (
        <>
          {configIndisponivel ? (
            <div style={{ padding: 12, borderRadius: 10, border: "1px solid var(--gold-500)", background: "color-mix(in srgb, var(--gold-500) 12%, transparent)", fontSize: 13 }}>
              ⚠ Endpoint de configuração indisponível (backend ainda não deployado). Mostrando campos padrão — alterações não serão persistidas até o deploy da API.
            </div>
          ) : null}
          <CamposEditor
            campos={rascunho}
            onChange={setRascunho}
            onSave={() => saveConfig.mutate(rascunho)}
            /** Chamado pelo "+ Adicionar" do editor: recebe a lista JA com o custom
             *  anexado e salva imediatamente (sem esperar debounce nem clique manual
             *  de Salvar). Fluxo pedido pelo cliente 21/07/2026: "clicar em adicionar
             *  ai sim vai salvar". */
            onSaveWith={(campos) => saveConfig.mutate(campos)}
            onRestoreDefault={() => {
              // "Restaurar padrao" via backend: manda array vazio -> sanitizeCampos
              // reconstroi so os travados. Mais simples do lado do frontend: pega
              // a config atual e forca visivel:true / obrigatorio nos travados nos
              // sistema, apagando custom. Como o helper padrao vive no backend,
              // o jeito canonico e' PUT com o default do backend: fazemos aqui um
              // subset "resetar aos sistema" e deixa o backend normalizar.
              const soSistema = rascunho.filter((c) => c.sistema).map((c) => ({
                ...c,
                visivel: true,
                obrigatorio: ["cpf", "matricula", "email", "nome"].includes(c.key),
              }));
              setRascunho(soSistema);
            }}
            saving={saveConfig.isPending}
            dirty={dirty}
          />
          {saveConfig.isError ? (
            <div style={{ padding: 12, borderRadius: 8, background: "color-mix(in srgb, var(--danger-500) 12%, transparent)", color: "var(--danger-500)", fontSize: 13 }}>
              Erro ao salvar config: {(saveConfig.error as Error).message}
            </div>
          ) : null}
          {savedAt ? (
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              Config atualizada em {new Date(savedAt).toLocaleString("pt-BR")}.
            </div>
          ) : null}

          <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Enviar base de servidores</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, maxWidth: 500 }}>
                  Servidores serão vinculados a <b style={{ color: "var(--text)" }}>{prefSelecionada?.nome}/{prefSelecionada?.uf}</b>.
                  Obrigatórios: <code style={{ fontFamily: "var(--font-mono)" }}>{obrigatorios.join(", ")}</code>.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={templateUrl} download style={{ textDecoration: "none" }}>
                  <Button size="sm" variant="ghost">↓ Baixar exemplo</Button>
                </a>
              </div>
            </div>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
              style={{ fontSize: 13, marginTop: 4 }}
            />

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
                Ou cole o conteúdo CSV manualmente
              </summary>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                placeholder={`${expectedHeaders.join(",")}\n...`}
                style={{ width: "100%", marginTop: 6, padding: 10, fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)", borderRadius: 8 }}
              />
              <Button size="sm" onClick={() => checkAndMaybeImport(pasted)} disabled={importMut.isPending || !pasted.trim()} style={{ marginTop: 8 }}>
                {importMut.isPending ? "Importando…" : "Importar texto colado"}
              </Button>
            </details>

            {mismatch ? (
              <div
                style={{
                  marginTop: 14, padding: 12, borderRadius: 10,
                  border: "1px solid var(--gold-500)",
                  background: "color-mix(in srgb, var(--gold-500) 10%, transparent)",
                  fontSize: 13,
                }}
              >
                <b>Cabeçalhos não batem com o modelo.</b>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                  Faltando obrigatórios: <code style={{ fontFamily: "var(--font-mono)" }}>{obrigatorios.filter((h) => !mismatch.found.includes(h)).join(", ") || "(nenhum)"}</code>
                  <br />
                  Encontrado: <code style={{ fontFamily: "var(--font-mono)" }}>{mismatch.found.slice(0, 8).join(", ")}{mismatch.found.length > 8 ? "…" : ""}</code>
                </div>
                {aiStatus.data?.hasKey ? (
                  <>
                    <p style={{ margin: "8px 0", color: "var(--text-muted)" }}>
                      Posso pedir pra IA transformar esse arquivo no formato esperado.
                    </p>
                    <Button size="sm" onClick={() => aiNormalize.mutate(pasted)} disabled={aiNormalize.isPending || !pasted.trim()}>
                      {aiNormalize.isPending ? "IA processando…" : "✧ Normalizar com IA"}
                    </Button>
                    {aiNormalize.isError ? (
                      <div style={{ marginTop: 8, color: "var(--danger-500)", fontSize: 12 }}>
                        {(aiNormalize.error as Error).message}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {aiResult ? (
              <div
                style={{
                  marginTop: 14, padding: 12, borderRadius: 10,
                  border: "1px solid var(--emerald-500)",
                  background: "color-mix(in srgb, var(--emerald-500) 10%, transparent)",
                  fontSize: 13,
                }}
              >
                <b>✧ IA normalizou o arquivo.</b>
                <div style={{ marginTop: 6, color: "var(--text-muted)" }}>{aiResult.summary}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <Button size="sm" onClick={() => { setMismatch(null); setPasted(aiResult.csv); importMut.mutate(aiResult.csv); }} disabled={importMut.isPending}>
                    {importMut.isPending ? "Importando…" : "Importar CSV normalizado"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAiResult(null)}>Descartar</Button>
                </div>
              </div>
            ) : null}

            {importMut.isError ? (
              <p style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 12 }}>{(importMut.error as Error).message}</p>
            ) : null}

            {importResult ? (
              <div style={{ marginTop: 14, padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, fontSize: 13 }}>
                <div>
                  <b>{importResult.inserted}</b> inseridos · <b>{importResult.updated}</b> atualizados
                  {importResult.errors.length > 0 ? <> · <span style={{ color: "var(--danger-500)" }}>{importResult.errors.length} erros</span></> : null}
                  {(importResult.persistFailures ?? []).length > 0 ? <> · <span style={{ color: "var(--danger-500)" }}>{importResult.persistFailures!.length} falhas de persistência</span></> : null}
                </div>
                {importResult.errors.length > 0 ? (
                  <ul style={{ marginTop: 8, paddingLeft: 16, color: "var(--danger-500)", fontSize: 12 }}>
                    {importResult.errors.slice(0, 8).map((er, i) => (
                      <li key={i}>Linha {er.line}: {er.message}</li>
                    ))}
                    {importResult.errors.length > 8 ? <li>… e mais {importResult.errors.length - 8} erros</li> : null}
                  </ul>
                ) : null}
                {(importResult.persistFailures ?? []).length > 0 ? (
                  <ul style={{ marginTop: 8, paddingLeft: 16, color: "var(--danger-500)", fontSize: 12 }}>
                    {importResult.persistFailures!.slice(0, 5).map((pf, i) => (
                      <li key={i}><b>{pf.matricula}</b>: {pf.message}</li>
                    ))}
                    {importResult.persistFailures!.length > 5 ? <li>… e mais {importResult.persistFailures!.length - 5}</li> : null}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
