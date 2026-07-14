import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input, Pill } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

export function AverbadoraConfiguracoes() {
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
          Averbadora · Configurações
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>Configurações</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Chaves de API da IA e o servidor de e-mail (SMTP) usado para enviar os e-mails de confirmação (2FA, primeiro acesso, OTP).
        </p>
      </header>

      <h2 style={{ margin: "8px 0 -4px", fontSize: "1.15rem" }}>Inteligência Artificial</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: 14 }}>
        A IA normaliza planilhas de importação que não seguem o modelo esperado (cabeçalhos diferentes, ordem trocada) antes de importar.
      </p>

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

      <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
      <h2 style={{ margin: "0 0 -4px", fontSize: "1.15rem" }}>Servidor de e-mail (SMTP)</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: 14 }}>
        Envio dos e-mails de confirmação (2FA, primeiro acesso, OTP) por SMTP — igual ao PHPMailer, sem custo:
        informe servidor, porta, usuário e senha do seu provedor. A senha fica no KV do Cloudflare, protegida por role
        averbadora — nunca é devolvida em texto claro. Use porta <b>587</b> (TLS/STARTTLS) ou <b>465</b> (SSL); a porta 25 é
        bloqueada pelo Cloudflare.
      </p>
      <SmtpSection />
    </div>
  );
}

