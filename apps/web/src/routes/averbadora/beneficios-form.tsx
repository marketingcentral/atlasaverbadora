import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, TextField, TextareaField } from "@atlas/ui/web";
import { atlas } from "../../lib/sdk";
import type {
  AdminBeneficio, AdminBeneficioInput, CategoriaBeneficio,
  OrigemBeneficio, TipoDesconto, ModoUso, DestaqueBeneficio,
} from "@atlas/sdk";

// ============================================================
// Formulario COMPLETO de beneficio — todas as facetas que um admin de
// averbadora precisa cadastrar num beneficio pra servidor publico consignado.
//
// Estrutura em SECOES COLAPSAVEIS. Comeca com "Identificação" e "Desconto"
// abertas (obrigatorias). As demais o admin abre sob demanda.
// ============================================================

const CATEGORIAS: { id: CategoriaBeneficio; label: string; icone: string }[] = [
  { id: "saude", label: "Saúde", icone: "🩺" },
  { id: "alimentacao", label: "Alimentação", icone: "🍽️" },
  { id: "educacao", label: "Educação", icone: "🎓" },
  { id: "lazer", label: "Lazer", icone: "🎭" },
];

const ORIGENS: { id: OrigemBeneficio; label: string; descricao: string }[] = [
  { id: "averbadora", label: "Averbadora", descricao: "Parceria negociada pela averbadora com comércio local." },
  { id: "banco", label: "Banco parceiro", descricao: "Via cartão consignado do banco." },
  { id: "prefeitura", label: "Prefeitura", descricao: "Benefício direto oferecido pela prefeitura ao servidor." },
  { id: "convenio", label: "Convênio", descricao: "Convênio médico/farmácia da prefeitura." },
];

const TIPOS_DESCONTO: { id: TipoDesconto; label: string }[] = [
  { id: "percentual", label: "Percentual (%)" },
  { id: "valor_fixo", label: "Valor fixo em R$" },
  { id: "preco_especial", label: "Preço especial" },
  { id: "gratuidade", label: "Gratuidade" },
];

const MODOS_USO: { id: ModoUso; label: string; descricao: string }[] = [
  { id: "cartao_consignado", label: "Cartão consignado", descricao: "Servidor paga com o cartão consignado." },
  { id: "matricula", label: "Matrícula", descricao: "Informa a matrícula no parceiro pra validar." },
  { id: "cpf", label: "CPF", descricao: "Só informa o CPF." },
  { id: "codigo", label: "Código promocional", descricao: "Usa um código exclusivo (ex: SERVIDOR2026)." },
  { id: "qr", label: "QR code", descricao: "Escaneia um QR no app do parceiro." },
];

const DESTAQUES: { id: DestaqueBeneficio; label: string; cor: string }[] = [
  { id: "novo", label: "Novo", cor: "var(--emerald-500)" },
  { id: "popular", label: "Popular", cor: "var(--accent)" },
  { id: "exclusivo", label: "Exclusivo", cor: "var(--gold-500)" },
  { id: "desconto_extra", label: "Desconto extra", cor: "var(--danger-500)" },
];

const CORES_SUGERIDAS = ["#dc2626", "#0891b2", "#f59e0b", "#c2410c", "#2563eb", "#7c3aed", "#059669", "#be185d"];
const EMOJIS_SUGERIDOS = ["💊", "🩺", "💉", "🦷", "🍽️", "🛒", "🎓", "📚", "🎭", "🎬", "🏋️", "🎁", "🚗", "☕", "🎯"];

