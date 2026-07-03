import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  CurrencyField,
  FormActions,
  FormGrid,
  NumberField,
  TextField,
  TextareaField,
} from "@atlas/ui/web";
import { atlas } from "../../../lib/sdk";
import type { NovoContratoBody } from "@atlas/sdk";

type Modo = "averbar" | "reservar";
type Tipo = "EMPRESTIMO" | "REFIN" | "COMPOSTA" | "PORTABILIDADE";

interface Props {
  modo: Modo;
  tipo: Tipo;
}

const TITULOS: Record<Tipo, { averbar: string; reservar: string }> = {
  EMPRESTIMO: { averbar: "Averbar Empréstimo", reservar: "Reservar Empréstimo" },
  REFIN: { averbar: "Averbar Refinanciamento", reservar: "Reservar Refinanciamento" },
  COMPOSTA: { averbar: "Averbar Composta", reservar: "Reservar Composta" },
  PORTABILIDADE: { averbar: "Averbar Portabilidade", reservar: "Reservar Portabilidade" },
};

export function OperacaoForm({ modo, tipo }: Props) {
  const { idMatricula = "" } = useParams<{ idMatricula: string }>();
  const nav = useNavigate();

  const ficha = useQuery({
    queryKey: ["banco", "margem", idMatricula],
    queryFn: () => atlas.banco.margemBuscar({ matricula: idMatricula.replace(/^MAT-/, "") }),
    enabled: !!idMatricula,
  });

  const [valor, setValor] = useState<number | null>(5000);
  const [parcelas, setParcelas] = useState<number>(36);
  const [taxaPct, setTaxaPct] = useState<number>(1.79);
  const [carencia, setCarencia] = useState<number>(0);
  const [observacoes, setObservacoes] = useState<string>("");
  const [contratoOrigem, setContratoOrigem] = useState<string>("");
  const [bancoOrigem, setBancoOrigem] = useState<string>("");
  const [saldoOrigem, setSaldoOrigem] = useState<number | null>(null);
  const [valorRefin, setValorRefin] = useState<number | null>(null);

  const taxaAm = useMemo(() => Number((taxaPct / 100).toFixed(6)), [taxaPct]);
  const parcelaEstimada = useMemo(() => {
    if (!valor || valor <= 0 || parcelas <= 0 || taxaAm <= 0) return null;
    return (valor * taxaAm) / (1 - Math.pow(1 + taxaAm, -parcelas));
  }, [valor, parcelas, taxaAm]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!valor) throw new Error("Informe o valor");
      const body: NovoContratoBody = {
        idMatricula,
        valor,
        parcelas,
        taxaAm,
        diasCarencia: carencia,
        observacoes: observacoes || undefined,
        contratoOrigem: contratoOrigem || undefined,
        bancoOrigem: bancoOrigem || undefined,
        saldoDevedorOrigem: saldoOrigem ?? undefined,
        valorRefin: valorRefin ?? undefined,
      };
      return modo === "averbar" ? atlas.banco.averbar(tipo, body) : atlas.banco.reservar(tipo, body);
    },
    onSuccess: () => {
      nav("/banco/carteira");
    },
  });

  if (ficha.isLoading) return <div style={{ color: "var(--text-muted)" }}>Carregando...</div>;
  if (!ficha.data) return <div style={{ color: "var(--danger-500)" }}>Colaborador não encontrado.</div>;
  const f = ficha.data.ficha;

  const exigeOrigem = tipo === "REFIN" || tipo === "PORTABILIDADE" || tipo === "COMPOSTA";

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        mutation.mutate();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 960 }}
    >
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          {modo === "averbar" ? "Averbação direta" : "Reserva pré-contrato"}
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{TITULOS[tipo][modo]}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Colaborador: <b>{f.nome}</b> — Matrícula {f.matricula} — {f.origem}
        </p>
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
        <h3 style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>Dados da operação</h3>
        <FormGrid cols={3}>
          <CurrencyField
            label="Valor financiado"
            value={valor}
            onValueChange={setValor}
            required
            hint="Valor bruto antes de IOF/tarifas"
          />
          <NumberField
            label="Parcelas"
            value={parcelas}
            onChange={(e) => setParcelas(Number(e.target.value))}
            min={1}
            max={120}
            required
          />
          <NumberField
            label="Taxa mensal (%)"
            step={0.01}
            value={taxaPct}
            onChange={(e) => setTaxaPct(Number(e.target.value))}
            required
          />
          <NumberField
            label="Dias de carência"
            value={carencia}
            onChange={(e) => setCarencia(Number(e.target.value))}
            min={0}
            max={180}
          />
          <TextField
            label="Parcela estimada"
            value={parcelaEstimada ? `R$ ${parcelaEstimada.toFixed(2)}` : "—"}
            readOnly
          />
          <TextField
            label="Tipo de contrato"
            value={tipo}
            readOnly
          />
        </FormGrid>
      </section>

      {exigeOrigem ? (
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
          <h3 style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
            {tipo === "PORTABILIDADE" ? "Origem da portabilidade" : "Origem do refinanciamento"}
          </h3>
          <FormGrid cols={3}>
            <TextField
              label={tipo === "PORTABILIDADE" ? "Banco de origem" : "Contrato a refinanciar"}
              value={tipo === "PORTABILIDADE" ? bancoOrigem : contratoOrigem}
              onChange={(e) => (tipo === "PORTABILIDADE" ? setBancoOrigem(e.target.value) : setContratoOrigem(e.target.value))}
              required
            />
            <TextField
              label="Contrato/ADF de origem"
              value={contratoOrigem}
              onChange={(e) => setContratoOrigem(e.target.value)}
              required
            />
            <CurrencyField label="Saldo devedor" value={saldoOrigem} onValueChange={setSaldoOrigem} required />
            {tipo === "COMPOSTA" ? (
              <CurrencyField label="Valor refin" value={valorRefin} onValueChange={setValorRefin} />
            ) : null}
          </FormGrid>
        </section>
      ) : null}

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
        <h3 style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>Observações</h3>
        <TextareaField
          label="Observações internas"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          hint="Texto livre para auditoria. Não aparece para o servidor."
        />
      </section>

      {mutation.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 13 }}>
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao enviar"}
        </div>
      ) : null}

      <FormActions>
        <Button variant="ghost" type="button" onClick={() => nav(`/banco/margem-contratacao/${idMatricula}`)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Enviando..." : modo === "averbar" ? "Averbar →" : "Criar reserva →"}
        </Button>
      </FormActions>
    </form>
  );
}
