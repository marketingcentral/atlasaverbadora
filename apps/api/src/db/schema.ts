import { boolean, integer, jsonb, numeric, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["servidor", "banco", "averbadora", "prefeitura"]);
export const servidorStatusEnum = pgEnum("servidor_status", ["ativo", "bloqueado", "arquivado"]);
export const vinculoEnum = pgEnum("vinculo", ["CLT", "ESTATUTARIO", "COMISSIONADO"]);
export const situacaoEnum = pgEnum("situacao_funcional", ["ATIVO", "FERIAS", "AFASTADO", "LICENCA", "LICENCA_REMUNERADA", "APOSENTADO"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }),
  cpf: varchar("cpf", { length: 11 }),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  bancoId: integer("banco_id"),
  servidorId: integer("servidor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_uq").on(t.email),
  cpfIdx: uniqueIndex("users_cpf_uq").on(t.cpf),
}));

export const prefeituras = pgTable("prefeituras", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  uf: varchar("uf", { length: 2 }).notNull(),
  municipioIbge: integer("municipio_ibge").notNull(),
  modoIntegracao: varchar("modo_integracao", { length: 16 }).notNull().default("MANUAL"),
  status: varchar("status", { length: 16 }).notNull().default("ativo"),
  ultimaSincronizacao: timestamp("ultima_sincronizacao", { withTimezone: true }),
  // Campos extras do admin (loginEmail, passwordHash, servidoresCount). Coluna
  // adicionada em runtime via ensureSchema() por ainda não haver migração dedicada.
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const servidores = pgTable("servidores", {
  id: serial("id").primaryKey(),
  prefeituraId: integer("prefeitura_id").notNull().references(() => prefeituras.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 11 }).notNull(),
  matricula: varchar("matricula", { length: 64 }).notNull(),
  vinculo: vinculoEnum("vinculo").notNull(),
  situacaoFuncional: situacaoEnum("situacao_funcional").notNull(),
  status: servidorStatusEnum("status").notNull().default("ativo"),
  dataNascimento: timestamp("data_nascimento", { mode: "string" }),
  salarioBase: numeric("salario_base", { precision: 12, scale: 2 }),
  // Snapshot completo do ServidorBuscaMock (idMatricula, origem, idConvenio, cargo,
  // endereco, email, telefone, codigoIbge, cpfMasked, dataAdmissao, passwordHash).
  // Coluna adicionada em runtime via ensureSchema().
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  cpfMatIdx: uniqueIndex("servidores_cpf_matricula_uq").on(t.cpf, t.matricula),
}));

