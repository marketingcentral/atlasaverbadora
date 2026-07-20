import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, TextField, SelectField, CurrencyField, FormGrid } from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import type { AdminServidor, AdminServidorUpdate } from "@atlas/sdk";

const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 };
const modal: React.CSSProperties = { background: "var(--surface-solid)", borderRadius: 12, padding: 24, maxWidth: 600, width: "100%", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-lg)" };

export function EditModal({ servidor, onClose, onSaved }: { servidor: AdminServidor; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(servidor.nome);
  const [vinculo, setVinculo] = useState<AdminServidorUpdate["vinculo"]>(
    (["CLT", "ESTATUTARIO", "COMISSIONADO"].includes(servidor.vinculo) ? servidor.vinculo : "ESTATUTARIO") as AdminServidorUpdate["vinculo"],
  );
  const [situacao, setSituacao] = useState(servidor.situacaoFuncional);
  const [salario, setSalario] = useState<number>(servidor.salarioLiquido);
  const [idConvenio, setIdConvenio] = useState(servidor.idConvenio);
  const [status, setStatus] = useState<AdminServidor["status"]>(servidor.status);
  const [email, setEmail] = useState(servidor.email);
  const [telefone, setTelefone] = useState(servidor.telefone);
  const [cpf, setCpf] = useState(servidor.cpf);

  const cpfDigits = cpf.replace(/\D/g, "");
  const cpfValido = cpfDigits.length === 11;
  const cpfMudou = cpfDigits !== servidor.cpf;

  const save = useMutation({
    mutationFn: () => {
      const body: AdminServidorUpdate = {
        nome, vinculo, situacaoFuncional: situacao, salarioLiquido: salario,
        idConvenio, status, email, telefone,
      };
      if (cpfMudou && cpfValido) body.cpf = cpfDigits;
      return atlas.admin.updateServidor(servidor.matricula, body);
    },
    onSuccess: () => { onSaved(); },
  });

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Editar servidor</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: -4 }}>
          Matrícula <b style={{ fontFamily: "var(--font-mono)" }}>{servidor.matricula}</b> · {servidor.origem}
        </p>

        <FormGrid>
          <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField
            label="CPF (login do servidor)"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            inputMode="numeric"
            maxLength={14}
            hint={cpf && !cpfValido ? undefined : "11 dígitos · usado como login"}
            error={cpf && !cpfValido ? "CPF deve ter 11 dígitos" : undefined}
          />
          <SelectField
            label="Vínculo"
            value={vinculo}
            onChange={(e) => setVinculo(e.target.value as AdminServidorUpdate["vinculo"])}
            options={[{ value: "ESTATUTARIO", label: "Estatutário" }, { value: "CLT", label: "CLT" }, { value: "COMISSIONADO", label: "Comissionado" }]}
          />
          <TextField label="Situação funcional" value={situacao} onChange={(e) => setSituacao(e.target.value)} />
          <CurrencyField label="Salário líquido" value={salario} onValueChange={(n) => setSalario(n ?? 0)} />
          <TextField label="Convênio (id)" value={idConvenio} onChange={(e) => setIdConvenio(e.target.value)} />
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as AdminServidor["status"])}
            options={[{ value: "ativo", label: "Ativo" }, { value: "bloqueado", label: "Bloqueado" }, { value: "arquivado", label: "Arquivado" }]}
          />
        </FormGrid>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 12 }}>
            Contato e acesso
          </div>
          <FormGrid>
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="servidor@exemplo.com" />
            <TextField label="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(48) 99999-0000" />
          </FormGrid>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-dim)" }}>
            A senha do servidor não é editável por aqui — apenas o próprio servidor pode alterar, em <b>Conta → Redefinir senha</b>, com verificação por e-mail.
          </div>
        </div>

        {save.isError ? <p style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 12 }}>{(save.error as Error).message}</p> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !nome.trim() || !cpfValido}>
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
