DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('servidor', 'banco', 'averbadora');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."servidor_status" AS ENUM('ativo', 'bloqueado', 'arquivado');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."situacao_funcional" AS ENUM('ATIVO', 'FERIAS', 'AFASTADO', 'LICENCA', 'LICENCA_REMUNERADA', 'APOSENTADO');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."vinculo" AS ENUM('CLT', 'ESTATUTARIO', 'COMISSIONADO');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banco_usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"banco_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"perfil" varchar(32) DEFAULT 'operador' NOT NULL,
	"ips_permitidos" jsonb DEFAULT '[]'::jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bancos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"adapter" varchar(32) NOT NULL,
	"status" varchar(16) DEFAULT 'ativo' NOT NULL,
	"dominios_email" jsonb DEFAULT '[]'::jsonb,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comunicados" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefeitura_id" integer,
	"banco_id" integer,
	"titulo" varchar(255) NOT NULL,
	"corpo" text NOT NULL,
	"imagem_url" text,
	"link_label" varchar(100),
	"link_href" text,
	"ativo_de" timestamp with time zone DEFAULT now() NOT NULL,
	"ativo_ate" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consentimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"servidor_id" integer NOT NULL,
	"tipo" varchar(64) NOT NULL,
	"versao_texto" varchar(16) NOT NULL,
	"aceito_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"revogado_em" timestamp with time zone,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contrato_eventos" (
	"id" serial PRIMARY KEY NOT NULL,
	"contrato_id" varchar(32) NOT NULL,
	"evento" varchar(64) NOT NULL,
	"de_estado" varchar(32),
	"para_estado" varchar(32),
	"ator" varchar(64) NOT NULL,
	"motivo" text,
	"payload_hash" varchar(64),
	"trace_id" varchar(32),
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contratos" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"proposta_id" varchar(32),
	"servidor_id" integer NOT NULL,
	"banco_id" integer NOT NULL,
	"convenio_id" integer,
	"adf" varchar(64) NOT NULL,
	"tipo_contrato" varchar(32) NOT NULL,
	"codigo_verba" varchar(64),
	"valor_financiado" numeric(12, 2) NOT NULL,
	"valor_liquido" numeric(12, 2) NOT NULL,
	"valor_parcela" numeric(12, 2) NOT NULL,
	"parcelas_total" integer NOT NULL,
	"parcelas_pagas" integer DEFAULT 0 NOT NULL,
	"taxa_am" numeric(7, 6) NOT NULL,
	"cet_am" numeric(7, 6) NOT NULL,
	"valor_iof" numeric(12, 2),
	"dias_carencia" integer DEFAULT 0,
	"saldo_devedor" numeric(12, 2) NOT NULL,
	"folha_primeiro_desconto" varchar(7),
	"folha_ultimo_desconto" varchar(7),
	"situacao" varchar(32) DEFAULT 'pendente' NOT NULL,
	"situacao_detalhe" varchar(128),
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "convenio_tabelas_emprestimo" (
	"id" serial PRIMARY KEY NOT NULL,
	"convenio_id" integer NOT NULL,
	"taxa_min_am" numeric(7, 6) NOT NULL,
	"taxa_max_am" numeric(7, 6) NOT NULL,
	"prazo_max_meses" integer NOT NULL,
	"vigencia_inicio" timestamp NOT NULL,
	"vigencia_fim" timestamp,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "convenios" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefeitura_id" integer NOT NULL,
	"banco_id" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"codigo_verba" varchar(64),
	"data_corte" integer,
	"dia_repasse" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "folhas" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefeitura_id" integer NOT NULL,
	"competencia" varchar(6) NOT NULL,
	"data_corte" timestamp NOT NULL,
	"data_repasse" timestamp,
	"status" varchar(32) DEFAULT 'aberta' NOT NULL,
	"sincronizado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prefeituras" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"uf" varchar(2) NOT NULL,
	"municipio_ibge" integer NOT NULL,
	"modo_integracao" varchar(16) DEFAULT 'MANUAL' NOT NULL,
	"status" varchar(16) DEFAULT 'ativo' NOT NULL,
	"ultima_sincronizacao" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposta_eventos" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposta_id" varchar(32) NOT NULL,
	"evento" varchar(64) NOT NULL,
	"de_estado" varchar(32),
	"para_estado" varchar(32) NOT NULL,
	"direcao" varchar(4) NOT NULL,
	"ator" varchar(64) NOT NULL,
	"payload_hash" varchar(64),
	"idempotency_key" varchar(64),
	"status_http" integer,
	"duracao_ms" integer,
	"trace_id" varchar(32),
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "propostas" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"servidor_id" integer NOT NULL,
	"banco_id" integer NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"parcelas" integer NOT NULL,
	"taxa_am" numeric(7, 6) NOT NULL,
	"cet_am" numeric(7, 6) NOT NULL,
	"status" varchar(32) NOT NULL,
	"adf" varchar(64),
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "servidores" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefeitura_id" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cpf" varchar(11) NOT NULL,
	"matricula" varchar(64) NOT NULL,
	"vinculo" "vinculo" NOT NULL,
	"situacao_funcional" "situacao_funcional" NOT NULL,
	"status" "servidor_status" DEFAULT 'ativo' NOT NULL,
	"data_nascimento" timestamp,
	"salario_base" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"cpf" varchar(11),
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"nome" varchar(255) NOT NULL,
	"banco_id" integer,
	"servidor_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "banco_usuarios" ADD CONSTRAINT "banco_usuarios_banco_id_bancos_id_fk" FOREIGN KEY ("banco_id") REFERENCES "public"."bancos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "banco_usuarios" ADD CONSTRAINT "banco_usuarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_prefeitura_id_prefeituras_id_fk" FOREIGN KEY ("prefeitura_id") REFERENCES "public"."prefeituras"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_banco_id_bancos_id_fk" FOREIGN KEY ("banco_id") REFERENCES "public"."bancos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consentimentos" ADD CONSTRAINT "consentimentos_servidor_id_servidores_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato_eventos" ADD CONSTRAINT "contrato_eventos_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contratos" ADD CONSTRAINT "contratos_proposta_id_propostas_id_fk" FOREIGN KEY ("proposta_id") REFERENCES "public"."propostas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contratos" ADD CONSTRAINT "contratos_servidor_id_servidores_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contratos" ADD CONSTRAINT "contratos_banco_id_bancos_id_fk" FOREIGN KEY ("banco_id") REFERENCES "public"."bancos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contratos" ADD CONSTRAINT "contratos_convenio_id_convenios_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "convenio_tabelas_emprestimo" ADD CONSTRAINT "convenio_tabelas_emprestimo_convenio_id_convenios_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "convenios" ADD CONSTRAINT "convenios_prefeitura_id_prefeituras_id_fk" FOREIGN KEY ("prefeitura_id") REFERENCES "public"."prefeituras"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "convenios" ADD CONSTRAINT "convenios_banco_id_bancos_id_fk" FOREIGN KEY ("banco_id") REFERENCES "public"."bancos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "folhas" ADD CONSTRAINT "folhas_prefeitura_id_prefeituras_id_fk" FOREIGN KEY ("prefeitura_id") REFERENCES "public"."prefeituras"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposta_eventos" ADD CONSTRAINT "proposta_eventos_proposta_id_propostas_id_fk" FOREIGN KEY ("proposta_id") REFERENCES "public"."propostas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "propostas" ADD CONSTRAINT "propostas_servidor_id_servidores_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "propostas" ADD CONSTRAINT "propostas_banco_id_bancos_id_fk" FOREIGN KEY ("banco_id") REFERENCES "public"."bancos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "servidores" ADD CONSTRAINT "servidores_prefeitura_id_prefeituras_id_fk" FOREIGN KEY ("prefeitura_id") REFERENCES "public"."prefeituras"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "banco_usuarios_uq" ON "banco_usuarios" USING btree ("banco_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contratos_adf_uq" ON "contratos" USING btree ("adf");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "convenios_prefeitura_banco_uq" ON "convenios" USING btree ("prefeitura_id","banco_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "folhas_pref_comp_uq" ON "folhas" USING btree ("prefeitura_id","competencia");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "proposta_eventos_idem_uq" ON "proposta_eventos" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "servidores_cpf_matricula_uq" ON "servidores" USING btree ("cpf","matricula");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_cpf_uq" ON "users" USING btree ("cpf");