export const bancos = pgTable("bancos", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  adapter: varchar("adapter", { length: 32 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("ativo"),
  dominiosEmail: jsonb("dominios_email").$type<string[]>().default([]),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const propostas = pgTable("propostas", {
  id: varchar("id", { length: 32 }).primaryKey(),
  servidorId: integer("servidor_id").notNull().references(() => servidores.id),
  bancoId: integer("banco_id").notNull().references(() => bancos.id),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  parcelas: integer("parcelas").notNull(),
  taxaAm: numeric("taxa_am", { precision: 7, scale: 6 }).notNull(),
  cetAm: numeric("cet_am", { precision: 7, scale: 6 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  adf: varchar("adf", { length: 64 }),
  criadaEm: timestamp("criada_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadaEm: timestamp("atualizada_em", { withTimezone: true }).defaultNow().notNull(),
});

export const propostaEventos = pgTable("proposta_eventos", {
  id: serial("id").primaryKey(),
  propostaId: varchar("proposta_id", { length: 32 }).notNull().references(() => propostas.id),
  evento: varchar("evento", { length: 64 }).notNull(),
  deEstado: varchar("de_estado", { length: 32 }),
  paraEstado: varchar("para_estado", { length: 32 }).notNull(),
  direcao: varchar("direcao", { length: 4 }).notNull(),
  ator: varchar("ator", { length: 64 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }),
  idempotencyKey: varchar("idempotency_key", { length: 64 }),
  statusHttp: integer("status_http"),
  duracaoMs: integer("duracao_ms"),
  traceId: varchar("trace_id", { length: 32 }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  idempIdx: uniqueIndex("proposta_eventos_idem_uq").on(t.idempotencyKey),
}));

export const consentimentos = pgTable("consentimentos", {
  id: serial("id").primaryKey(),
  servidorId: integer("servidor_id").notNull().references(() => servidores.id),
  tipo: varchar("tipo", { length: 64 }).notNull(),
  versaoTexto: varchar("versao_texto", { length: 16 }).notNull(),
  aceitoEm: timestamp("aceito_em", { withTimezone: true }).defaultNow().notNull(),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("user_agent"),
  revogadoEm: timestamp("revogado_em", { withTimezone: true }),
  ativo: boolean("ativo").notNull().default(true),
});

// ============ Portal Banco — extensions ============

export const convenios = pgTable("convenios", {
  id: serial("id").primaryKey(),
  prefeituraId: integer("prefeitura_id").notNull().references(() => prefeituras.id),
  bancoId: integer("banco_id").notNull().references(() => bancos.id),
  nome: varchar("nome", { length: 255 }).notNull(),
  codigoVerba: varchar("codigo_verba", { length: 64 }),
  dataCorte: integer("data_corte"),
  diaRepasse: integer("dia_repasse"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: uniqueIndex("convenios_prefeitura_banco_uq").on(t.prefeituraId, t.bancoId),
}));

export const convenioTabelasEmprestimo = pgTable("convenio_tabelas_emprestimo", {
  id: serial("id").primaryKey(),
  convenioId: integer("convenio_id").notNull().references(() => convenios.id),
  taxaMinAm: numeric("taxa_min_am", { precision: 7, scale: 6 }).notNull(),
  taxaMaxAm: numeric("taxa_max_am", { precision: 7, scale: 6 }).notNull(),
  prazoMaxMeses: integer("prazo_max_meses").notNull(),
  vigenciaInicio: timestamp("vigencia_inicio", { mode: "string" }).notNull(),
  vigenciaFim: timestamp("vigencia_fim", { mode: "string" }),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const comunicados = pgTable("comunicados", {
  id: serial("id").primaryKey(),
  prefeituraId: integer("prefeitura_id").references(() => prefeituras.id),
  bancoId: integer("banco_id").references(() => bancos.id),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  corpo: text("corpo").notNull(),
  imagemUrl: text("imagem_url"),
  linkLabel: varchar("link_label", { length: 100 }),
  linkHref: text("link_href"),
  ativoDe: timestamp("ativo_de", { withTimezone: true }).defaultNow().notNull(),
  ativoAte: timestamp("ativo_ate", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const folhas = pgTable("folhas", {
  id: serial("id").primaryKey(),
  prefeituraId: integer("prefeitura_id").notNull().references(() => prefeituras.id),
  competencia: varchar("competencia", { length: 6 }).notNull(),
  dataCorte: timestamp("data_corte", { mode: "string" }).notNull(),
  dataRepasse: timestamp("data_repasse", { mode: "string" }),
  status: varchar("status", { length: 32 }).notNull().default("aberta"),
  sincronizadoEm: timestamp("sincronizado_em", { withTimezone: true }),
}, (t) => ({
  unq: uniqueIndex("folhas_pref_comp_uq").on(t.prefeituraId, t.competencia),
}));

export const bancoUsuarios = pgTable("banco_usuarios", {
  id: serial("id").primaryKey(),
  bancoId: integer("banco_id").notNull().references(() => bancos.id),
  userId: integer("user_id").notNull().references(() => users.id),
  perfil: varchar("perfil", { length: 32 }).notNull().default("operador"),
  ipsPermitidos: jsonb("ips_permitidos").$type<string[]>().default([]),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: uniqueIndex("banco_usuarios_uq").on(t.bancoId, t.userId),
}));

export const contratos = pgTable("contratos", {
  id: varchar("id", { length: 32 }).primaryKey(),
  propostaId: varchar("proposta_id", { length: 32 }).references(() => propostas.id),
  servidorId: integer("servidor_id").notNull().references(() => servidores.id),
  bancoId: integer("banco_id").notNull().references(() => bancos.id),
  convenioId: integer("convenio_id").references(() => convenios.id),
  adf: varchar("adf", { length: 64 }).notNull(),
  tipoContrato: varchar("tipo_contrato", { length: 32 }).notNull(),
  codigoVerba: varchar("codigo_verba", { length: 64 }),
  valorFinanciado: numeric("valor_financiado", { precision: 12, scale: 2 }).notNull(),
  valorLiquido: numeric("valor_liquido", { precision: 12, scale: 2 }).notNull(),
  valorParcela: numeric("valor_parcela", { precision: 12, scale: 2 }).notNull(),
  parcelasTotal: integer("parcelas_total").notNull(),
  parcelasPagas: integer("parcelas_pagas").notNull().default(0),
  taxaAm: numeric("taxa_am", { precision: 7, scale: 6 }).notNull(),
  cetAm: numeric("cet_am", { precision: 7, scale: 6 }).notNull(),
  valorIof: numeric("valor_iof", { precision: 12, scale: 2 }),
  diasCarencia: integer("dias_carencia").default(0),
  saldoDevedor: numeric("saldo_devedor", { precision: 12, scale: 2 }).notNull(),
  folhaPrimeiroDesconto: varchar("folha_primeiro_desconto", { length: 7 }),
  folhaUltimoDesconto: varchar("folha_ultimo_desconto", { length: 7 }),
  situacao: varchar("situacao", { length: 32 }).notNull().default("pendente"),
  situacaoDetalhe: varchar("situacao_detalhe", { length: 128 }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  adfIdx: uniqueIndex("contratos_adf_uq").on(t.adf),
}));

export const contratoEventos = pgTable("contrato_eventos", {
  id: serial("id").primaryKey(),
  contratoId: varchar("contrato_id", { length: 32 }).notNull().references(() => contratos.id),
  evento: varchar("evento", { length: 64 }).notNull(),
  deEstado: varchar("de_estado", { length: 32 }),
  paraEstado: varchar("para_estado", { length: 32 }),
  ator: varchar("ator", { length: 64 }).notNull(),
  motivo: text("motivo"),
  payloadHash: varchar("payload_hash", { length: 64 }),
  traceId: varchar("trace_id", { length: 32 }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});
