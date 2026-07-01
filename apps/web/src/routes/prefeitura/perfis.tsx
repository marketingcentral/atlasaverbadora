import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DataTable, IconButton, Pill, type Column } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type { PrefeituraPerfil } from "@atlas/sdk";
import { PageHeader, Modal, Field, inp, selStyle } from "./_ui";

const AREA_LABEL: Record<string, string> = { rh: "Recursos Humanos", financeiro: "Financeiro", gestor: "Gestor" };

export function PrefeituraPerfis() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [secret, setSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const q = useQuery({ queryKey: ["prefeitura", "perfis"], queryFn: () => atlas.prefeitura.perfis() });

  const del = useMutation({ mutationFn: (id: number) => atlas.prefeitura.excluirPerfil(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }) });
  const rotate = useMutation({ mutationFn: (id: number) => atlas.prefeitura.rotate2fa(id), onSuccess: (d) => { setSecret(d); qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }); } });
  const disable = useMutation({ mutationFn: (id: number) => atlas.prefeitura.disable2fa(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }) });

  const columns: Column<PrefeituraPerfil>[] = [
    { key: "nome", header: "Nome" },
    { key: "email", header: "E-mail", mono: true },
    { key: "area", header: "Área", render: (p) => <Pill variant="aceita">{AREA_LABEL[p.area] ?? p.area}</Pill> },
    { key: "ativo", header: "Ativo", render: (p) => <Pill variant={p.ativo ? "emdia" : "expirado"}>{p.ativo ? "sim" : "não"}</Pill> },
    { key: "twofa", header: "2FA", render: (p) => <Pill variant={p.twofaEnabled ? "averbado" : "pendente"}>{p.twofaEnabled ? "ativo" : "off"}</Pill> },
    {
      key: "acoes", header: "", render: (p) => (
        <div style={{ display: "flex", gap: 6 }}>
          <IconButton onClick={() => rotate.mutate(p.id)}>{p.twofaEnabled ? "Rotacionar 2FA" : "Ativar 2FA"}</IconButton>
          {p.twofaEnabled ? <IconButton onClick={() => disable.mutate(p.id)}>Desativar 2FA</IconButton> : null}
          <IconButton danger onClick={() => { if (confirm(`Excluir ${p.nome}?`)) del.mutate(p.id); }}>Excluir</IconButton>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Usuários e acessos" subtitle="Perfis por área (RH, Financeiro, Gestor) com 2FA. Login: CPF/e-mail + senha + segundo fator." actions={<Button onClick={() => setModalOpen(true)}>+ Novo usuário</Button>} />

      <DataTable columns={columns} rows={q.data?.perfis ?? []} rowKey={(p) => String(p.id)} loading={q.isLoading} emptyState="Nenhum usuário." />

      {modalOpen ? <PerfilModal onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); qc.invalidateQueries({ queryKey: ["prefeitura", "perfis"] }); }} /> : null}
      {secret ? (
        <Modal title="2FA (TOTP) provisionado" onClose={() => setSecret(null)}>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Cadastre este segredo no app autenticador (Google Authenticator, Authy). Exibido só agora.</p>
          <pre style={{ padding: 12, background: "var(--bg-elev-2)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 14, userSelect: "all" }}>{secret.secret}</pre>
          <p style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all" }}>{secret.otpauthUrl}</p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><Button variant="ghost" onClick={() => setSecret(null)}>Fechar</Button></div>
        </Modal>
      ) : null}
    </div>
  );
}

function PerfilModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("rh");
  const save = useMutation({ mutationFn: () => atlas.prefeitura.salvarPerfil({ nome, email, area }), onSuccess: onSaved });
  return (
    <Modal title="Novo usuário da prefeitura" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Field lbl="Nome"><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
        <Field lbl="E-mail"><input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field lbl="Área">
          <select style={selStyle} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="rh">Recursos Humanos</option>
            <option value="financeiro">Financeiro</option>
            <option value="gestor">Gestor</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !nome || !email}>{save.isPending ? "Salvando…" : "Criar"}</Button>
      </div>
      {save.isError ? <p style={{ color: "#ef4444", marginTop: 12, fontSize: 13 }}>{(save.error as Error).message}</p> : null}
    </Modal>
  );
}
