import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

export function AverbadoraIA() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["admin", "ai", "config"],
    queryFn: () => atlas.admin.aiConfig(),
  });

  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null);

  const save = useMutation({
    mutationFn: (apiKey: string) => atlas.admin.aiSaveKey(apiKey),
    onSuccess: () => {
      setNewKey("");
      setSaveMsg({ kind: "ok", text: "Chave salva. Rode um teste para validar." });
      qc.invalidateQueries({ queryKey: ["admin", "ai", "config"] });
    },
    onError: (err) => setSaveMsg({ kind: "err", text: err instanceof Error ? err.message : "Falha ao salvar" }),
  });

  const clear = useMutation({
    mutationFn: () => atlas.admin.aiClearKey(),
    onSuccess: () => {
      setSaveMsg({ kind: "ok", text: "Chave removida." });
      setTestResult(null);
      qc.invalidateQueries({ queryKey: ["admin", "ai", "config"] });
    },
  });

  const test = useMutation({
    mutationFn: () => atlas.admin.aiTest(),
    onSuccess: (r) => setTestResult(r),
    onError: (err) => setTestResult({ ok: false, message: err instanceof Error ? err.message : "Falha" }),
  });

  const cfg = status.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
      <header>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            fontWeight: 700,
            color: "var(--text-dim)",
            textTransform: "uppercase",
          }}
        >
          Averbadora · Inteligência Artificial
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Configuração da IA</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          A IA é usada para normalizar planilhas de importação que não seguem o modelo esperado. Quando um CSV chega com
          cabeçalhos diferentes, colunas em ordem trocada ou nomes traduzidos, a IA transforma no formato canônico antes
          de importar.
        </p>
      </header>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".08em",
                color: "var(--text-dim)",
                textTransform: "uppercase",
              }}
            >
              Provedor
            </div>
            <div style={{ marginTop: 6, fontWeight: 700, fontSize: "1.05rem" }}>OpenAI (ChatGPT)</div>
            <div style={{ marginTop: 2, fontSize: 13, color: "var(--text-muted)" }}>
              Modelo padrão: <code>gpt-4o-mini</code>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {status.isLoading ? (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Carregando…</span>
            ) : cfg?.hasKey ? (
              <>
                <Pill variant="averbado">Chave configurada</Pill>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {cfg.keyPrefix}
                  ***
                  {cfg.keySuffix}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                  atualizada em {cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString("pt-BR") : "—"}
                </div>
              </>
            ) : (
              <Pill variant="pendente">Sem chave</Pill>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>{cfg?.hasKey ? "Substituir chave" : "Configurar chave da OpenAI"}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Cole abaixo sua chave da OpenAI (começa com <code>sk-</code>). Ela fica armazenada no KV do Cloudflare, protegida
          por role averbadora — nunca é devolvida em texto claro nas listagens.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 500 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="API Key"
                type={showKey ? "text" : "password"}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button size="sm" variant="ghost" type="button" onClick={() => setShowKey((v) => !v)}>
              {showKey ? "Ocultar" : "Ver"}
            </Button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={() => save.mutate(newKey)} disabled={!newKey.trim() || save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar chave"}
            </Button>
            {cfg?.hasKey ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("Remover a chave? A IA vai parar de funcionar até você configurar uma nova.")) {
                    clear.mutate();
                  }
                }}
                disabled={clear.isPending}
                style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}
              >
                {clear.isPending ? "Removendo…" : "✕ Remover chave"}
              </Button>
            ) : null}
          </div>

          {saveMsg ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${saveMsg.kind === "ok" ? "var(--emerald-500)" : "var(--danger-500)"}`,
                background:
                  saveMsg.kind === "ok"
                    ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)"
                    : "color-mix(in srgb, var(--danger-500) 10%, transparent)",
                fontSize: ".88rem",
              }}
            >
              {saveMsg.text}
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Testar conexão</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Faz uma chamada leve em <code>/v1/models</code> da OpenAI usando a chave configurada. Não consome tokens.
        </p>
        <Button onClick={() => test.mutate()} disabled={!cfg?.hasKey || test.isPending}>
          {test.isPending ? "Testando…" : "🧪 Testar chave"}
        </Button>

        {testResult ? (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${testResult.ok ? "var(--emerald-500)" : "var(--danger-500)"}`,
              background: testResult.ok
                ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)"
                : "color-mix(in srgb, var(--danger-500) 10%, transparent)",
              fontSize: 14,
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {testResult.ok ? "✓ Conexão OK" : "✗ Falha"}
              {testResult.latencyMs != null ? ` · ${testResult.latencyMs}ms` : ""}
            </div>
            <div style={{ marginTop: 4, color: "var(--text-muted)" }}>{testResult.message}</div>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>O que a IA faz hoje</h3>
        <ul style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, paddingLeft: 20 }}>
          <li>
            <strong>Normaliza CSV de servidores.</strong> Ao importar uma base em{" "}
            <a href="/averbadora/servidores" style={{ color: "var(--accent)" }}>Averbadora / Servidores</a>, se o arquivo
            não seguir o modelo (colunas com nomes diferentes, ordem trocada, delimitador esquisito), a IA sugere um CSV
            já no formato do exemplo antes do upload.
          </li>
          <li>
            <strong>Não inventa dados.</strong> A IA só mapeia e reordena colunas, mantendo CPF, matrícula e datas como
            estão no original.
          </li>
        </ul>
        <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 12 }}>
          Próximas iterações: normalização de tombamento (banco), extração de dados de PDF, sugestão de match para bate
          de carteira.
        </p>
      </Card>
    </div>
  );
}
