import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormActions,
  FormGrid,
  SelectField,
  TextField,
  TextareaField,
} from "@atlas/ui/web";
import { atlas } from "../../../../lib/sdk";
import type { BancoPerfil, BancoUsuarioInput } from "@atlas/sdk";

const PERFIS: { value: BancoPerfil; label: string; descricao: string }[] = [
  { value: "admin", label: "Admin", descricao: "Acesso total + gerencia outros usuários do banco" },
  { value: "operador", label: "Operador", descricao: "Averbação + reserva + gerencia contratos" },
  { value: "consulta", label: "Consulta", descricao: "Somente leitura de margens e contratos" },
  { value: "relatorios", label: "Relatórios", descricao: "Somente leitura + acesso a relatórios e export" },
];

export function BancoUsuariosForm() {
  const params = useParams<{ id?: string }>();
  const isNovo = params.id === "novo" || !params.id;
  const id = isNovo ? undefined : params.id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ["banco", "usuario", id],
    queryFn: () => atlas.banco.getUsuario(id!),
    enabled: !!id,
  });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpfMasked, setCpfMasked] = useState("***.***.***-**");
  const [organizacao, setOrganizacao] = useState("46177 - DELTA GLOBAL SOCIEDADE DE CREDITO DIRETO S A");
  const [perfil, setPerfil] = useState<BancoPerfil>("operador");
  const [ipsRaw, setIpsRaw] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (existing.data) {
      const u = existing.data.usuario;
      setNome(u.nome);
      setEmail(u.email);
      setCpfMasked(u.cpfMasked);
      setOrganizacao(u.organizacao);
      setPerfil(u.perfil);
      setIpsRaw(u.ipsPermitidos.join("\n"));
      setAtivo(u.ativo);
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () => {
      const body: BancoUsuarioInput = {
        id,
        nome,
        email,
        cpfMasked,
        organizacao,
        perfil,
        ipsPermitidos: ipsRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        ativo,
      };
      return atlas.banco.upsertUsuario(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banco", "usuarios"] });
      nav("/banco/cadastros/usuarios");
    },
  });

  const perfilInfo = PERFIS.find((p) => p.value === perfil);

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 960 }}
    >
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Cadastros • Usuários
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{id ? `Editar ${id}` : "Novo usuário"}</h1>
      </header>

      <section
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <FormGrid cols={2}>
          <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <TextField label="Login (email/identificador)" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="CPF (mascarado)" value={cpfMasked} onChange={(e) => setCpfMasked(e.target.value)} />
          <TextField label="Organização" value={organizacao} onChange={(e) => setOrganizacao(e.target.value)} />
          <SelectField
            label="Perfil"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value as BancoPerfil)}
            options={PERFIS.map((p) => ({ value: p.value, label: p.label }))}
            hint={perfilInfo?.descricao}
            required
          />
          <SelectField
            label="Situação"
            value={ativo ? "1" : "0"}
            onChange={(e) => setAtivo(e.target.value === "1")}
            options={[
              { value: "1", label: "Ativo" },
              { value: "0", label: "Inativo" },
            ]}
          />
        </FormGrid>
        <TextareaField
          label="IPs permitidos (allowlist)"
          value={ipsRaw}
          onChange={(e) => setIpsRaw(e.target.value)}
          placeholder="Ex: 189.45.10.0/24, 200.150.20.42"
          hint="Um por linha ou separados por vírgula. Vazio = qualquer IP."
        />
      </section>

      {save.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 13 }}>
          {save.error instanceof Error ? save.error.message : "Erro ao salvar"}
        </div>
      ) : null}

      <FormActions>
        <Button variant="ghost" type="button" onClick={() => nav("/banco/cadastros/usuarios")}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
      </FormActions>
    </form>
  );
}
