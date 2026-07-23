import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormActions,
  FormGrid,
  NumberField,
  Pill,
  SelectField,
  TextField,
} from "@atlas/ui/web";
import { atlas } from "../../../../lib/sdk";
import type { BancoTabelaInput } from "@atlas/sdk";
import { ApiHttpError } from "@atlas/sdk";

export function BancoTabelaEmprestimosForm() {
  const params = useParams<{ id?: string }>();
  const isNovo = params.id === "novo" || !params.id;
  const id = isNovo ? undefined : params.id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const convenios = useQuery({ queryKey: ["banco", "convenios"], queryFn: () => atlas.banco.convenios() });
  const existing = useQuery({
    queryKey: ["banco", "tabela", id],
    queryFn: () => atlas.banco.getTabela(id!),
    enabled: !!id,
    // Nunca serve cache stale no form de edicao — precisa refletir o que
    // foi salvo na ultima passagem, senao usuario ve o valor antigo.
    staleTime: 0,
    refetchOnMount: "always",
    // Desabilita refetch em foco: se o usuario Alt-Tab enquanto edita
    // partial, o refetch poderia sobrescrever suas alteracoes ainda nao
    // salvas via o useEffect que sincroniza data -> state.
    refetchOnWindowFocus: false,
  });

  const [convenioId, setConvenioId] = useState("");
  const [taxaPct, setTaxaPct] = useState(1.79);
  const [prazoMaxMeses, setPrazoMaxMeses] = useState(120);
  const [vigenciaInicio, setVigenciaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (existing.data) {
      const t = existing.data.tabela;
      setConvenioId(t.convenioId);
      // Migracao suave: taxa unica (taxaAm) preferida; se tabela legada so
      // tem taxaMinAm/taxaMaxAm, usa a max (que era o topo praticado) e
      // proximo save ja persiste como unica.
      const raw = (t as { taxaAm?: number; taxaMaxAm?: number; taxaMinAm?: number });
      setTaxaPct(((raw.taxaAm ?? raw.taxaMaxAm ?? raw.taxaMinAm ?? 0.0179)) * 100);
      setPrazoMaxMeses(t.prazoMaxMeses);
      setVigenciaInicio(t.vigenciaInicio);
      setVigenciaFim(t.vigenciaFim ?? "");
      setAtivo(t.ativo);
    } else if (convenios.data && !convenioId) {
      setConvenioId(convenios.data.convenios[0]?.id ?? "");
    }
  }, [existing.data, convenios.data, convenioId]);

  const convenioSelecionado = useMemo(() => convenios.data?.convenios.find((c) => c.id === convenioId), [convenios.data, convenioId]);
  const convenioNome = convenioSelecionado?.nome ?? "";
  /** Teto de parcelas definido pela averbadora/prefeitura pro convenio selecionado.
   *  Banco nao pode ultrapassar — dropdown esconde opcoes acima e backend
   *  bloqueia com 422 se alguem burlar o UI. */
  const tetoPrefeitura = convenioSelecionado?.maxParcelas ?? 120;
  const opcoesPrazo = useMemo(() => [12, 24, 36, 48, 60, 72, 96, 120].filter((n) => n <= tetoPrefeitura), [tetoPrefeitura]);
  // Se o convenio mudou e o valor atual excede o teto novo, reduz automaticamente.
  useEffect(() => {
    if (prazoMaxMeses > tetoPrefeitura) setPrazoMaxMeses(tetoPrefeitura);
  }, [tetoPrefeitura, prazoMaxMeses]);
  // Teto de taxa e intervalo de vigencia — mesmas regras validadas server-side.
  const taxaTetoPct = convenioSelecionado?.taxaMaxAm ?? null;
  const vigConvInicio = convenioSelecionado?.vigenciaInicio ?? null;
  const vigConvFim = convenioSelecionado?.vigenciaFim ?? null;
  const taxaAcimaTeto = taxaTetoPct != null && taxaPct > taxaTetoPct + 1e-6;
  const vigenciaInicioAntes = !!(vigConvInicio && vigenciaInicio && vigenciaInicio < vigConvInicio);
  const vigenciaFimDepois = !!(vigConvFim && vigenciaFim && vigenciaFim > vigConvFim);
  const vigenciaFimObrigatoria = !!(vigConvFim && !vigenciaFim);

  const save = useMutation({
    mutationFn: () => {
      const body: BancoTabelaInput = {
        id,
        convenioId,
        convenio: convenioNome,
        taxaAm: Number((taxaPct / 100).toFixed(6)),
        prazoMaxMeses,
        vigenciaInicio,
        vigenciaFim: vigenciaFim || undefined,
        ativo,
      };
      return atlas.banco.upsertTabela(body);
    },
    onSuccess: () => {
      // Invalida BOTH: a lista ('tabelas') e o item individual ('tabela', id).
      // Sem invalidar o singular, ao reabrir o form o React Query retornava
      // o cache stale de antes do save — usuario via valor antigo.
      qc.invalidateQueries({ queryKey: ["banco", "tabelas"] });
      if (id) qc.invalidateQueries({ queryKey: ["banco", "tabela", id] });
      // Marketplace do servidor tambem le tabelas (via ofertas): invalidar
      // pra que o servidor veja imediatamente a nova taxa/prazo.
      qc.invalidateQueries({ queryKey: ["servidor", "ofertas"] });
      nav("/banco/cadastros/tabela-emprestimos");
    },
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 840 }}
    >
      <header>
        <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
          Cadastros • Tabela de Empréstimos
        </span>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>{id ? `Editar ${id}` : "Nova tabela"}</h1>
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
          <SelectField
            label="Convênio"
            value={convenioId}
            onChange={(e) => setConvenioId(e.target.value)}
            options={(convenios.data?.convenios ?? []).map((c) => ({ value: c.id, label: c.nome }))}
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
          <NumberField
            label="Taxa (% a.m.)"
            step={0.01}
            value={taxaPct}
            onChange={(e) => setTaxaPct(Number(e.target.value))}
            required
            hint={taxaTetoPct != null
              ? `Teto do convenio: ${taxaTetoPct}% a.m. — a tabela nao pode ultrapassar.`
              : "Taxa mensal unica praticada nesta tabela. Vira o valor que o servidor simula."}
            error={taxaAcimaTeto ? `Acima do teto de ${taxaTetoPct}% a.m. definido pela averbadora.` : undefined}
          />
          {/* Prazo max fechado em opcoes fixas — filtradas pelo TETO DA
              PREFEITURA (convenio.maxParcelas). Servidor simulando so ve
              prazos ate esse teto. */}
          <SelectField
            label="Prazo max (meses)"
            value={String(prazoMaxMeses)}
            onChange={(e) => setPrazoMaxMeses(Number(e.target.value))}
            options={opcoesPrazo.map((n) => ({ value: String(n), label: `${n} meses` }))}
            hint={`Teto da prefeitura: ${tetoPrefeitura} meses. Nao e' possivel exceder esse limite.`}
            required
          />
          <TextField
            label="Vigência início"
            type="date"
            value={vigenciaInicio}
            onChange={(e) => setVigenciaInicio(e.target.value)}
            required
            min={vigConvInicio ?? undefined}
            max={vigConvFim ?? undefined}
            hint={vigConvInicio ? `Convenio inicia em ${vigConvInicio}. A tabela nao pode comecar antes.` : undefined}
            error={vigenciaInicioAntes ? `Antes do inicio do convenio (${vigConvInicio}).` : undefined}
          />
          <TextField
            label="Vigência fim"
            type="date"
            value={vigenciaFim}
            onChange={(e) => setVigenciaFim(e.target.value)}
            min={vigConvInicio ?? undefined}
            max={vigConvFim ?? undefined}
            hint={vigConvFim ? `Obrigatoria: convenio termina em ${vigConvFim}.` : "Opcional. Vazio = aberta"}
            error={vigenciaFimDepois
              ? `Depois do fim do convenio (${vigConvFim}).`
              : vigenciaFimObrigatoria
                ? `Convenio termina em ${vigConvFim} — defina uma data.`
                : undefined}
          />
        </FormGrid>
      </section>

      {convenioSelecionado && (convenioSelecionado.taxaMaxAm != null || convenioSelecionado.vinculosAceitos.length > 0 || convenioSelecionado.regrasEspeciais) ? (
        <section
          style={{
            background: "color-mix(in srgb, var(--gold-500) 6%, var(--bg-elev))",
            border: "1px solid color-mix(in srgb, var(--gold-500) 40%, var(--border))",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, color: "var(--gold-500)", textTransform: "uppercase" }}>
                Regras do convênio
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                Definidas pela averbadora + prefeitura. Somente leitura — sua tabela precisa respeitar esses limites.
              </div>
            </div>
            {convenioSelecionado.configAtivo != null ? (
              <Pill variant={convenioSelecionado.configAtivo ? "averbado" : "expirado"}>
                {convenioSelecionado.configAtivo ? "Vigente" : "Suspenso"}
              </Pill>
            ) : null}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              fontSize: 13,
            }}
          >
            {convenioSelecionado.taxaMaxAm != null ? (
              <RegraCard label="Taxa a.m. (teto)" value={`${convenioSelecionado.taxaMaxAm}%`} />
            ) : null}
            <RegraCard label="Máx. parcelas" value={String(convenioSelecionado.maxParcelas)} />
            {convenioSelecionado.maxComprometimentoPct != null ? (
              <RegraCard label="Máx. comprometimento" value={`${Math.round(convenioSelecionado.maxComprometimentoPct * 100)}%`} />
            ) : null}
            {convenioSelecionado.idadeMin != null && convenioSelecionado.idadeMax != null ? (
              <RegraCard label="Faixa etária" value={`${convenioSelecionado.idadeMin}–${convenioSelecionado.idadeMax}`} />
            ) : null}
            {convenioSelecionado.prazoTravaHoras != null ? (
              <RegraCard label="Trava regular" value={`${convenioSelecionado.prazoTravaHoras}h`} />
            ) : null}
            {convenioSelecionado.prazoPortabilidadeDU != null ? (
              <RegraCard label="Trava portabilidade" value={`${convenioSelecionado.prazoPortabilidadeDU} DU`} />
            ) : null}
            {convenioSelecionado.formatoImportacao ? (
              <RegraCard label="Importação" value={convenioSelecionado.formatoImportacao} />
            ) : null}
            {convenioSelecionado.vigenciaInicio ? (
              <RegraCard
                label="Vigência convênio"
                value={`${convenioSelecionado.vigenciaInicio}${convenioSelecionado.vigenciaFim ? ` → ${convenioSelecionado.vigenciaFim}` : " → aberta"}`}
              />
            ) : null}
          </div>
          {convenioSelecionado.vinculosAceitos.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>
                Vínculos aceitos
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {convenioSelecionado.vinculosAceitos.map((v) => (
                  <Pill key={v} variant="averbado">{v}</Pill>
                ))}
              </div>
            </div>
          ) : null}
          {convenioSelecionado.regrasEspeciais ? (
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>
                Regras especiais
              </div>
              <div style={{
                background: "var(--bg-elev-2)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)",
              }}>
                {convenioSelecionado.regrasEspeciais}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {save.error ? (
        <div style={{ color: "var(--danger-500)", fontSize: 13, padding: 12, borderRadius: 8, background: "color-mix(in srgb, var(--danger-500) 8%, transparent)", border: "1px solid var(--danger-500)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {save.error instanceof Error ? save.error.message : "Erro ao salvar"}
          </div>
          {(() => {
            // Backend retorna motivos especificos em `details` (ex.: {prazoMaxMeses:
            // "excede teto da prefeitura"}). Antes so aparecia "Dados invalidos"
            // generico — usuario nao sabia o que corrigir.
            if (!(save.error instanceof ApiHttpError) || !save.error.details) return null;
            const d = save.error.details as Record<string, string>;
            return (
              <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: 12 }}>
                {Object.entries(d).map(([campo, motivo]) => (
                  <li key={campo}><b>{campo}:</b> {String(motivo)}</li>
                ))}
              </ul>
            );
          })()}
        </div>
      ) : null}

      <FormActions>
        <Button variant="ghost" type="button" onClick={() => nav("/banco/cadastros/tabela-emprestimos")}>Cancelar</Button>
        <Button
          type="submit"
          disabled={save.isPending || taxaAcimaTeto || vigenciaInicioAntes || vigenciaFimDepois || vigenciaFimObrigatoria}
        >
          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </FormActions>
    </form>
  );
}

/** Card compacto readonly pro painel "Regras do convenio". */
function RegraCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--bg-elev-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{value}</div>
    </div>
  );
}
