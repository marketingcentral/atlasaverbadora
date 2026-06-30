import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Input, useThemeMode } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";

export function ServidorConta() {
  const nav = useNavigate();
  const { mode, setMode } = useThemeMode();
  const profile = useQuery({ queryKey: ["me"], queryFn: () => atlas.getMyProfile() });

  // Editable fields kept in local state; reset to profile when it loads.
  const [email, setEmail] = useState("ana.carolina@palhoca.sc.gov.br");
  const [telefone, setTelefone] = useState("(48) 99812-3210");
  const [editing, setEditing] = useState(false);
  const [showSelfie, setShowSelfie] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function abrirConfirmacao() {
    setShowSelfie(true);
  }

  async function confirmarSelfie() {
    // Mock: pretend liveness check ran for 1.5s and passed.
    await new Promise((r) => setTimeout(r, 1500));
    setShowSelfie(false);
    setEditing(false);
    setSavedAt(new Date());
  }

  const nome = profile.data?.nome ?? "Servidor";
  const cpfMasked = "***.***.222-33";
  const endereco = "Rua das Acacias, 145 — Palhoca/SC, 88130-XXX";
  const cargo = "Analista Administrativo";
  const matricula = profile.data?.matricula ?? "—";
  const prefeitura = "Prefeitura de Palhoca";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Conta
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.8rem" }}>Meus dados</h1>
      </header>

      <Card>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Dados cadastrais</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          <ReadField label="Nome" value={nome} />
          <ReadField label="CPF" value={cpfMasked} />
          <ReadField label="Cargo" value={cargo} />
          <ReadField label="Vinculo" value={profile.data?.vinculo ?? "—"} />
          <ReadField label="Matricula" value={matricula} />
          <ReadField label="Prefeitura" value={prefeitura} />
          <ReadField label="Endereco" value={endereco} full />
        </div>
        <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 16, marginBottom: 0 }}>
          Esses dados sao mantidos pela sua prefeitura. Para corrigir, procure o setor de RH.
        </p>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Contato</h3>
          {!editing ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Editar
            </Button>
          ) : null}
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Button onClick={abrirConfirmacao}>Salvar alteracoes</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
            <p style={{ fontSize: ".82rem", color: "var(--text-muted)", margin: 0 }}>
              Por seguranca, vamos pedir uma selfie (liveness) antes de salvar.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            <ReadField label="E-mail" value={email} />
            <ReadField label="Telefone" value={telefone} />
          </div>
        )}

        {savedAt ? (
          <div
            style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--emerald-500)",
              background: "color-mix(in srgb, var(--emerald-500) 12%, transparent)",
              fontSize: ".88rem",
            }}
          >
            ✓ Alteracoes salvas em {savedAt.toLocaleTimeString("pt-BR")}
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Aparencia</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["system", "light", "dark"] as const).map((m) => (
            <Button key={m} variant={mode === m ? "primary" : "ghost"} size="sm" onClick={() => setMode(m)}>
              {m === "system" ? "Seguir sistema" : m === "light" ? "Claro" : "Escuro"}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Seguranca</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Login biometrico (Face/Touch ID) esta disponivel no app mobile. No portal web, recomendamos ativar 2FA por
          e-mail/SMS.
        </p>
      </Card>

      <div>
        <Button
          variant="ghost"
          onClick={async () => {
            await atlas.logout().catch(() => undefined);
            window.localStorage.removeItem("atlas:role");
            window.localStorage.removeItem("atlas:tokens");
            window.localStorage.removeItem("atlas:idMatricula");
            window.localStorage.removeItem("atlas:idMatricula:meta");
            nav("/login");
          }}
        >
          Sair da conta
        </Button>
      </div>

      {showSelfie ? <SelfieModal onClose={() => setShowSelfie(false)} onConfirm={confirmarSelfie} /> : null}
    </div>
  );
}

function ReadField({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: ".95rem" }}>{value}</div>
    </div>
  );
}

function SelfieModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [running, setRunning] = useState(false);
  return (
    <div
      role="dialog"
      style={{
        position: "fixed", inset: 0, background: "color-mix(in srgb, var(--navy-900) 70%, transparent)",
        display: "grid", placeItems: "center", zIndex: 100, padding: 16,
      }}
    >
      <Card style={{ maxWidth: 420, width: "100%" }}>
        <h3 style={{ marginTop: 0 }}>Confirmacao por selfie</h3>
        <p style={{ color: "var(--text-muted)", fontSize: ".9rem", marginTop: 0 }}>
          Para sua seguranca, vamos verificar que e voce mesmo alterando os dados. Posicione seu rosto na area abaixo.
        </p>
        <div
          style={{
            margin: "12px 0", height: 220, borderRadius: 12,
            border: "2px dashed var(--border-strong)", background: "var(--bg-elev-2)",
            display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: ".88rem",
          }}
        >
          {running ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: "3px solid var(--border)", borderTopColor: "var(--accent)",
                  margin: "0 auto", animation: "spin 1s linear infinite",
                }}
              />
              <div style={{ marginTop: 12 }}>Analisando liveness…</div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>📷</div>
              <div>Camera frontal — selfie liveness</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose} disabled={running}>Cancelar</Button>
          <Button
            disabled={running}
            onClick={async () => {
              setRunning(true);
              await onConfirm();
              setRunning(false);
            }}
          >
            {running ? "Verificando..." : "Iniciar verificacao"}
          </Button>
        </div>
      </Card>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