const VINCULOS = ["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"];
const SITUACOES = ["ATIVO", "TRABALHANDO", "FERIAS", "AFASTADO", "LICENCA", "APOSENTADO"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export function AdminBeneficiosForm() {
  const nav = useNavigate();
  const { id } = useParams(); // undefined = novo, string = editar

  const beneficiosQ = useQuery({ queryKey: ["admin", "beneficios"], queryFn: () => atlas.admin.beneficios.list() });
  const prefeiturasQ = useQuery({ queryKey: ["admin", "prefeituras"], queryFn: () => atlas.admin.listPrefeituras() });
  const conveniosQ = useQuery({ queryKey: ["admin", "convenios"], queryFn: () => atlas.admin.listConvenios() });

  const initial = useMemo<AdminBeneficio | null>(() => {
    if (!id) return null;
    return beneficiosQ.data?.beneficios.find((b) => b.id === id) ?? null;
  }, [id, beneficiosQ.data]);

  const [form, setForm] = useState<AdminBeneficioInput>({
    prefeituraId: 1,
    nome: "",
    categorias: ["saude"],
    local: "",
    icone: "🎁",
    cor: "#059669",
    descontoLabel: "",
    descontoComplemento: "",
    origem: "averbadora",
    ativo: true,
  });
  useEffect(() => {
    if (initial) setForm(initial);
    else if (prefeiturasQ.data?.prefeituras[0]) setForm((f) => ({ ...f, prefeituraId: prefeiturasQ.data.prefeituras[0]!.id }));
  }, [initial, prefeiturasQ.data]);

  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => atlas.admin.beneficios.upsert({ ...form, id: initial?.id }),
    onSuccess: () => {
      nav("/averbadora/beneficios");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Erro ao salvar"),
  });

  function set<K extends keyof AdminBeneficioInput>(key: K, valor: AdminBeneficioInput[K]): void {
    setForm((f) => ({ ...f, [key]: valor }));
  }

  function toggleArrayItem<T extends string | number>(list: T[] | undefined, item: T): T[] {
    const cur = list ?? [];
    return cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
  }

  const prefeituras = prefeiturasQ.data?.prefeituras ?? [];
  const convenios = conveniosQ.data?.convenios ?? [];
  const conveniosDaPref = convenios.filter((cv) => cv.prefeituraId === form.prefeituraId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <button
            type="button"
            onClick={() => nav("/averbadora/beneficios")}
            style={{
              background: "transparent", border: 0, color: "var(--text-muted)",
              fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 4,
            }}
          >
            ← Voltar
          </button>
          <span style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
            Averbadora
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem" }}>
            {initial ? `Editar: ${initial.nome}` : "Novo benefício"}
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 13, maxWidth: 660 }}>
            Cadastre todos os detalhes do parceiro. Só as seções <b>Identificação</b> e <b>Desconto</b> são obrigatórias — as demais dão contexto e melhoram a experiência do servidor.
          </p>
        </div>
      </header>

      {/* ============ 1. IDENTIFICACAO ============ */}
      <Secao titulo="Identificação" descricao="Nome, categoria e visual do card." icone="🏷️" defaultOpen>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Nome do parceiro *" value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: Farmácia São João" required />
          <TextField label="CNPJ (opcional)" value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
        </div>

        <TextField label="Descrição curta (aparece no card)" value={form.descricaoCurta ?? ""} onChange={(e) => set("descricaoCurta", e.target.value)} placeholder="Ex.: Rede de farmácias com atendimento 24h em Palhoça" maxLength={280} />

        <FieldGroup label="Categorias *">
          {CATEGORIAS.map((c) => {
            const on = form.categorias.includes(c.id);
            return (
              <Chip key={c.id} on={on} onClick={() => set("categorias", toggleArrayItem(form.categorias, c.id) as CategoriaBeneficio[])}>
                {c.icone} {c.label}
              </Chip>
            );
          })}
        </FieldGroup>

        <FieldGroup label="Origem *">
          {ORIGENS.map((o) => (
            <OpcaoRadio
              key={o.id}
              on={form.origem === o.id}
              titulo={o.label}
              descricao={o.descricao}
              onClick={() => set("origem", o.id)}
            />
          ))}
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={fieldLabelStyle}>Ícone (emoji)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {EMOJIS_SUGERIDOS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => set("icone", e)}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: form.icone === e ? "2px solid var(--emerald-500)" : "1px solid var(--border-strong)",
                    background: form.icone === e ? "color-mix(in srgb, var(--emerald-500) 15%, transparent)" : "transparent",
                    fontSize: 20, cursor: "pointer",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.icone}
              onChange={(e) => set("icone", e.target.value)}
              placeholder="Ou digite outro"
              maxLength={8}
              style={{ ...selectStyle, fontSize: 18, textAlign: "center" }}
            />
          </div>

          <div>
            <div style={fieldLabelStyle}>Cor de destaque</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CORES_SUGERIDAS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => set("cor", cor)}
                  aria-label={`Cor ${cor}`}
                  style={{
                    width: 32, height: 32, borderRadius: 6, background: cor,
                    border: form.cor === cor ? "3px solid var(--text)" : "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                />
              ))}
              <input
                type="color"
                value={form.cor}
                onChange={(e) => set("cor", e.target.value)}
                style={{ width: 32, height: 32, cursor: "pointer", background: "transparent", border: "1px solid var(--border-strong)", borderRadius: 6 }}
                title="Cor personalizada"
              />
            </div>
          </div>
        </div>

        <TextField
          label="Logo (URL da imagem — opcional)"
          value={form.logoUrl ?? ""}
          onChange={(e) => set("logoUrl", e.target.value)}
          placeholder="https://..."
        />

        <FieldGroup label="Destaque (opcional — vira badge no card)">
          <Chip on={!form.destaque} onClick={() => set("destaque", undefined)}>Nenhum</Chip>
          {DESTAQUES.map((d) => (
            <Chip key={d.id} on={form.destaque === d.id} onClick={() => set("destaque", d.id)}>
              {d.label}
            </Chip>
          ))}
        </FieldGroup>
      </Secao>

      {/* ============ 2. DESCONTO ============ */}
      <Secao titulo="Desconto e vantagem" descricao="O que o servidor ganha usando o benefício." icone="💰" defaultOpen>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Título do desconto (aparece no card) *" value={form.descontoLabel} onChange={(e) => set("descontoLabel", e.target.value)} placeholder="Ex.: 10% desconto" required />
          <TextField label="Complemento *" value={form.descontoComplemento} onChange={(e) => set("descontoComplemento", e.target.value)} placeholder="Ex.: em medicamentos" required />
        </div>

        <FieldGroup label="Tipo de desconto">
          {TIPOS_DESCONTO.map((t) => (
            <Chip
              key={t.id}
              on={(form.desconto?.tipo ?? "percentual") === t.id}
              onClick={() => set("desconto", { ...(form.desconto ?? {}), tipo: t.id })}
            >
              {t.label}
            </Chip>
          ))}
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <TextField
            label={form.desconto?.tipo === "percentual" ? "Percentual (%)" : "Valor (R$)"}
            type="number"
            value={form.desconto?.valor != null ? String(form.desconto.valor) : ""}
            onChange={(e) => set("desconto", { ...(form.desconto ?? { tipo: "percentual" }), valor: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Ex.: 10"
            disabled={form.desconto?.tipo === "gratuidade"}
          />
          <TextField
            label="Limite mensal por servidor (R$)"
            type="number"
            value={form.desconto?.limiteMensal != null ? String(form.desconto.limiteMensal) : ""}
            onChange={(e) => set("desconto", { ...(form.desconto ?? { tipo: "percentual" }), limiteMensal: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Opcional"
          />
          <TextField
            label="Comissão da averbadora (%)"
            type="number"
            value={form.comissaoPct != null ? String(form.comissaoPct) : ""}
            onChange={(e) => set("comissaoPct", e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Ex.: 2.5"
          />
        </div>

        <TextField
          label="Aplicável em"
          value={form.desconto?.aplicavelEm ?? ""}
          onChange={(e) => set("desconto", { ...(form.desconto ?? { tipo: "percentual" }), aplicavelEm: e.target.value })}
          placeholder="Ex.: medicamentos genéricos, todo o cardápio, matrículas novas"
        />

        <label style={checkboxLabel}>
          <input
            type="checkbox"
            checked={form.desconto?.cumulativo ?? false}
            onChange={(e) => set("desconto", { ...(form.desconto ?? { tipo: "percentual" }), cumulativo: e.target.checked })}
          />
          Cumulativo com outros descontos
        </label>

        <TextareaField
          label="Restrições (texto livre)"
          value={form.restricoes ?? ""}
          onChange={(e) => set("restricoes", e.target.value)}
          placeholder="Ex.: Não válido em produtos em promoção. Máx. 1 uso por dia."
          rows={3}
        />
      </Secao>

      {/* ============ 3. ENDERECO E CONTATO ============ */}
      <Secao titulo="Endereço e contato" descricao="Onde e como o servidor encontra o parceiro." icone="📍">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr 1fr", gap: 12 }}>
          <TextField label="CEP" value={form.endereco?.cep ?? ""} onChange={(e) => set("endereco", { ...form.endereco, cep: e.target.value })} placeholder="00000-000" />
          <TextField label="Logradouro" value={form.endereco?.logradouro ?? ""} onChange={(e) => set("endereco", { ...form.endereco, logradouro: e.target.value })} placeholder="Rua Principal" />
          <TextField label="Número" value={form.endereco?.numero ?? ""} onChange={(e) => set("endereco", { ...form.endereco, numero: e.target.value })} placeholder="123" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Complemento" value={form.endereco?.complemento ?? ""} onChange={(e) => set("endereco", { ...form.endereco, complemento: e.target.value })} placeholder="Sala 4" />
          <TextField label="Bairro" value={form.endereco?.bairro ?? ""} onChange={(e) => set("endereco", { ...form.endereco, bairro: e.target.value })} placeholder="Centro" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12 }}>
          <TextField label="Cidade" value={form.endereco?.cidade ?? ""} onChange={(e) => set("endereco", { ...form.endereco, cidade: e.target.value })} placeholder="Palhoça" />
          <div>
            <div style={fieldLabelStyle}>UF</div>
            <select value={form.endereco?.uf ?? ""} onChange={(e) => set("endereco", { ...form.endereco, uf: e.target.value })} style={selectStyle}>
              <option value="">—</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <TextField label="Local (bairro/cidade que aparece no card) *" value={form.local} onChange={(e) => set("local", e.target.value)} placeholder="Ex.: Palhoça Centro" required />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Telefone" value={form.contato?.telefone ?? ""} onChange={(e) => set("contato", { ...form.contato, telefone: e.target.value })} placeholder="(48) 3000-0000" />
          <TextField label="WhatsApp" value={form.contato?.whatsapp ?? ""} onChange={(e) => set("contato", { ...form.contato, whatsapp: e.target.value })} placeholder="(48) 99999-9999" />
          <TextField label="E-mail" type="email" value={form.contato?.email ?? ""} onChange={(e) => set("contato", { ...form.contato, email: e.target.value })} placeholder="contato@parceiro.com" />
          <TextField label="Site" value={form.contato?.site ?? ""} onChange={(e) => set("contato", { ...form.contato, site: e.target.value })} placeholder="https://..." />
          <TextField label="Instagram" value={form.contato?.instagram ?? ""} onChange={(e) => set("contato", { ...form.contato, instagram: e.target.value })} placeholder="@parceiro" />
        </div>
      </Secao>

      {/* ============ 4. COMO O SERVIDOR USA ============ */}
      <Secao titulo="Como o servidor usa" descricao="Como o servidor comprova o benefício no parceiro." icone="🎫">
        <FieldGroup label="Modo de identificação">
          {MODOS_USO.map((m) => (
            <OpcaoRadio
              key={m.id}
              on={form.comoUsar?.modo === m.id}
              titulo={m.label}
              descricao={m.descricao}
              onClick={() => set("comoUsar", { ...(form.comoUsar ?? {}), modo: m.id })}
            />
          ))}
        </FieldGroup>

        {form.comoUsar?.modo === "codigo" ? (
          <TextField
            label="Código promocional *"
            value={form.comoUsar?.codigoPromocional ?? ""}
            onChange={(e) => set("comoUsar", { ...(form.comoUsar ?? { modo: "codigo" }), codigoPromocional: e.target.value.toUpperCase() })}
            placeholder="SERVIDOR2026"
          />
        ) : null}

        <TextareaField
          label="Instruções pro servidor"
          value={form.comoUsar?.instrucoes ?? ""}
          onChange={(e) => set("comoUsar", { ...(form.comoUsar ?? { modo: "cartao_consignado" }), instrucoes: e.target.value })}
          placeholder="Ex.: Chegue com sua matrícula em mãos. Peça a promoção 'Servidor Atlas' no caixa."
          rows={3}
        />
      </Secao>

      {/* ============ 5. PUBLICO-ALVO ============ */}
      <Secao titulo="Público-alvo" descricao="Deixe vazio pra atingir todos os elegíveis desta prefeitura." icone="🎯">
        <FieldGroup label="Convênios elegíveis">
          {conveniosDaPref.length === 0 ? (
            <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Nenhum convênio nesta prefeitura.</span>
          ) : conveniosDaPref.map((cv) => {
            const on = form.filtro?.convenioIds?.includes(cv.id) ?? false;
            return (
              <Chip key={cv.id} on={on} onClick={() => set("filtro", { ...form.filtro, convenioIds: toggleArrayItem(form.filtro?.convenioIds, cv.id) as string[] })}>
                {cv.nome}
              </Chip>
            );
          })}
        </FieldGroup>

        <FieldGroup label="Vínculos">
          {VINCULOS.map((v) => {
            const on = form.filtro?.vinculos?.includes(v) ?? false;
            return (
              <Chip key={v} on={on} onClick={() => set("filtro", { ...form.filtro, vinculos: toggleArrayItem(form.filtro?.vinculos, v) as string[] })}>
                {v}
              </Chip>
            );
          })}
        </FieldGroup>

        <FieldGroup label="Situação funcional">
          {SITUACOES.map((s) => {
            const on = form.filtro?.situacaoFuncional?.includes(s) ?? false;
            return (
              <Chip key={s} on={on} onClick={() => set("filtro", { ...form.filtro, situacaoFuncional: toggleArrayItem(form.filtro?.situacaoFuncional, s) as string[] })}>
                {s}
              </Chip>
            );
          })}
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <TextField label="Salário mín. (R$)" type="number" value={form.filtro?.salarioMin != null ? String(form.filtro.salarioMin) : ""} onChange={(e) => set("filtro", { ...form.filtro, salarioMin: e.target.value ? Number(e.target.value) : undefined })} />
          <TextField label="Salário máx. (R$)" type="number" value={form.filtro?.salarioMax != null ? String(form.filtro.salarioMax) : ""} onChange={(e) => set("filtro", { ...form.filtro, salarioMax: e.target.value ? Number(e.target.value) : undefined })} />
          <TextField label="Idade mín." type="number" value={form.filtro?.idadeMin != null ? String(form.filtro.idadeMin) : ""} onChange={(e) => set("filtro", { ...form.filtro, idadeMin: e.target.value ? Number(e.target.value) : undefined })} />
          <TextField label="Idade máx." type="number" value={form.filtro?.idadeMax != null ? String(form.filtro.idadeMax) : ""} onChange={(e) => set("filtro", { ...form.filtro, idadeMax: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </Secao>

      {/* ============ 6. VIGENCIA E HORARIOS ============ */}
      <Secao titulo="Vigência e horários" descricao="Quando o benefício vale." icone="🕒">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Início" type="date" value={form.vigencia?.inicio ?? ""} onChange={(e) => set("vigencia", { ...form.vigencia, inicio: e.target.value })} />
          <TextField label="Fim (opcional — sem fim = permanente)" type="date" value={form.vigencia?.fim ?? ""} onChange={(e) => set("vigencia", { ...form.vigencia, fim: e.target.value })} />
        </div>

        <FieldGroup label="Dias da semana permitidos">
          {DIAS_SEMANA.map((d, idx) => {
            const on = form.vigencia?.diasSemana?.includes(idx) ?? false;
            return (
              <Chip key={idx} on={on} onClick={() => set("vigencia", { ...form.vigencia, diasSemana: toggleArrayItem(form.vigencia?.diasSemana, idx) as number[] })}>
                {d}
              </Chip>
            );
          })}
        </FieldGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Hora início" type="time" value={form.vigencia?.horaInicio ?? ""} onChange={(e) => set("vigencia", { ...form.vigencia, horaInicio: e.target.value })} />
          <TextField label="Hora fim" type="time" value={form.vigencia?.horaFim ?? ""} onChange={(e) => set("vigencia", { ...form.vigencia, horaFim: e.target.value })} />
        </div>
      </Secao>

      {/* ============ 7. PREFEITURA(S) ============ */}
      <Secao titulo="Prefeitura(s)" descricao="Onde o benefício aparece pros servidores." icone="🏛️" defaultOpen>
        <div>
          <div style={fieldLabelStyle}>Prefeitura principal *</div>
          <select
            value={form.prefeituraId}
            onChange={(e) => set("prefeituraId", Number(e.target.value))}
            style={selectStyle}
          >
            {prefeituras.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}/{p.uf}</option>
            ))}
          </select>
        </div>

        <FieldGroup label="Prefeituras adicionais (opcional — mesmo benefício em várias cidades)">
          {prefeituras.filter((p) => p.id !== form.prefeituraId).map((p) => {
            const on = form.prefeituraIdsExtras?.includes(p.id) ?? false;
            return (
              <Chip key={p.id} on={on} onClick={() => set("prefeituraIdsExtras", toggleArrayItem(form.prefeituraIdsExtras, p.id) as number[])}>
                {p.nome}/{p.uf}
              </Chip>
            );
          })}
        </FieldGroup>
      </Secao>

      {/* ============ 8. DESCRICAO LONGA / MARKETING ============ */}
      <Secao titulo="Descrição completa" descricao="Aparece na tela de detalhes do benefício no app do servidor." icone="📝">
        <TextareaField
          label="Descrição longa"
          value={form.descricaoLonga ?? ""}
          onChange={(e) => set("descricaoLonga", e.target.value)}
          placeholder="Ex.: A Farmácia São João é uma rede de farmácias com atendimento 24h nas 3 unidades de Palhoça..."
          rows={6}
          maxLength={4000}
        />
      </Secao>

      {/* ============ 9. RESPONSAVEL ============ */}
      <Secao titulo="Contato do responsável na parceira" descricao="Interno — só a averbadora vê." icone="👤">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextField label="Nome" value={form.responsavel?.nome ?? ""} onChange={(e) => set("responsavel", { ...form.responsavel, nome: e.target.value })} placeholder="Maria Silva" />
          <TextField label="Cargo" value={form.responsavel?.cargo ?? ""} onChange={(e) => set("responsavel", { ...form.responsavel, cargo: e.target.value })} placeholder="Diretora Comercial" />
          <TextField label="E-mail" type="email" value={form.responsavel?.email ?? ""} onChange={(e) => set("responsavel", { ...form.responsavel, email: e.target.value })} />
          <TextField label="Telefone" value={form.responsavel?.telefone ?? ""} onChange={(e) => set("responsavel", { ...form.responsavel, telefone: e.target.value })} placeholder="(48) 99999-9999" />
        </div>
      </Secao>

      {/* ============ 10. NOTAS INTERNAS ============ */}
      <Secao titulo="Notas internas" descricao="Só a averbadora vê. Ideal pra registrar detalhes de negociação, prazos, etc." icone="📌">
        <TextareaField
          label="Notas internas"
          value={form.notasInternas ?? ""}
          onChange={(e) => set("notasInternas", e.target.value)}
          placeholder="Ex.: Contrato renovado até 12/2026. Comissão negociada com o Ricardo em jun/26."
          rows={4}
          maxLength={2000}
        />
      </Secao>

      {/* ============ Publicar + Salvar ============ */}
      <Card style={{ position: "sticky", bottom: 16, borderColor: "var(--gold-500)", zIndex: 10 }}>
        <label style={checkboxLabel}>
          <input type="checkbox" checked={form.ativo ?? true} onChange={(e) => set("ativo", e.target.checked)} />
          <div>
            <b>Publicar imediatamente</b> (aparece para os servidores da prefeitura selecionada)
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Você pode salvar como rascunho desmarcando esta opção e ativar depois na tela de lista.
            </div>
          </div>
        </label>

        {error ? (
          <div style={{ color: "var(--danger-500)", fontSize: 13, marginTop: 12 }}>{error}</div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <Button variant="ghost" onClick={() => nav("/averbadora/beneficios")}>Cancelar</Button>
          <Button
            disabled={save.isPending || !form.nome || !form.local || !form.descontoLabel || !form.descontoComplemento}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando..." : (initial ? "Salvar alterações" : "Criar benefício")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// UI helpers — reusaveis nesta tela
// ============================================================

function Secao({
  titulo, descricao, icone, defaultOpen, children,
}: {
  titulo: string; descricao?: string; icone?: string;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <Card style={{ padding: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", padding: "16px 20px", background: "transparent", border: 0, textAlign: "left",
          display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
        }}
      >
        {icone ? <span style={{ fontSize: 20 }}>{icone}</span> : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{titulo}</div>
          {descricao ? <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{descricao}</div> : null}
        </div>
        <span style={{ fontSize: 18, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ height: 6 }} />
          {children}
        </div>
      ) : null}
    </Card>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px", borderRadius: 999, border: "1px solid",
        borderColor: on ? "var(--emerald-500)" : "var(--border-strong)",
        background: on ? "var(--emerald-500)" : "transparent",
        color: on ? "var(--navy-900)" : "var(--text)",
        cursor: "pointer", fontSize: 13, fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function OpcaoRadio({
  on, titulo, descricao, onClick,
}: {
  on: boolean; titulo: string; descricao?: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: "1 1 220px",
        minWidth: 200,
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid",
        borderColor: on ? "var(--emerald-500)" : "var(--border-strong)",
        background: on ? "color-mix(in srgb, var(--emerald-500) 10%, transparent)" : "transparent",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{titulo}</div>
      {descricao ? <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{descricao}</div> : null}
    </button>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  marginBottom: 6,
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--bg)", color: "var(--text)",
  fontSize: 14, fontFamily: "inherit",
  boxSizing: "border-box", width: "100%", cursor: "pointer",
};

const checkboxLabel: React.CSSProperties = {
  display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)",
  cursor: "pointer",
};