function SmtpSection() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["admin", "smtp", "config"], queryFn: () => atlas.admin.smtpConfig() });
  const cfg = status.data;

  const DEFAULT_FORM = { host: "", port: 587, user: "", password: "", fromEmail: "", fromName: "Atlas Averbadora", secure: true, notifyEmail: "marketingcentral.mkt@gmail.com" };
  const [form, setForm] = useState(DEFAULT_FORM);
  const [hydrated, setHydrated] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Preenche o formulário com a config salva (uma vez), sem a senha.
  if (cfg && !hydrated) {
    setHydrated(true);
    setForm({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: "",
      fromEmail: cfg.fromEmail,
      fromName: cfg.fromName,
      secure: cfg.secure,
      notifyEmail: cfg.notifyEmail || "marketingcentral.mkt@gmail.com",
    });
  }

  const save = useMutation({
    mutationFn: () => atlas.admin.smtpSave({
      host: form.host.trim(),
      port: Number(form.port),
      user: form.user.trim(),
      password: form.password || undefined, // vazio = mantém a senha atual
      secure: form.secure,
      fromEmail: form.fromEmail.trim() || undefined,
      fromName: form.fromName.trim() || undefined,
      notifyEmail: form.notifyEmail.trim(),
    }),
    onSuccess: () => {
      setForm((f) => ({ ...f, password: "" }));
      setMsg({ kind: "ok", text: "Configuração salva." });
      qc.invalidateQueries({ queryKey: ["admin", "smtp", "config"] });
    },
    onError: (err) => setMsg({ kind: "err", text: err instanceof Error ? err.message : "Falha ao salvar" }),
  });

  const clear = useMutation({
    mutationFn: () => atlas.admin.smtpClear(),
    onSuccess: () => {
      setForm(DEFAULT_FORM);
      setMsg({ kind: "ok", text: "Configuração removida." });
      qc.invalidateQueries({ queryKey: ["admin", "smtp", "config"] });
    },
  });

  const [testTo, setTestTo] = useState("marketingcentral.mkt@gmail.com");
  const [testMsg, setTestMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const testar = useMutation({
    mutationFn: () => atlas.admin.smtpTest(testTo.trim()),
    onSuccess: (r) =>
      setTestMsg(r.sent
        ? { kind: "ok", text: `E-mail de teste enviado para ${testTo}. Cheque a caixa (e o spam).` }
        : { kind: "err", text: `Não enviou: ${r.reason ?? "erro"}. Confira a chave/credenciais e o remetente.` }),
    onError: (err) => setTestMsg({ kind: "err", text: err instanceof Error ? err.message : "Falha no teste" }),
  });

  const podeSalvar = Boolean(form.host.trim() && form.user.trim() && (form.password || cfg?.hasPassword));

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>{cfg?.configured ? "Editar envio de e-mail" : "Configurar envio de e-mail"}</h3>
        {status.isLoading ? (
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Carregando…</span>
        ) : cfg?.configured ? (
          <div style={{ textAlign: "right" }}>
            <Pill variant="averbado">Configurado</Pill>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
              atualizado em {cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString("pt-BR") : "—"}
            </div>
          </div>
        ) : (
          <Pill variant="pendente">Não configurado</Pill>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Input label="Servidor (host)" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.seuprovedor.com" autoComplete="off" spellCheck={false} />
        <Input label="Porta" type="number" value={String(form.port)} onChange={(e) => setForm({ ...form, port: Number(e.target.value) || 0 })} placeholder="587" />
        <Input label="Usuário" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="usuario@seuprovedor.com" autoComplete="off" spellCheck={false} />
        <Input
          label={cfg?.hasPassword ? "Senha (deixe em branco p/ manter)" : "Senha"}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={cfg?.hasPassword ? "••••••••" : "senha SMTP"}
          autoComplete="off"
        />
        <Input label="E-mail remetente (from)" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} placeholder="você@gmail.com" autoComplete="off" spellCheck={false} />
        <Input label="Nome remetente" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Atlas Averbadora" />
      </div>

      <div style={{ marginTop: 12 }}>
        <Input
          label="Destino dos códigos de confirmação"
          value={form.notifyEmail}
          onChange={(e) => setForm({ ...form, notifyEmail: e.target.value })}
          placeholder="marketingcentral.mkt@gmail.com"
          autoComplete="off"
          spellCheck={false}
        />
        <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 4 }}>
          Todos os códigos de confirmação (6 dígitos) são enviados para este e-mail. Deixe em branco para enviar ao e-mail do próprio usuário.
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}>
        <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} />
        Conexão segura (TLS/SSL) — recomendado nas portas 465/587
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Button onClick={() => save.mutate()} disabled={!podeSalvar || save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar"}
        </Button>
        {cfg?.configured ? (
          <Button
            variant="ghost"
            onClick={() => { if (confirm("Remover a configuração SMTP? Os e-mails de confirmação deixarão de ser enviados.")) clear.mutate(); }}
            disabled={clear.isPending}
            style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}
          >
            {clear.isPending ? "Removendo…" : "✕ Remover"}
          </Button>
        ) : null}
      </div>

      {msg ? (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${msg.kind === "ok" ? "var(--emerald-500)" : "var(--danger-500)"}`,
            background: msg.kind === "ok" ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)" : "color-mix(in srgb, var(--danger-500) 10%, transparent)",
            fontSize: ".88rem",
          }}
        >
          {msg.text}
        </div>
      ) : null}

      {cfg?.configured ? (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Enviar e-mail de teste</div>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 8 }}>
            Digite um <b>endereço de e-mail</b> válido para receber o teste (ex.: seu Gmail).
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px" }}>
              <Input label="E-mail para receber o teste" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="você@email.com" autoComplete="off" spellCheck={false} />
            </div>
            <Button variant="ghost" onClick={() => testar.mutate()} disabled={!/^\S+@\S+\.\S+$/.test(testTo.trim()) || testar.isPending}>
              {testar.isPending ? "Enviando…" : "✉ Enviar teste"}
            </Button>
          </div>
          {testMsg ? (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${testMsg.kind === "ok" ? "var(--emerald-500)" : "var(--danger-500)"}`,
                background: testMsg.kind === "ok" ? "color-mix(in srgb, var(--emerald-500) 12%, transparent)" : "color-mix(in srgb, var(--danger-500) 10%, transparent)",
                fontSize: ".88rem",
              }}
            >
              {testMsg.text}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
