--
-- PostgreSQL database dump
--

\restrict 9qcYIL7H0JRxb4VkT5bLeJHXhy5WB2D1dQZJbHknRSKXtGpyxUrz5dInUEKbpXH

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.servidores DROP CONSTRAINT IF EXISTS servidores_prefeitura_id_prefeituras_id_fk;
ALTER TABLE IF EXISTS ONLY public.propostas DROP CONSTRAINT IF EXISTS propostas_servidor_id_servidores_id_fk;
ALTER TABLE IF EXISTS ONLY public.propostas DROP CONSTRAINT IF EXISTS propostas_prefeitura_id_fkey;
ALTER TABLE IF EXISTS ONLY public.propostas DROP CONSTRAINT IF EXISTS propostas_convenio_id_fkey;
ALTER TABLE IF EXISTS ONLY public.propostas DROP CONSTRAINT IF EXISTS propostas_banco_id_bancos_id_fk;
ALTER TABLE IF EXISTS ONLY public.proposta_eventos DROP CONSTRAINT IF EXISTS proposta_eventos_proposta_id_propostas_id_fk;
ALTER TABLE IF EXISTS ONLY public.pre_reservas DROP CONSTRAINT IF EXISTS pre_reservas_servidor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pre_reservas DROP CONSTRAINT IF EXISTS pre_reservas_prefeitura_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pre_reservas DROP CONSTRAINT IF EXISTS pre_reservas_convenio_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pre_reservas DROP CONSTRAINT IF EXISTS pre_reservas_banco_id_fkey;
ALTER TABLE IF EXISTS ONLY public.folhas DROP CONSTRAINT IF EXISTS folhas_prefeitura_id_prefeituras_id_fk;
ALTER TABLE IF EXISTS ONLY public.folha_movimentacoes DROP CONSTRAINT IF EXISTS folha_movimentacoes_servidor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.folha_movimentacoes DROP CONSTRAINT IF EXISTS folha_movimentacoes_prefeitura_id_fkey;
ALTER TABLE IF EXISTS ONLY public.folha_movimentacoes DROP CONSTRAINT IF EXISTS folha_movimentacoes_folha_id_fkey;
ALTER TABLE IF EXISTS ONLY public.folha_movimentacoes DROP CONSTRAINT IF EXISTS folha_movimentacoes_banco_id_fkey;
ALTER TABLE IF EXISTS ONLY public.convenios DROP CONSTRAINT IF EXISTS convenios_prefeitura_id_prefeituras_id_fk;
ALTER TABLE IF EXISTS ONLY public.convenios DROP CONSTRAINT IF EXISTS convenios_banco_id_bancos_id_fk;
ALTER TABLE IF EXISTS ONLY public.convenio_tabelas_emprestimo DROP CONSTRAINT IF EXISTS convenio_tabelas_emprestimo_convenio_id_convenios_id_fk;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_servidor_id_servidores_id_fk;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_proposta_id_propostas_id_fk;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_prefeitura_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_convenio_id_convenios_id_fk;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_banco_id_bancos_id_fk;
ALTER TABLE IF EXISTS ONLY public.contrato_eventos DROP CONSTRAINT IF EXISTS contrato_eventos_contrato_id_contratos_id_fk;
ALTER TABLE IF EXISTS ONLY public.consentimentos DROP CONSTRAINT IF EXISTS consentimentos_servidor_id_servidores_id_fk;
ALTER TABLE IF EXISTS ONLY public.comunicados DROP CONSTRAINT IF EXISTS comunicados_prefeitura_id_prefeituras_id_fk;
ALTER TABLE IF EXISTS ONLY public.comunicados DROP CONSTRAINT IF EXISTS comunicados_banco_id_bancos_id_fk;
ALTER TABLE IF EXISTS ONLY public.banco_usuarios DROP CONSTRAINT IF EXISTS banco_usuarios_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.banco_usuarios DROP CONSTRAINT IF EXISTS banco_usuarios_banco_id_bancos_id_fk;
ALTER TABLE IF EXISTS ONLY public.adf_pendencias DROP CONSTRAINT IF EXISTS adf_pendencias_servidor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.adf_pendencias DROP CONSTRAINT IF EXISTS adf_pendencias_prefeitura_id_fkey;
ALTER TABLE IF EXISTS ONLY public.adf_pendencias DROP CONSTRAINT IF EXISTS adf_pendencias_contrato_id_fkey;
ALTER TABLE IF EXISTS ONLY public.adf_pendencias DROP CONSTRAINT IF EXISTS adf_pendencias_banco_id_fkey;
DROP INDEX IF EXISTS public.users_email_uq;
DROP INDEX IF EXISTS public.users_cpf_uq;
DROP INDEX IF EXISTS public.servidores_cpf_matricula_uq;
DROP INDEX IF EXISTS public.proposta_eventos_idem_uq;
DROP INDEX IF EXISTS public.pre_reservas_servidor_idx;
DROP INDEX IF EXISTS public.pre_reservas_expira_idx;
DROP INDEX IF EXISTS public.pre_reservas_banco_status_idx;
DROP INDEX IF EXISTS public.notif_target_nao_lida_idx;
DROP INDEX IF EXISTS public.notif_target_idx;
DROP INDEX IF EXISTS public.folhas_pref_comp_uq;
DROP INDEX IF EXISTS public.folha_mov_matricula_comp_idx;
DROP INDEX IF EXISTS public.folha_mov_banco_comp_idx;
DROP INDEX IF EXISTS public.folha_mov_adf_idx;
DROP INDEX IF EXISTS public.convenios_prefeitura_banco_uq;
DROP INDEX IF EXISTS public.contratos_adf_uq;
DROP INDEX IF EXISTS public.banco_usuarios_uq;
DROP INDEX IF EXISTS public.audit_proposta_idx;
DROP INDEX IF EXISTS public.audit_matricula_idx;
DROP INDEX IF EXISTS public.audit_cpf_idx;
DROP INDEX IF EXISTS public.audit_categoria_ts_idx;
DROP INDEX IF EXISTS public.app_logs_ts_idx;
DROP INDEX IF EXISTS public.adf_pendencias_pref_status_idx;
DROP INDEX IF EXISTS public.adf_pendencias_banco_idx;
DROP INDEX IF EXISTS public.adf_pendencias_adf_comp_uq;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.tombamento_lotes DROP CONSTRAINT IF EXISTS tombamento_lotes_pkey;
ALTER TABLE IF EXISTS ONLY public.termos_templates DROP CONSTRAINT IF EXISTS termos_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.servidores DROP CONSTRAINT IF EXISTS servidores_pkey;
ALTER TABLE IF EXISTS ONLY public.propostas DROP CONSTRAINT IF EXISTS propostas_pkey;
ALTER TABLE IF EXISTS ONLY public.proposta_eventos DROP CONSTRAINT IF EXISTS proposta_eventos_pkey;
ALTER TABLE IF EXISTS ONLY public.prefeituras DROP CONSTRAINT IF EXISTS prefeituras_pkey;
ALTER TABLE IF EXISTS ONLY public.pre_reservas DROP CONSTRAINT IF EXISTS pre_reservas_pkey;
ALTER TABLE IF EXISTS ONLY public.portal_banco_tabelas DROP CONSTRAINT IF EXISTS portal_banco_tabelas_pkey;
ALTER TABLE IF EXISTS ONLY public.portal_banco_contratos DROP CONSTRAINT IF EXISTS portal_banco_contratos_pkey;
ALTER TABLE IF EXISTS ONLY public.portabilidade_intencoes DROP CONSTRAINT IF EXISTS portabilidade_intencoes_pkey;
ALTER TABLE IF EXISTS ONLY public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_pkey;
ALTER TABLE IF EXISTS ONLY public.folhas DROP CONSTRAINT IF EXISTS folhas_pkey;
ALTER TABLE IF EXISTS ONLY public.folha_movimentacoes DROP CONSTRAINT IF EXISTS folha_movimentacoes_pkey;
ALTER TABLE IF EXISTS ONLY public.email_templates DROP CONSTRAINT IF EXISTS email_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.convenios DROP CONSTRAINT IF EXISTS convenios_pkey;
ALTER TABLE IF EXISTS ONLY public.convenio_tabelas_emprestimo DROP CONSTRAINT IF EXISTS convenio_tabelas_emprestimo_pkey;
ALTER TABLE IF EXISTS ONLY public.contratos DROP CONSTRAINT IF EXISTS contratos_pkey;
ALTER TABLE IF EXISTS ONLY public.contrato_eventos DROP CONSTRAINT IF EXISTS contrato_eventos_pkey;
ALTER TABLE IF EXISTS ONLY public.consentimentos DROP CONSTRAINT IF EXISTS consentimentos_pkey;
ALTER TABLE IF EXISTS ONLY public.comunicados DROP CONSTRAINT IF EXISTS comunicados_pkey;
ALTER TABLE IF EXISTS ONLY public.bancos DROP CONSTRAINT IF EXISTS bancos_pkey;
ALTER TABLE IF EXISTS ONLY public.banco_usuarios DROP CONSTRAINT IF EXISTS banco_usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_pkey;
ALTER TABLE IF EXISTS ONLY public.app_logs DROP CONSTRAINT IF EXISTS app_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_vitrine DROP CONSTRAINT IF EXISTS admin_vitrine_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_telemedicina_cotacoes DROP CONSTRAINT IF EXISTS admin_telemedicina_cotacoes_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_servidor_status DROP CONSTRAINT IF EXISTS admin_servidor_status_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_perfis DROP CONSTRAINT IF EXISTS admin_perfis_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_ofertas DROP CONSTRAINT IF EXISTS admin_ofertas_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_folhas DROP CONSTRAINT IF EXISTS admin_folhas_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_convenios DROP CONSTRAINT IF EXISTS admin_convenios_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_comunicados DROP CONSTRAINT IF EXISTS admin_comunicados_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_beneficios DROP CONSTRAINT IF EXISTS admin_beneficios_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_beneficio_cliques DROP CONSTRAINT IF EXISTS admin_beneficio_cliques_pkey;
ALTER TABLE IF EXISTS ONLY public.adf_pendencias DROP CONSTRAINT IF EXISTS adf_pendencias_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.servidores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.proposta_eventos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.prefeituras ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notificacoes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.folhas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.folha_movimentacoes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.convenios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.convenio_tabelas_emprestimo ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.contrato_eventos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.consentimentos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.comunicados ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bancos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.banco_usuarios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.app_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.adf_pendencias ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.tombamento_lotes;
DROP TABLE IF EXISTS public.termos_templates;
DROP SEQUENCE IF EXISTS public.servidores_id_seq;
DROP TABLE IF EXISTS public.servidores;
DROP TABLE IF EXISTS public.propostas;
DROP SEQUENCE IF EXISTS public.proposta_eventos_id_seq;
DROP TABLE IF EXISTS public.proposta_eventos;
DROP SEQUENCE IF EXISTS public.prefeituras_id_seq;
DROP TABLE IF EXISTS public.prefeituras;
DROP TABLE IF EXISTS public.pre_reservas;
DROP TABLE IF EXISTS public.portal_banco_tabelas;
DROP TABLE IF EXISTS public.portal_banco_contratos;
DROP TABLE IF EXISTS public.portabilidade_intencoes;
DROP SEQUENCE IF EXISTS public.notificacoes_id_seq;
DROP TABLE IF EXISTS public.notificacoes;
DROP SEQUENCE IF EXISTS public.folhas_id_seq;
DROP TABLE IF EXISTS public.folhas;
DROP SEQUENCE IF EXISTS public.folha_movimentacoes_id_seq;
DROP TABLE IF EXISTS public.folha_movimentacoes;
DROP TABLE IF EXISTS public.email_templates;
DROP SEQUENCE IF EXISTS public.convenios_id_seq;
DROP TABLE IF EXISTS public.convenios;
DROP SEQUENCE IF EXISTS public.convenio_tabelas_emprestimo_id_seq;
DROP TABLE IF EXISTS public.convenio_tabelas_emprestimo;
DROP TABLE IF EXISTS public.contratos;
DROP SEQUENCE IF EXISTS public.contrato_eventos_id_seq;
DROP TABLE IF EXISTS public.contrato_eventos;
DROP SEQUENCE IF EXISTS public.consentimentos_id_seq;
DROP TABLE IF EXISTS public.consentimentos;
DROP SEQUENCE IF EXISTS public.comunicados_id_seq;
DROP TABLE IF EXISTS public.comunicados;
DROP SEQUENCE IF EXISTS public.bancos_id_seq;
DROP TABLE IF EXISTS public.bancos;
DROP SEQUENCE IF EXISTS public.banco_usuarios_id_seq;
DROP TABLE IF EXISTS public.banco_usuarios;
DROP SEQUENCE IF EXISTS public.audit_log_id_seq;
DROP TABLE IF EXISTS public.audit_log;
DROP SEQUENCE IF EXISTS public.app_logs_id_seq;
DROP TABLE IF EXISTS public.app_logs;
DROP TABLE IF EXISTS public.admin_vitrine;
DROP TABLE IF EXISTS public.admin_telemedicina_cotacoes;
DROP TABLE IF EXISTS public.admin_servidor_status;
DROP TABLE IF EXISTS public.admin_perfis;
DROP TABLE IF EXISTS public.admin_ofertas;
DROP TABLE IF EXISTS public.admin_folhas;
DROP TABLE IF EXISTS public.admin_convenios;
DROP TABLE IF EXISTS public.admin_comunicados;
DROP TABLE IF EXISTS public.admin_beneficios;
DROP TABLE IF EXISTS public.admin_beneficio_cliques;
DROP SEQUENCE IF EXISTS public.adf_pendencias_id_seq;
DROP TABLE IF EXISTS public.adf_pendencias;
DROP TYPE IF EXISTS public.vinculo;
DROP TYPE IF EXISTS public.situacao_funcional;
DROP TYPE IF EXISTS public.servidor_status;
DROP TYPE IF EXISTS public.role;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pg_trgm;
--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role AS ENUM (
    'servidor',
    'banco',
    'averbadora'
);


--
-- Name: servidor_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.servidor_status AS ENUM (
    'ativo',
    'bloqueado',
    'arquivado'
);


--
-- Name: situacao_funcional; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.situacao_funcional AS ENUM (
    'ATIVO',
    'FERIAS',
    'AFASTADO',
    'LICENCA',
    'LICENCA_REMUNERADA',
    'APOSENTADO'
);


--
-- Name: vinculo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vinculo AS ENUM (
    'CLT',
    'ESTATUTARIO',
    'COMISSIONADO'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adf_pendencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adf_pendencias (
    id integer NOT NULL,
    adf character varying(64) NOT NULL,
    contrato_id character varying(32),
    prefeitura_id integer NOT NULL,
    banco_id integer NOT NULL,
    servidor_id integer NOT NULL,
    matricula character varying(64) NOT NULL,
    valor_parcela numeric(12,2) NOT NULL,
    competencia character varying(6),
    status character varying(20) DEFAULT 'aguardando'::character varying NOT NULL,
    motivo_falha text,
    aplicado_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: adf_pendencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adf_pendencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adf_pendencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adf_pendencias_id_seq OWNED BY public.adf_pendencias.id;


--
-- Name: admin_beneficio_cliques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_beneficio_cliques (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_beneficios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_beneficios (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_comunicados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_comunicados (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_convenios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_convenios (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_folhas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_folhas (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_ofertas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_ofertas (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_perfis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_perfis (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_servidor_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_servidor_status (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_telemedicina_cotacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_telemedicina_cotacoes (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_vitrine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_vitrine (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_logs (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    level text NOT NULL,
    source text NOT NULL,
    perfil text NOT NULL,
    message text NOT NULL,
    trace_id text NOT NULL
);


--
-- Name: app_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_logs_id_seq OWNED BY public.app_logs.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    trace_id character varying(32),
    categoria character varying(32) NOT NULL,
    acao character varying(64) NOT NULL,
    cpf character varying(32),
    matricula character varying(64),
    proposta_id character varying(32),
    contrato_id character varying(32),
    id_unico character varying(32),
    ip character varying(45),
    user_agent text,
    device_id character varying(64),
    termo_aceito character varying(32),
    user_id character varying(64),
    user_role character varying(20),
    detalhes text NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: banco_usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banco_usuarios (
    id integer NOT NULL,
    banco_id integer NOT NULL,
    user_id integer NOT NULL,
    perfil character varying(32) DEFAULT 'operador'::character varying NOT NULL,
    ips_permitidos jsonb DEFAULT '[]'::jsonb,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: banco_usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.banco_usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: banco_usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.banco_usuarios_id_seq OWNED BY public.banco_usuarios.id;


--
-- Name: bancos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bancos (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    adapter character varying(32) NOT NULL,
    status character varying(16) DEFAULT 'ativo'::character varying NOT NULL,
    dominios_email jsonb DEFAULT '[]'::jsonb,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bancos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bancos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bancos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bancos_id_seq OWNED BY public.bancos.id;


--
-- Name: comunicados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comunicados (
    id integer NOT NULL,
    prefeitura_id integer,
    banco_id integer,
    titulo character varying(255) NOT NULL,
    corpo text NOT NULL,
    imagem_url text,
    link_label character varying(100),
    link_href text,
    ativo_de timestamp with time zone DEFAULT now() NOT NULL,
    ativo_ate timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: comunicados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comunicados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comunicados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comunicados_id_seq OWNED BY public.comunicados.id;


--
-- Name: consentimentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consentimentos (
    id integer NOT NULL,
    servidor_id integer NOT NULL,
    tipo character varying(64) NOT NULL,
    versao_texto character varying(16) NOT NULL,
    aceito_em timestamp with time zone DEFAULT now() NOT NULL,
    ip character varying(45),
    user_agent text,
    revogado_em timestamp with time zone,
    ativo boolean DEFAULT true NOT NULL
);


--
-- Name: consentimentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consentimentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consentimentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consentimentos_id_seq OWNED BY public.consentimentos.id;


--
-- Name: contrato_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrato_eventos (
    id integer NOT NULL,
    contrato_id character varying(32) NOT NULL,
    evento character varying(64) NOT NULL,
    de_estado character varying(32),
    para_estado character varying(32),
    ator character varying(64) NOT NULL,
    motivo text,
    payload_hash character varying(64),
    trace_id character varying(32),
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contrato_eventos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contrato_eventos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contrato_eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contrato_eventos_id_seq OWNED BY public.contrato_eventos.id;


--
-- Name: contratos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contratos (
    id character varying(32) NOT NULL,
    proposta_id character varying(32),
    servidor_id integer NOT NULL,
    banco_id integer NOT NULL,
    convenio_id integer,
    adf character varying(64) NOT NULL,
    tipo_contrato character varying(32) NOT NULL,
    codigo_verba character varying(64),
    valor_financiado numeric(12,2) NOT NULL,
    valor_liquido numeric(12,2) NOT NULL,
    valor_parcela numeric(12,2) NOT NULL,
    parcelas_total integer NOT NULL,
    parcelas_pagas integer DEFAULT 0 NOT NULL,
    taxa_am numeric(7,6) NOT NULL,
    cet_am numeric(7,6) NOT NULL,
    valor_iof numeric(12,2),
    dias_carencia integer DEFAULT 0,
    saldo_devedor numeric(12,2) NOT NULL,
    folha_primeiro_desconto character varying(7),
    folha_ultimo_desconto character varying(7),
    situacao character varying(32) DEFAULT 'pendente'::character varying NOT NULL,
    situacao_detalhe character varying(128),
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    prefeitura_id integer
);


--
-- Name: convenio_tabelas_emprestimo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.convenio_tabelas_emprestimo (
    id integer NOT NULL,
    convenio_id integer NOT NULL,
    taxa_min_am numeric(7,6) NOT NULL,
    taxa_max_am numeric(7,6) NOT NULL,
    prazo_max_meses integer NOT NULL,
    vigencia_inicio timestamp without time zone NOT NULL,
    vigencia_fim timestamp without time zone,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: convenio_tabelas_emprestimo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.convenio_tabelas_emprestimo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: convenio_tabelas_emprestimo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.convenio_tabelas_emprestimo_id_seq OWNED BY public.convenio_tabelas_emprestimo.id;


--
-- Name: convenios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.convenios (
    id integer NOT NULL,
    prefeitura_id integer NOT NULL,
    banco_id integer NOT NULL,
    nome character varying(255) NOT NULL,
    codigo_verba character varying(64),
    data_corte integer,
    dia_repasse integer,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: convenios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.convenios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: convenios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.convenios_id_seq OWNED BY public.convenios.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: folha_movimentacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folha_movimentacoes (
    id integer NOT NULL,
    folha_id integer,
    prefeitura_id integer NOT NULL,
    servidor_id integer,
    matricula character varying(64) NOT NULL,
    competencia character varying(6) NOT NULL,
    tipo character varying(20) NOT NULL,
    adf character varying(64),
    banco_id integer,
    valor numeric(12,2) NOT NULL,
    detalhe text,
    aplicado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: folha_movimentacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.folha_movimentacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: folha_movimentacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.folha_movimentacoes_id_seq OWNED BY public.folha_movimentacoes.id;


--
-- Name: folhas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folhas (
    id integer NOT NULL,
    prefeitura_id integer NOT NULL,
    competencia character varying(6) NOT NULL,
    data_corte timestamp without time zone NOT NULL,
    data_repasse timestamp without time zone,
    status character varying(32) DEFAULT 'aberta'::character varying NOT NULL,
    sincronizado_em timestamp with time zone
);


--
-- Name: folhas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.folhas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: folhas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.folhas_id_seq OWNED BY public.folhas.id;


--
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacoes (
    id integer NOT NULL,
    target_role character varying(20) NOT NULL,
    target_id character varying(64) NOT NULL,
    from_role character varying(20),
    tipo character varying(40) NOT NULL,
    titulo character varying(200) NOT NULL,
    corpo text,
    link_href text,
    proposta_id character varying(32),
    contrato_id character varying(32),
    matricula character varying(64),
    severidade character varying(10) DEFAULT 'info'::character varying NOT NULL,
    lida_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notificacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificacoes_id_seq OWNED BY public.notificacoes.id;


--
-- Name: portabilidade_intencoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portabilidade_intencoes (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: portal_banco_contratos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_banco_contratos (
    adf text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: portal_banco_tabelas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_banco_tabelas (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pre_reservas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pre_reservas (
    id character varying(32) NOT NULL,
    id_unico character varying(32),
    banco_id integer NOT NULL,
    prefeitura_id integer NOT NULL,
    convenio_id integer,
    servidor_id integer NOT NULL,
    matricula character varying(64) NOT NULL,
    tipo_operacao character varying(20) DEFAULT 'EMPRESTIMO'::character varying NOT NULL,
    valor_margem numeric(12,2) NOT NULL,
    valor_parcela numeric(12,2) NOT NULL,
    parcelas integer NOT NULL,
    taxa_am numeric(7,6),
    status character varying(20) DEFAULT 'ativa'::character varying NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    expira_em timestamp with time zone NOT NULL,
    finalizado_em timestamp with time zone,
    finalizado_por character varying(64),
    motivo_finalizacao text
);


--
-- Name: prefeituras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prefeituras (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    uf character varying(2) NOT NULL,
    municipio_ibge integer NOT NULL,
    modo_integracao character varying(16) DEFAULT 'MANUAL'::character varying NOT NULL,
    status character varying(16) DEFAULT 'ativo'::character varying NOT NULL,
    ultima_sincronizacao timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    config jsonb DEFAULT '{}'::jsonb
);


--
-- Name: prefeituras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prefeituras_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prefeituras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prefeituras_id_seq OWNED BY public.prefeituras.id;


--
-- Name: proposta_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposta_eventos (
    id integer NOT NULL,
    proposta_id character varying(32) NOT NULL,
    evento character varying(64) NOT NULL,
    de_estado character varying(32),
    para_estado character varying(32) NOT NULL,
    direcao character varying(4) NOT NULL,
    ator character varying(64) NOT NULL,
    payload_hash character varying(64),
    idempotency_key character varying(64),
    status_http integer,
    duracao_ms integer,
    trace_id character varying(32),
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proposta_eventos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proposta_eventos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proposta_eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proposta_eventos_id_seq OWNED BY public.proposta_eventos.id;


--
-- Name: propostas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.propostas (
    id character varying(32) NOT NULL,
    servidor_id integer NOT NULL,
    banco_id integer NOT NULL,
    valor numeric(12,2) NOT NULL,
    parcelas integer NOT NULL,
    taxa_am numeric(7,6) NOT NULL,
    cet_am numeric(7,6) NOT NULL,
    status character varying(32) NOT NULL,
    adf character varying(64),
    criada_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizada_em timestamp with time zone DEFAULT now() NOT NULL,
    convenio_id integer,
    prefeitura_id integer
);


--
-- Name: servidores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servidores (
    id integer NOT NULL,
    prefeitura_id integer NOT NULL,
    nome character varying(255) NOT NULL,
    cpf character varying(11) NOT NULL,
    matricula character varying(64) NOT NULL,
    vinculo public.vinculo NOT NULL,
    situacao_funcional public.situacao_funcional NOT NULL,
    status public.servidor_status DEFAULT 'ativo'::public.servidor_status NOT NULL,
    data_nascimento timestamp without time zone,
    salario_base numeric(12,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    data jsonb DEFAULT '{}'::jsonb
);


--
-- Name: servidores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servidores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servidores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servidores_id_seq OWNED BY public.servidores.id;


--
-- Name: termos_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.termos_templates (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tombamento_lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tombamento_lotes (
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255),
    cpf character varying(11),
    password_hash text NOT NULL,
    role public.role NOT NULL,
    nome character varying(255) NOT NULL,
    banco_id integer,
    servidor_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: adf_pendencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adf_pendencias ALTER COLUMN id SET DEFAULT nextval('public.adf_pendencias_id_seq'::regclass);


--
-- Name: app_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_logs ALTER COLUMN id SET DEFAULT nextval('public.app_logs_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: banco_usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco_usuarios ALTER COLUMN id SET DEFAULT nextval('public.banco_usuarios_id_seq'::regclass);


--
-- Name: bancos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bancos ALTER COLUMN id SET DEFAULT nextval('public.bancos_id_seq'::regclass);


--
-- Name: comunicados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados ALTER COLUMN id SET DEFAULT nextval('public.comunicados_id_seq'::regclass);


--
-- Name: consentimentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimentos ALTER COLUMN id SET DEFAULT nextval('public.consentimentos_id_seq'::regclass);


--
-- Name: contrato_eventos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_eventos ALTER COLUMN id SET DEFAULT nextval('public.contrato_eventos_id_seq'::regclass);


--
-- Name: convenio_tabelas_emprestimo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenio_tabelas_emprestimo ALTER COLUMN id SET DEFAULT nextval('public.convenio_tabelas_emprestimo_id_seq'::regclass);


--
-- Name: convenios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios ALTER COLUMN id SET DEFAULT nextval('public.convenios_id_seq'::regclass);


--
-- Name: folha_movimentacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folha_movimentacoes ALTER COLUMN id SET DEFAULT nextval('public.folha_movimentacoes_id_seq'::regclass);


--
-- Name: folhas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folhas ALTER COLUMN id SET DEFAULT nextval('public.folhas_id_seq'::regclass);


--
-- Name: notificacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes ALTER COLUMN id SET DEFAULT nextval('public.notificacoes_id_seq'::regclass);


--
-- Name: prefeituras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prefeituras ALTER COLUMN id SET DEFAULT nextval('public.prefeituras_id_seq'::regclass);


--
-- Name: proposta_eventos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposta_eventos ALTER COLUMN id SET DEFAULT nextval('public.proposta_eventos_id_seq'::regclass);


--
-- Name: servidores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servidores ALTER COLUMN id SET DEFAULT nextval('public.servidores_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: adf_pendencias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.adf_pendencias (id, adf, contrato_id, prefeitura_id, banco_id, servidor_id, matricula, valor_parcela, competencia, status, motivo_falha, aplicado_em, criado_em) FROM stdin;
\.


--
-- Data for Name: admin_beneficio_cliques; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_beneficio_cliques (id, data, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_beneficios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_beneficios (id, data, updated_at) FROM stdin;
BEN-1	{"id": "BEN-1", "cor": "#be185d", "nome": "Farmácia São João", "ativo": true, "icone": "💊", "local": "Palhoça Centro", "origem": "banco", "bancoId": 1, "criadoEm": "2026-07-08T18:02:57.579Z", "criadoPor": "200", "categorias": ["saude"], "prefeituraId": 1, "descontoLabel": "12% desconto", "descricaoCurta": "farmacia teste", "descontoComplemento": "em medicamentos", "prefeituraIdsExtras": [3]}	2026-07-10 11:14:03.9132-03
BEN-2	{"id": "BEN-2", "cor": "#059669", "nome": "dzfvnbardeh", "ativo": false, "icone": "🧬", "local": "", "origem": "banco", "bancoId": 1, "criadoEm": "2026-07-13T16:10:47.994Z", "desconto": {"tipo": "percentual", "valor": 10}, "criadoPor": "200", "categorias": ["saude"], "comissaoPct": 1, "modoImagens": "unica", "prefeituraId": 1, "descontoLabel": "10%", "descricaoCurta": "adfhbretgbdfhr", "descontoComplemento": "bnfbnsnhrfssnhr"}	2026-07-14 10:36:01.043086-03
BEN-3	{"id": "BEN-3", "cor": "#059669", "nome": "Academia", "ativo": false, "icone": "🏋️", "local": "", "origem": "averbadora", "criadoEm": "2026-07-14T15:19:30.301Z", "criadoPor": "200", "categorias": ["saude"], "prefeituraId": 1, "descontoLabel": "", "descricaoCurta": "Plano academia", "descontoComplemento": ""}	2026-07-14 12:20:24.366049-03
\.


--
-- Data for Name: admin_comunicados; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_comunicados (id, data, updated_at) FROM stdin;
COM-1783704344662	{"id": "COM-1783704344662", "ord": 0, "corpo": "Servidores já podem antecipar o 13º salário pelo app, com taxa a partir de 1,55% a.m.", "titulo": "Antecipação do 13º liberada", "publico": "servidor"}	2026-07-14 12:05:19.115998-03
COM-1783524110657	{"id": "COM-1783524110657", "ord": 1, "corpo": "Empréstimos com taxas de 0,99% ao mês", "titulo": "Promoção", "publico": "servidor"}	2026-07-14 12:05:20.065322-03
COM-1783698989794	{"id": "COM-1783698989794", "ord": 2, "corpo": "Aproveite nossos benefícios com academias, mercados, farmácias e muito mais.", "titulo": "Benefícios Únicos", "publico": "servidor"}	2026-07-14 12:05:21.169466-03
COM-1783698979219	{"id": "COM-1783698979219", "ord": 3, "corpo": "Sua saúde na palma da sua mão!", "titulo": "Telemedicina", "publico": "servidor"}	2026-07-14 12:05:22.110646-03
COM-2	{"id": "COM-2", "ord": 4, "corpo": "Divulgue o app para os servidores e aumente as conversoes em ofertas pre-aprovadas. Material de divulgacao no portal.", "titulo": "Servidores municipais podem usar o app Atlas", "publico": "banco", "linkHref": "#", "linkLabel": "Materiais"}	2026-07-14 12:05:22.851674-03
COM-3	{"id": "COM-3", "ord": 5, "corpo": "Sessao gratuita 15/07 19h. Apresentamos o mapa de equivalencia entre os menus.", "titulo": "Treinamento UX Atlas vs Consignet", "publico": "banco"}	2026-07-14 12:05:23.587017-03
COM-1	{"id": "COM-1", "ord": 6, "corpo": "A partir de 01/07 entra em vigor a nova tabela de taxas. Verifique em Cadastros > Tabela de Empréstimos.", "titulo": "Nova vigencia de tabelas — Julho/2026", "publico": "banco", "linkHref": "/banco/cadastros/tabela-emprestimos", "linkLabel": "Acessar Cadastros"}	2026-07-14 12:05:25.235724-03
\.


--
-- Data for Name: admin_convenios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_convenios (id, data, updated_at) FROM stdin;
CONV-001	{"id": "CONV-001", "uf": "SC", "nome": "PALHOCA / DELTA GLOBAL", "bancoId": 1, "dataCorte": 15, "diaRepasse": 5, "prefeitura": "Palhoca", "codigoVerba": "1547 - DELTA GLOBAL I", "prefeituraId": 1}	2026-07-06 17:09:40.925459-03
CONV-002	{"id": "CONV-002", "uf": "SC", "nome": "FLORIPA / DELTA GLOBAL", "bancoId": 1, "dataCorte": 18, "diaRepasse": 8, "prefeitura": "Florianopolis", "codigoVerba": "2210 - DELTA GLOBAL II", "prefeituraId": 2}	2026-07-06 17:09:42.768133-03
CONV-003	{"id": "CONV-003", "uf": "SC", "nome": "JOINVILLE / DELTA GLOBAL", "bancoId": 1, "dataCorte": 20, "diaRepasse": 10, "prefeitura": "Joinville", "codigoVerba": "2310 - DELTA GLOBAL III", "prefeituraId": 3}	2026-07-06 17:09:43.460372-03
CONV-004	{"id": "CONV-004", "uf": "SC", "nome": "CONV TESTE PERSIST", "ativo": false, "bancoId": 1, "dataCorte": 15, "diaRepasse": 5, "prefeitura": "Palhoca", "codigoVerba": "9999 - TESTE", "prefeituraId": 1}	2026-07-06 17:09:52.59452-03
\.


--
-- Data for Name: admin_folhas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_folhas (id, data, updated_at) FROM stdin;
F-2026-06-1	{"id": "F-2026-06-1", "status": "fechada", "dataCorte": "2026-06-15", "prefeitura": "Palhoca", "competencia": "202606", "dataRepasse": "2026-07-05", "prefeituraId": 1}	2026-07-15 15:00:29.404542-03
F-2026-06-2	{"id": "F-2026-06-2", "status": "fechada", "dataCorte": "2026-06-18", "prefeitura": "Florianopolis", "competencia": "202606", "dataRepasse": "2026-07-08", "prefeituraId": 2}	2026-07-15 15:00:31.517882-03
F-2026-07-1	{"id": "F-2026-07-1", "status": "fechada", "dataCorte": "2026-07-15", "prefeitura": "Palhoca", "competencia": "202607", "dataRepasse": "2026-08-05", "prefeituraId": 1}	2026-07-15 15:00:33.078258-03
F-2026-07-2	{"id": "F-2026-07-2", "status": "fechada", "dataCorte": "2026-07-18", "prefeitura": "Florianopolis", "competencia": "202607", "dataRepasse": "2026-08-08", "prefeituraId": 2}	2026-07-15 15:00:34.583226-03
\.


--
-- Data for Name: admin_ofertas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_ofertas (id, data, updated_at) FROM stdin;
OFT-B1-1	{"id": "OFT-B1-1", "ativo": false, "filtro": {"vinculos": ["CLT", "ESTATUTARIO", "COMISSIONADO", "APOSENTADO", "PENSIONISTA"], "convenioIds": ["CONV-001", "CONV-002", "CONV-003"], "situacaoFuncional": ["ATIVO", "TRABALHANDO", "FERIAS", "AFASTADO", "LICENCA", "APOSENTADO"]}, "taxaAm": 1.79, "titulo": "credito consignado", "bancoId": 1, "criadoEm": "2026-07-08T11:50:07.376Z", "mensagem": "aproveite 1,79%", "valorMax": 50000, "criadoPor": "100", "parcelasMax": 84}	2026-07-08 08:51:53.980625-03
OFT-B1-2	{"id": "OFT-B1-2", "ativo": false, "icone": "💳", "filtro": {"vinculos": ["APOSENTADO", "PENSIONISTA", "CLT", "ESTATUTARIO", "COMISSIONADO"], "convenioIds": ["CONV-001", "CONV-002", "CONV-003"], "situacaoFuncional": ["APOSENTADO", "LICENCA", "AFASTADO", "FERIAS", "TRABALHANDO", "ATIVO"]}, "taxaAm": 0.79, "titulo": "cartao teste", "bancoId": 1, "criadoEm": "2026-07-10T11:48:07.094Z", "expiraEm": "2026-07-10T13:48:08.929Z", "mensagem": "teste de oferta cartao blablabla", "valorMax": 50000, "criadoPor": "1001", "parcelasMax": 84}	2026-07-10 08:49:03.709325-03
\.


--
-- Data for Name: admin_perfis; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_perfis (id, data, updated_at) FROM stdin;
200	{"id": 200, "nome": "Admin Atlas", "ativo": true, "email": "admin@atlas.io", "perfil": "supervisor", "criadoEm": "2026-01-01T00:00:00Z", "permissoes": ["*"], "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "twoFactorEnabled": false}	2026-07-14 14:38:42.718998-03
201	{"id": 201, "nome": "Carla Mendes", "ativo": true, "email": "carla.mendes@atlas.io", "perfil": "operador", "criadoEm": "2026-02-10T00:00:00Z", "permissoes": ["dashboard", "health", "conta", "prefeituras", "convenios", "servidores", "pre-reservas", "tombamento", "adf", "beneficios", "telemedicina", "interessados"], "ultimoLogin": "2026-06-22T14:30:00Z", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "twoFactorEnabled": false}	2026-07-14 14:38:43.410447-03
202	{"id": 202, "nome": "Rafael Pinto", "ativo": true, "email": "rafael@atlas.io", "perfil": "comercial", "criadoEm": "2026-02-10T00:00:00Z", "permissoes": ["dashboard", "health", "conta", "vitrine", "comunicados", "comunicados-banco", "comunicados-servidor", "interessados"], "ultimoLogin": "2026-06-21T17:08:00Z", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "twoFactorEnabled": false}	2026-07-14 14:38:44.085618-03
203	{"id": 203, "nome": "Sandra Lopes", "ativo": true, "email": "sandra@atlas.io", "perfil": "financeiro", "criadoEm": "2026-03-01T00:00:00Z", "permissoes": ["dashboard", "health", "conta", "folhas", "bate-carteira", "adf"], "ultimoLogin": "2026-06-22T09:11:00Z", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "twoFactorSecret": "JBSWY3DPEHPK3PXP", "twoFactorEnabled": true}	2026-07-14 14:38:44.752443-03
204	{"id": 204, "nome": "Auditor LGPD", "ativo": true, "email": "auditoria@atlas.io", "perfil": "auditoria", "criadoEm": "2026-04-01T00:00:00Z", "permissoes": ["dashboard", "health", "conta", "auditoria", "logs"], "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "twoFactorSecret": "KRSXG5DJOZSXE6JANRQXEYK7", "twoFactorEnabled": true}	2026-07-14 14:38:45.436524-03
205	{"id": 205, "nome": "Teste Persist", "ativo": true, "email": "persist1783342923@atlas.io", "perfil": "operador", "criadoEm": "2026-07-06T13:02:03.460Z", "permissoes": ["dashboard", "health", "conta", "prefeituras", "convenios", "servidores", "pre-reservas", "tombamento", "adf", "beneficios", "telemedicina", "interessados"], "twoFactorEnabled": false}	2026-07-14 14:38:46.127533-03
206	{"id": 206, "nome": "permissoes", "ativo": false, "email": "testesemail159@gmail.com", "perfil": "auditoria", "criadoEm": "2026-07-14T17:37:34.393Z", "permissoes": ["dashboard", "health", "conta", "auditoria", "logs"], "ultimoLogin": "2026-07-14T17:37:46.854Z", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "twoFactorEnabled": false}	2026-07-14 14:38:46.799764-03
\.


--
-- Data for Name: admin_servidor_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_servidor_status (id, data, updated_at) FROM stdin;
DIAGTESTE001	{"status": "arquivado", "matricula": "DIAGTESTE001"}	2026-07-06 14:29:34.324727-03
PREFDIAG001	{"status": "arquivado", "matricula": "PREFDIAG001"}	2026-07-06 14:40:19.742885-03
M-9001	{"status": "arquivado", "matricula": "M-9001"}	2026-07-08 16:35:56.833824-03
993410027	{"status": "ativo", "matricula": "993410027"}	2026-07-13 15:08:30.492768-03
M-2200	{"status": "ativo", "matricula": "M-2200"}	2026-07-14 09:14:47.364345-03
764521800	{"status": "ativo", "matricula": "764521800"}	2026-07-14 09:38:59.438191-03
852029100	{"status": "ativo", "matricula": "852029100"}	2026-07-14 09:39:16.587251-03
\.


--
-- Data for Name: admin_telemedicina_cotacoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_telemedicina_cotacoes (id, data, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_vitrine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_vitrine (id, data, updated_at) FROM stdin;
BAN-1	{"id": "BAN-1", "ativo": true, "titulo": "Empréstimo a 1,72% a.m.", "bancoId": 2, "cliques": 3360, "bancoNome": "Banco Y", "impressoes": 42000, "receitaMes": 18000}	2026-07-06 10:01:47.220866-03
BAN-2	{"id": "BAN-2", "ativo": true, "titulo": "Portabilidade com troco", "bancoId": 1, "cliques": 1400, "bancoNome": "SCred Financeira", "impressoes": 28000, "receitaMes": 9200}	2026-07-06 10:01:47.909585-03
BAN-3	{"id": "BAN-3", "ativo": true, "titulo": "Banner persist 1783342910", "bancoId": 1, "cliques": 0, "bancoNome": "Banco Atlas", "impressoes": 0, "receitaMes": 0}	2026-07-06 10:01:49.062063-03
\.


--
-- Data for Name: app_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_logs (id, ts, level, source, perfil, message, trace_id) FROM stdin;
1	2026-07-02 17:23:48.259-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/config	7e52382b
2	2026-07-02 17:23:49.435-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	ce8fa162
3	2026-07-02 17:24:33.919-03	info	admin.mutacao	averbadora	POST /v1/admin/bancos	ae4e1911
4	2026-07-02 17:28:27.244-03	info	admin.mutacao	averbadora	POST /v1/admin/prefeituras	22280747
5	2026-07-02 17:28:29.833-03	info	admin.mutacao	averbadora	POST /v1/admin/prefeituras	7bd919a0
6	2026-07-02 17:28:34.174-03	info	admin.mutacao	averbadora	POST /v1/admin/prefeituras	423f47b8
7	2026-07-02 17:28:36.944-03	info	admin.mutacao	averbadora	POST /v1/admin/prefeituras	b47d0f29
8	2026-07-02 17:28:48.638-03	info	admin.mutacao	averbadora	DELETE /v1/admin/api-tokens/tok_000010_a769	9110cfa7
9	2026-07-02 17:46:46.618-03	info	admin.mutacao	averbadora	POST /v1/admin/bancos	127687ad
10	2026-07-02 17:46:52.675-03	info	admin.mutacao	averbadora	POST /v1/admin/bancos	a7827ee3
11	2026-07-02 17:50:44.307-03	info	admin.mutacao	averbadora	POST /v1/admin/bancos	e9ff4e09
12	2026-07-02 17:50:48.598-03	info	admin.mutacao	averbadora	POST /v1/admin/bancos	269d236f
13	2026-07-03 09:09:08.252-03	info	banco.mutacao	banco	POST /v1/portal/banco/cadastros/tabela-emprestimos	1be806a7
14	2026-07-03 09:09:23.866-03	info	banco.mutacao	banco	POST /v1/portal/banco/cadastros/tabela-emprestimos	f36d1f28
15	2026-07-03 09:10:17.189-03	warn	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar (falhou)	00a029f9
16	2026-07-03 09:10:28.414-03	warn	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar (falhou)	ec823aa9
17	2026-07-03 09:10:38.58-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	14466711
18	2026-07-03 09:10:39.115-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	d1353690
19	2026-07-03 09:11:22.046-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-764521800/calcular	d9b954ba
20	2026-07-03 09:11:27.907-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-764521800/calcular	52bb444f
21	2026-07-03 09:11:30.721-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-764521800/calcular	b68415d4
22	2026-07-03 09:11:33.704-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-764521800/calcular	6b41c988
23	2026-07-03 09:11:40.156-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-764521800/calcular	b1755258
24	2026-07-03 09:11:52.789-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-764521800/calcular	8870294b
25	2026-07-03 09:11:58.158-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	3404c3c3
26	2026-07-03 09:12:03.551-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-764521800/calcular	4bd3a7ae
27	2026-07-03 09:19:48.778-03	info	admin.mutacao	averbadora	PATCH /v1/admin/api-tokens/tok_000007_7dff/pause	1111a775
28	2026-07-03 09:19:50.661-03	info	admin.mutacao	averbadora	POST /v1/admin/bancos	729fcb9e
29	2026-07-03 09:19:51.794-03	info	admin.mutacao	averbadora	POST /v1/admin/bancos	5aa51df7
30	2026-07-03 09:19:53.04-03	info	admin.mutacao	averbadora	PATCH /v1/admin/api-tokens/tok_000007_7dff/pause	1e0a4986
31	2026-07-03 09:41:39.069-03	warn	servidor.mutacao	servidor	POST /v1/servidores/me/propostas (falhou)	fd94ece5
32	2026-07-03 09:44:39.8-03	warn	servidor.mutacao	servidor	POST /v1/servidores/me/propostas (falhou)	7947a68a
33	2026-07-03 09:44:49.661-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	0b620c23
34	2026-07-03 09:44:53.506-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	554b1541
35	2026-07-03 10:19:53.113-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	57f3497f
36	2026-07-03 10:19:54.242-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/codigo	39593094
37	2026-07-03 10:19:55.7-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/contato	d2349252
38	2026-07-03 10:19:56.912-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/codigo	aa267d5c
39	2026-07-03 10:19:58.442-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/senha	114285aa
40	2026-07-03 10:20:00.693-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/codigo	bc07529e
41	2026-07-03 10:20:02.447-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/senha	a2a9dfca
42	2026-07-03 10:44:15.337-03	info	admin.mutacao	averbadora	POST /v1/admin/bate-carteira	24e0757c
43	2026-07-03 10:44:41.08-03	warn	admin.mutacao	averbadora	POST /v1/admin/bate-carteira (falhou)	5b7a0f18
44	2026-07-03 10:44:46.568-03	warn	admin.mutacao	averbadora	POST /v1/admin/bate-carteira (falhou)	dfd14176
45	2026-07-03 10:46:43.491-03	info	admin.mutacao	averbadora	POST /v1/admin/bate-carteira	291d6d9f
46	2026-07-03 11:11:22.422-03	info	admin.mutacao	averbadora	POST /v1/admin/bate-carteira	ca7c914c
47	2026-07-03 11:11:40.17-03	info	admin.mutacao	averbadora	POST /v1/admin/bate-carteira	d03ed6de
48	2026-07-03 11:12:42.866-03	info	admin.mutacao	averbadora	PATCH /v1/admin/api-tokens/tok_000010_a769/pause	fd5905a4
49	2026-07-03 11:12:46.257-03	info	admin.mutacao	averbadora	PATCH /v1/admin/api-tokens/tok_000010_a769/pause	6c939888
50	2026-07-03 11:12:56.529-03	info	admin.mutacao	averbadora	PATCH /v1/admin/api-tokens/tok_000002_cd74/pause	a84129a3
51	2026-07-03 11:13:01.38-03	info	admin.mutacao	averbadora	PATCH /v1/admin/api-tokens/tok_000002_cd74/pause	64fb190f
52	2026-07-03 11:27:11.532-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	1b64fce0
53	2026-07-03 11:31:03.34-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	7e7ef02c
54	2026-07-03 13:57:29.21-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	538096d8
55	2026-07-03 13:57:32.967-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9000000/confirmar	1daefeec
56	2026-07-03 14:00:46.156-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	9252cb58
57	2026-07-03 14:00:49.936-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9000000/confirmar	0db2a995
58	2026-07-03 14:02:30.497-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	11ed3cc8
59	2026-07-03 14:02:34.415-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9000000/cancelar	4ce4f186
60	2026-07-03 14:04:45.987-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	34bf3376
61	2026-07-03 14:04:47.444-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	6ffc7634
62	2026-07-03 14:04:50.1-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9122196/confirmar	a6d5f942
63	2026-07-03 14:09:16.651-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	1c02eec2
64	2026-07-03 14:09:41.823-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	c5ac4c55
65	2026-07-03 14:09:44.796-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9888514/confirmar	a5784802
66	2026-07-03 14:09:47.117-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9888514/cancelar	5852644f
67	2026-07-03 14:10:07.686-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/confirmar	c2f4bc0a
1226	2026-07-14 18:05:26.57-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	bfc6254f
1231	2026-07-14 18:08:27.628-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	d0edef5a
1361	2026-07-16 09:48:38.127-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	d215b343
1368	2026-07-16 09:50:35.892-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	cd0b7f06
1377	2026-07-16 09:54:01.609-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	b6408d8b
1387	2026-07-16 09:56:58.043-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	f9e27c4e
1388	2026-07-16 09:57:02.764-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	363809f8
68	2026-07-03 14:10:37.947-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9551782/confirmar	501a7fb1
74	2026-07-03 14:57:38.881-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	55786828
90	2026-07-03 15:17:00.021-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9938183/confirmar	f8b60aed
93	2026-07-03 15:18:26.147-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	022fda53
1227	2026-07-14 18:05:34.074-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	458a8d46
1228	2026-07-14 18:05:46.254-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	77a63b64
1362	2026-07-16 09:48:39.706-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	c7de7ec5
69	2026-07-03 14:23:29.909-03	warn	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar (falhou)	ab139ca1
71	2026-07-03 14:23:38.467-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	30141cde
73	2026-07-03 14:25:23.446-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	0ade1fa5
1229	2026-07-14 18:06:17.282-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	387fd9c2
1363	2026-07-16 09:48:47.752-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	dd53e815
1364	2026-07-16 09:49:02.934-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9Q9B-YKQ4DS/ativar)	25f7a12d
1369	2026-07-16 09:50:43.775-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	abf55de9
1374	2026-07-16 09:51:04.342-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	1ff9b735
70	2026-07-03 14:23:37.931-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	8722c313
72	2026-07-03 14:24:23.614-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	b968d9c6
75	2026-07-03 14:57:41.339-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9201738/cancelar	a22756e5
76	2026-07-03 14:59:08.6-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/cancelar	6b08681e
77	2026-07-03 14:59:27.827-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	ed22ccdb
78	2026-07-03 15:00:01.656-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/confirmar	5614dfe8
79	2026-07-03 15:02:45.924-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	f275fa39
80	2026-07-03 15:15:59.924-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	d6033657
81	2026-07-03 15:16:03.908-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	45456346
82	2026-07-03 15:16:04.528-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	4a2921cb
83	2026-07-03 15:16:06.117-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9236223/confirmar	9327968a
84	2026-07-03 15:16:07.539-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	1a48ad1c
85	2026-07-03 15:16:10.559-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	673e375c
86	2026-07-03 15:16:13.785-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	ff0ad798
87	2026-07-03 15:16:14.729-03	warn	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar (falhou)	40fc5579
88	2026-07-03 15:16:16.347-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9236223/cancelar	9bf19c79
89	2026-07-03 15:16:58.47-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	ee8e761e
91	2026-07-03 15:17:04.747-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9938183/cancelar	085e86eb
92	2026-07-03 15:17:51.607-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	64fb29bc
94	2026-07-03 15:22:29.345-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	356e2c94
95	2026-07-03 15:22:56.131-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/cancelar	f6c9e204
96	2026-07-03 15:22:59.07-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9923646/confirmar	7ab67c4f
97	2026-07-03 15:28:34.798-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	aa6b2dbd
98	2026-07-03 15:28:36.389-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9354688/confirmar	f4cf76ba
99	2026-07-03 15:28:39.33-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	7665228b
100	2026-07-03 15:28:41.936-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9354688/cancelar	663c1b62
101	2026-07-03 15:28:44.11-03	info	admin.mutacao	averbadora	POST /v1/admin/prefeituras	6baa0719
102	2026-07-03 15:29:29.522-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	58e13c12
103	2026-07-03 15:29:31.081-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9510769/confirmar	5ae4a199
104	2026-07-03 15:29:35.563-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9510769/cancelar	7d4de65f
105	2026-07-03 15:29:58.759-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	8f14b243
106	2026-07-03 15:30:00.2-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9898254/confirmar	94e28ac9
107	2026-07-03 15:30:03.867-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9898254/cancelar	6326f44f
108	2026-07-03 15:30:25.626-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	0734192e
109	2026-07-03 15:30:27.156-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9573482/confirmar	fff5b2e4
110	2026-07-03 15:30:30.609-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9573482/cancelar	f3a60f88
111	2026-07-03 15:31:38.522-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	a908165a
112	2026-07-03 15:31:40.127-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9566203/confirmar	622a4981
113	2026-07-03 15:31:44.687-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	5aa4a1f8
114	2026-07-03 15:31:56.657-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9566203/cancelar	2b79e728
115	2026-07-03 15:36:41.132-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas/reset (falhou)	f3cd9c3e
116	2026-07-03 15:37:10.784-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas/reset (falhou)	9653496a
117	2026-07-03 15:37:35.077-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas/reset (falhou)	7f7c601c
118	2026-07-03 15:43:12.698-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	edc7c219
119	2026-07-03 15:43:38.438-03	warn	banco.mutacao	banco	POST /v1/portal/banco/contratos/9980193/cancelar (falhou)	9a515b7f
120	2026-07-03 15:44:41.887-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas/reset (falhou)	8eea8ad6
121	2026-07-03 15:45:15.02-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas/reset (falhou)	96102ed2
122	2026-07-03 15:46:02.873-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	d894fe97
123	2026-07-03 15:48:55.622-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/confirmar	491ad317
124	2026-07-03 15:49:08.027-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	21ef4006
125	2026-07-03 15:59:52.315-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	f394057f
126	2026-07-03 16:01:27.784-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	a7c87130
127	2026-07-03 16:01:29.751-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	6efe6197
128	2026-07-03 16:02:04.753-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	2fc13905
129	2026-07-03 16:02:18.183-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	9378d0e7
130	2026-07-03 16:03:13.4-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	bb8c0911
131	2026-07-03 16:04:51.666-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	2bb0a3b4
132	2026-07-03 16:04:54.595-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	206bd2d1
133	2026-07-03 16:07:19.699-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	a91945b5
134	2026-07-03 16:07:55.375-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	59bc9b4f
135	2026-07-03 16:09:22.749-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9902876/confirmar	7b09185b
136	2026-07-03 16:10:54.185-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	6c82472c
137	2026-07-03 16:11:26.505-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9357542/confirmar	233c7dd3
138	2026-07-03 16:20:16.422-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/cancelar	fa3e0e2f
139	2026-07-03 16:20:19.186-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9324129/cancelar	125edf4e
140	2026-07-03 16:24:43.256-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	9f129ea4
153	2026-07-03 16:50:46.844-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	bee72a50
160	2026-07-03 16:59:29.892-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9140679/confirmar	f76b053f
163	2026-07-03 17:03:30.447-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9095850/confirmar	f5972e6e
164	2026-07-03 17:08:32.059-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	26b18444
1230	2026-07-14 18:06:54.354-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	46dbc641
1365	2026-07-16 09:49:05.155-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	689fd157
1373	2026-07-16 09:51:00.228-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST portal/banco/contratos/9930391/folha) — FALHOU	472fe2c0
1385	2026-07-16 09:56:47.845-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	c1bee4e1
141	2026-07-03 16:25:12.106-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/cancelar	cac45f7b
142	2026-07-03 16:25:13.674-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9430407/cancelar	4f991cd4
144	2026-07-03 16:32:32.145-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	76e4447c
145	2026-07-03 16:33:21.979-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9973927/confirmar	24f46bd9
147	2026-07-03 16:35:25.7-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	b0c6f9fa
150	2026-07-03 16:46:31.462-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	22f9d833
154	2026-07-03 16:50:55.028-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9021343/cancelar	66064eb3
1232	2026-07-15 08:57:41.457-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	3e88a8e3
1241	2026-07-15 09:41:45.306-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	75177bbe
1258	2026-07-15 10:06:04.951-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9385118/aprovar)	ab285e39
1272	2026-07-15 10:48:51.264-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	d983d1b9
1370	2026-07-16 09:50:45.205-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST portal/banco/contratos/9930391/acao) — FALHOU	51533d9a
1371	2026-07-16 09:50:50.777-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	efc5de5c
1372	2026-07-16 09:50:56.537-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9QCP-NRDU5V/ativar)	e5ca30e3
1375	2026-07-16 09:51:09.592-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	471a91dc
1378	2026-07-16 09:54:06.711-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	fe4f4027
1389	2026-07-16 09:57:04.465-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	02807b03
143	2026-07-03 16:26:57.603-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/confirmar	8e10d08c
146	2026-07-03 16:34:04.993-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	eabd31ff
148	2026-07-03 16:36:07.931-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9013661/cancelar	c086ca40
149	2026-07-03 16:37:09.962-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/falha	21b7299b
151	2026-07-03 16:46:40.207-03	warn	sistema.mutacao	sistema	POST /v1/servidor/propostas (falhou)	30d05ea2
152	2026-07-03 16:50:18.413-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/cancelar	54b77a54
156	2026-07-03 16:52:40.037-03	warn	sistema.mutacao	sistema	POST /v1/portal/banco/contratos/9338742/confirmar (falhou)	8dc2cb63
158	2026-07-03 16:53:40.968-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	883b0736
162	2026-07-03 17:02:33.389-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	7ea10120
1233	2026-07-15 09:04:33.057-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidor-conta)	7688bab9
1380	2026-07-16 09:54:25.046-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	3dc14941
1383	2026-07-16 09:56:39.521-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	679249a8
155	2026-07-03 16:52:30.033-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	a512b8e8
157	2026-07-03 16:52:43.092-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9338742/confirmar	03db1086
159	2026-07-03 16:57:58.618-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	4ad622db
161	2026-07-03 17:00:03.763-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	3356eb75
165	2026-07-03 17:08:36.753-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9367834/confirmar	dfe78125
166	2026-07-03 17:09:08.323-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	1942f53c
167	2026-07-03 18:43:40.142-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	22b6213e
168	2026-07-03 18:43:42.051-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	e62c2c4d
169	2026-07-03 18:43:43.44-03	info	banco.mutacao	banco	POST /v1/portal/banco/convenio-ativo	7a39b08f
170	2026-07-03 19:11:45.129-03	warn	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar (falhou)	6ce46f19
171	2026-07-03 19:11:47.833-03	warn	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar (falhou)	e3c66598
172	2026-07-03 19:11:49.493-03	warn	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar (falhou)	36fcb204
173	2026-07-03 19:11:50.918-03	warn	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar (falhou)	fb44908d
174	2026-07-03 19:11:52.305-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	43ece7d2
175	2026-07-03 19:11:52.984-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	c1f2a43c
176	2026-07-03 19:12:40.847-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-852029100/calcular	df6341a8
177	2026-07-03 19:12:44.441-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-852029100/calcular	211eadb4
178	2026-07-03 19:12:45.81-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-852029100/calcular	1bb2fd7e
179	2026-07-03 19:12:47.096-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/MAT-852029100/calcular	32aac460
180	2026-07-03 19:13:11.033-03	info	banco.mutacao	banco	POST /v1/portal/banco/margem/buscar	78b501e3
181	2026-07-03 19:13:29.917-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/averbar/EMPRESTIMO	0b3025be
182	2026-07-06 08:49:56.884-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	00be69cf
183	2026-07-06 08:50:04.519-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9599094/cancelar	c7aa0d17
184	2026-07-06 08:58:45.393-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	ae7e1879
185	2026-07-06 08:58:48.795-03	info	admin.mutacao	averbadora	POST /v1/admin/pre-reservas/9931270/cancelar	94cdf879
186	2026-07-06 09:00:22.466-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	126c593d
187	2026-07-06 09:00:25.912-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9981878/cancelar	27abe409
188	2026-07-06 09:03:42.089-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	8f453c54
189	2026-07-06 09:05:08.553-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9922882/confirmar	11bcd625
190	2026-07-06 09:05:26.17-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/472600084/cancelar	b31dac47
191	2026-07-06 09:05:51.828-03	info	prefeitura.mutacao	prefeitura	PATCH /v1/prefeitura/folhas/F-2026-06-1	4dce91c4
192	2026-07-06 09:06:23.51-03	info	prefeitura.mutacao	prefeitura	PATCH /v1/prefeitura/folhas/F-2026-07-1	2f9e20c3
193	2026-07-06 09:06:28.566-03	info	prefeitura.mutacao	prefeitura	PATCH /v1/prefeitura/folhas/F-2026-07-1	5539b7fa
194	2026-07-06 09:18:28.426-03	info	servidor.mutacao	servidor	POST /v1/servidores/me/propostas	7f36a973
195	2026-07-06 09:18:29.933-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9024230/confirmar	580c3c1e
196	2026-07-06 09:18:34.58-03	info	prefeitura.mutacao	prefeitura	POST /v1/prefeitura/adf/confirmar	76f6c7ec
197	2026-07-06 09:18:38.149-03	info	banco.mutacao	banco	POST /v1/portal/banco/contratos/9024230/cancelar	a82b34ba
198	2026-07-06 09:27:59.301-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	4e40a0b6
199	2026-07-06 09:28:00.674-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9632450	5368b139
200	2026-07-06 09:28:02.012-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	c90d5f4f
201	2026-07-06 09:28:15.838-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9632450	26d4a85a
202	2026-07-06 09:28:49.198-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	76c6f8d6
203	2026-07-06 09:46:01.522-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	7476382c
204	2026-07-06 09:47:13.025-03	warn	admin.mutacao	averbadora	Averbadora atualizou um servidor — FALHOU	f4b512a0
205	2026-07-06 10:01:49.368-03	info	admin.mutacao	averbadora	Averbadora atualizou a vitrine de ofertas	d0328e5e
206	2026-07-06 10:02:07.609-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis)	532bd28b
207	2026-07-06 10:13:23.86-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	2479c389
208	2026-07-06 10:37:15.833-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	23a25f47
209	2026-07-06 10:37:18.743-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9720963	4795b2d0
210	2026-07-06 10:37:20.559-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9720963	b998c526
211	2026-07-06 10:37:59.866-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	e3c4491c
212	2026-07-06 10:38:03.129-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9831671	2c9bf103
213	2026-07-06 10:38:04.919-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9831671	ae84144b
214	2026-07-06 10:50:40.646-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	147607cb
215	2026-07-06 10:50:43.659-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9747652	d711f4f4
216	2026-07-06 10:50:48.158-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	09f6bbdb
217	2026-07-06 10:50:50.129-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9747652	b030f3ee
218	2026-07-06 10:52:17.856-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidor/propostas) — FALHOU	d1781ffe
219	2026-07-06 10:54:00.466-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	d7093381
220	2026-07-06 10:54:42.939-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9966261	ab4be291
221	2026-07-06 10:58:43.707-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	aabb42dc
222	2026-07-06 10:59:17.797-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9966261	49c6b6b2
223	2026-07-06 10:59:19.08-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9891187	fb4b8c89
1234	2026-07-15 09:04:44.746-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	dfadccce
1392	2026-07-16 10:40:48.568-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	21485779
1395	2026-07-16 10:48:01.723-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	fcae31a6
1397	2026-07-16 10:55:06.284-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	ceb54c0d
1401	2026-07-16 10:58:56.488-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	35bbb419
1402	2026-07-16 10:59:42.64-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9TI7-Z8XG24/ativar)	f8ac1a64
1407	2026-07-16 11:19:46.978-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	651e057b
1419	2026-07-16 11:26:25.893-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9561512	6f67736a
1436	2026-07-16 11:52:07.611-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	a6b8db91
1446	2026-07-16 11:57:23.492-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	18d148b0
1448	2026-07-16 11:57:29.822-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	cff6b707
224	2026-07-06 11:02:01.969-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	6202df7a
225	2026-07-06 11:02:36.814-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9864989	602074f4
226	2026-07-06 11:03:13.694-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	8b5e26a5
227	2026-07-06 11:37:37.802-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	83f166ce
228	2026-07-06 13:53:48.668-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	d75bce9c
229	2026-07-06 13:53:49.45-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	19d4a353
230	2026-07-06 14:16:05.001-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	6a51c49f
231	2026-07-06 14:22:49.336-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	868b82d9
232	2026-07-06 14:23:18.881-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9343011	0ac59f0a
233	2026-07-06 14:24:23.761-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	fc2e93a5
234	2026-07-06 14:24:43.865-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	8b5cfd1b
235	2026-07-06 14:24:58.548-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	ddf1e981
236	2026-07-06 14:29:35.092-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	5398851e
237	2026-07-06 14:35:52.434-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	3bfb5c35
238	2026-07-06 14:36:25.583-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9184486	91ede4fd
239	2026-07-06 14:37:18.674-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	d88a3e51
240	2026-07-06 14:38:11.94-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	3f194684
241	2026-07-06 14:38:19.252-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	27b4ba76
242	2026-07-06 14:38:51.458-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	ea34b9e0
243	2026-07-06 14:39:10.349-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	cadd6f13
244	2026-07-06 14:39:22.063-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	7ef5a7d0
245	2026-07-06 14:40:13.522-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	c36d2d50
246	2026-07-06 14:40:15.715-03	info	prefeitura.mutacao	prefeitura	Prefeitura importou/atualizou a base de servidores	fb424541
247	2026-07-06 14:40:20.505-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	bf1441d5
248	2026-07-06 14:41:24.484-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	6e811dbb
249	2026-07-06 14:41:46.551-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	8be82638
250	2026-07-06 14:42:04.205-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	22fa1846
251	2026-07-06 14:42:07.611-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	d8e80e19
252	2026-07-06 14:42:45.004-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	134c4417
253	2026-07-06 14:46:59.352-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	51854f75
254	2026-07-06 14:47:01.66-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9498303	fd0f2c5f
255	2026-07-06 14:47:05.255-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	27052e43
256	2026-07-06 14:47:07.286-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9498303	7f8eaad2
257	2026-07-06 14:52:32.427-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	6f140eb5
258	2026-07-06 14:52:34.63-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9571348	260e1aee
259	2026-07-06 14:52:38.111-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	96477e1e
260	2026-07-06 14:52:40.104-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9571348	fcb2fb5f
261	2026-07-06 14:54:11.092-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	69a142c3
262	2026-07-06 14:54:33.616-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	96bbf882
263	2026-07-06 14:57:59.145-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	7d820cdc
264	2026-07-06 15:00:12.39-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9475951	5331ac80
265	2026-07-06 15:00:16.735-03	warn	banco.mutacao	banco	Banco aprovou/averbou a proposta 9475951 — FALHOU	373ad550
266	2026-07-06 15:00:20.334-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	bb1b71ad
267	2026-07-06 15:00:22.412-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9004286	b58d3e04
268	2026-07-06 15:00:26.029-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	b8d20a47
269	2026-07-06 15:00:28.075-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9004286	66e1d05a
270	2026-07-06 15:05:09.222-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	57b68392
271	2026-07-06 15:05:22.004-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9594235	4369e434
272	2026-07-06 15:06:21.354-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	007ab519
273	2026-07-06 15:06:55.195-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	5abfacde
274	2026-07-06 15:07:13.895-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	ae84d710
275	2026-07-06 15:11:03.547-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar) — FALHOU	25f1eeed
276	2026-07-06 15:11:19.005-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar) — FALHOU	7fcf690f
277	2026-07-06 15:12:54.827-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	0a880eae
278	2026-07-06 15:13:25.814-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	1c258af6
279	2026-07-06 15:13:51.191-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9783870	0f61b13b
280	2026-07-06 15:25:13.203-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/db/reseed) — FALHOU	624cd994
281	2026-07-06 15:25:13.761-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/db/reseed) — FALHOU	694da637
282	2026-07-06 15:25:18.097-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	c2925284
283	2026-07-06 15:25:21.862-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9769256	af17f92b
289	2026-07-06 15:30:30.645-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	a7b20a77
291	2026-07-06 15:31:29.195-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9883232	a8239530
294	2026-07-06 15:34:50.152-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	045720c3
304	2026-07-06 15:47:30.535-03	info	prefeitura.mutacao	prefeitura	Prefeitura processou um lote de tombamento	98ed788f
310	2026-07-06 15:53:01.797-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/bancos/3) — FALHOU	d42b4f04
1235	2026-07-15 09:06:00.494-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	91bab5ec
1393	2026-07-16 10:40:58.073-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	7666a800
284	2026-07-06 15:25:50.377-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 460690084	b4a558c0
287	2026-07-06 15:30:15.812-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	45243d82
288	2026-07-06 15:30:28.13-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	b47cd65c
290	2026-07-06 15:31:08.422-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	c807350a
296	2026-07-06 15:42:41.917-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	93aa3c2e
299	2026-07-06 15:46:49.244-03	info	prefeitura.mutacao	prefeitura	Prefeitura importou/atualizou a base de servidores	fa085ab2
300	2026-07-06 15:47:05.702-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	35a2d250
311	2026-07-06 15:53:31.831-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	8ee10c77
1236	2026-07-15 09:23:15.969-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	75991250
1394	2026-07-16 10:47:55.214-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	f928656a
1396	2026-07-16 10:48:08.735-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	7f2ab62e
1405	2026-07-16 11:19:41.522-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	59ab39e9
1413	2026-07-16 11:20:10.019-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	36a6be40
1415	2026-07-16 11:22:42.993-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	b810838c
1416	2026-07-16 11:24:21.279-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9ULT-UK1BBU/contrato)	73e4beae
1421	2026-07-16 11:28:15.816-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	49a7f962
1422	2026-07-16 11:28:18.115-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	37ddaba2
1424	2026-07-16 11:32:53.155-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	787bdd5f
1425	2026-07-16 11:33:15.039-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9V2R-29A8X3/contrato)	ea8b7532
1426	2026-07-16 11:33:21.147-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9V2R-29A8X3/ativar)	48b90a24
1428	2026-07-16 11:37:27.212-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	9c48e168
1431	2026-07-16 11:37:50.67-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	8d54b3f1
1433	2026-07-16 11:38:28.571-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	f4ce2048
285	2026-07-06 15:27:21.15-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	d921a37d
286	2026-07-06 15:27:36.354-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9389518	fcae92cd
293	2026-07-06 15:33:32.331-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9032965	1fe0b6d3
295	2026-07-06 15:40:51.927-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	420d0b9e
298	2026-07-06 15:45:18.767-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	e73eb59d
303	2026-07-06 15:47:12.817-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	efa6db1a
306	2026-07-06 15:52:20.093-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/bancos/3) — FALHOU	9b04a9e0
308	2026-07-06 15:53:00.436-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/bancos/3) — FALHOU	c4991707
309	2026-07-06 15:53:01.234-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/bancos/3) — FALHOU	eb922d35
1237	2026-07-15 09:38:58.312-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	d18c4b7e
1240	2026-07-15 09:40:59.034-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9270436/aprovar)	abf896da
1242	2026-07-15 09:42:33.048-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	43da1dec
1398	2026-07-16 10:55:27.982-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9TBT-111OZW/cancelar)	c27bc0de
1409	2026-07-16 11:19:55.636-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	d654b8de
1410	2026-07-16 11:19:59.001-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9UH5-QNS838/ativar) — FALHOU	eb93a854
1411	2026-07-16 11:20:01.102-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9UH5-QNS838/cancelar)	8afb3e0d
1414	2026-07-16 11:20:10.575-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	1684b4b2
1418	2026-07-16 11:26:09.43-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	823b49c3
1420	2026-07-16 11:27:54.93-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	2f28ca62
1423	2026-07-16 11:28:25.123-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	6219b120
1432	2026-07-16 11:37:59.679-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	70ae3073
1435	2026-07-16 11:39:46.025-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	9a299b3e
1452	2026-07-16 12:11:01.268-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9WU7-GPQ1SK/contrato)	b97a21aa
1455	2026-07-16 12:11:12.825-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9WU7-GPQ1SK/ativar)	b71742e2
1457	2026-07-16 12:11:17.265-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	deb5dc8b
1464	2026-07-16 12:21:39.024-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9XAE-BWMRBL/ativar)	e39c7353
292	2026-07-06 15:33:12.272-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	c524c669
305	2026-07-06 15:52:14.092-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	168e247b
1238	2026-07-15 09:39:53.117-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	8e95d1e5
1247	2026-07-15 10:01:44.128-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	9e0ca701
1399	2026-07-16 10:56:01.98-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	f342ae4b
1400	2026-07-16 10:56:42.66-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9570841	d024ce4f
297	2026-07-06 15:44:26.134-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	891fad0a
301	2026-07-06 15:47:07.408-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	64fcbdb1
302	2026-07-06 15:47:10.027-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	9aafc96e
307	2026-07-06 15:52:59.879-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/bancos/3) — FALHOU	971a198c
312	2026-07-06 16:40:50.201-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	ebf7534e
313	2026-07-06 16:42:28.162-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9896275	bff15509
314	2026-07-06 16:43:10.536-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	122016ef
315	2026-07-06 17:00:09.31-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	70f37630
316	2026-07-06 17:00:13.122-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	f2574b18
317	2026-07-06 17:09:22.662-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	dc541b89
318	2026-07-06 17:09:24.877-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	b340ba88
319	2026-07-06 17:09:45.579-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um convênio	4ed0c00c
320	2026-07-06 17:09:52.907-03	info	admin.mutacao	averbadora	Averbadora desativou um convênio	d10526b7
321	2026-07-06 17:10:36.388-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	95bb8fb2
322	2026-07-06 17:23:04.5-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PUT admin/smtp/config)	d02105c2
323	2026-07-06 17:23:06.174-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PUT admin/smtp/config)	82e5ae06
324	2026-07-06 17:23:07.764-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/smtp/config)	6a3489cb
325	2026-07-06 17:29:24.68-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/ai/test)	a18eebcd
326	2026-07-06 17:44:33.262-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/smtp/test)	b196bae2
327	2026-07-06 22:38:14.702-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	f658d065
328	2026-07-06 22:41:13.514-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	2f217b97
329	2026-07-06 22:42:44.338-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	3d6f9d7b
330	2026-07-06 22:43:05.202-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	8fd0eec1
331	2026-07-06 22:43:07.127-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	19968fbd
332	2026-07-06 22:43:17.96-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	f6d592c1
333	2026-07-06 22:47:19.133-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	4727fa29
334	2026-07-06 22:47:27.109-03	warn	banco.mutacao	banco	Banco aprovou/averbou a proposta 9983725 — FALHOU	797ee7a7
335	2026-07-06 22:47:31.92-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9332801	eb7146a3
336	2026-07-06 22:49:45.487-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	3720c488
337	2026-07-06 22:49:56.527-03	warn	banco.mutacao	banco	Banco aprovou/averbou a proposta 9983725 — FALHOU	54d94b89
338	2026-07-06 22:53:07.736-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9713893	bc75ad12
339	2026-07-07 09:00:35.876-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	737165cb
340	2026-07-07 09:00:42.109-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	0535e6db
341	2026-07-07 09:17:15.37-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PUT admin/smtp/config)	71cbbac7
342	2026-07-07 09:17:33.428-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/smtp/test) — FALHOU	767549b4
343	2026-07-07 09:18:47.316-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/smtp/test)	89f9d8a8
344	2026-07-07 09:21:58.574-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro — FALHOU	e710008a
345	2026-07-07 09:22:15.402-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	e507b450
346	2026-07-07 09:35:39.345-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PUT admin/smtp/config)	1633432d
347	2026-07-07 09:35:42.846-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/smtp/test)	303f034d
348	2026-07-07 09:46:46.042-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PUT admin/smtp/config)	9da47a9b
349	2026-07-07 09:47:54.921-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/smtp/test)	968cc554
350	2026-07-07 09:53:29.135-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/smtp/test)	2ee82aa9
351	2026-07-07 09:53:56.978-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	7f49c1ee
352	2026-07-07 09:56:29.222-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	4887b972
353	2026-07-07 09:58:22.832-03	info	banco.mutacao	banco	Banco fez uma alteração (DELETE portal/banco/cadastros/tabela-emprestimos/TBL-001)	00f3107c
354	2026-07-07 09:58:28.402-03	info	banco.mutacao	banco	Banco fez uma alteração (DELETE portal/banco/cadastros/tabela-emprestimos/TBL-001)	74064c5c
355	2026-07-07 09:58:40.666-03	info	banco.mutacao	banco	Banco fez uma alteração (DELETE portal/banco/cadastros/usuarios/U-116612)	1d0a427d
356	2026-07-07 10:00:19.024-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST confirmacao/solicitar) — FALHOU	c8725e40
357	2026-07-07 10:00:28.949-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST confirmacao/solicitar) — FALHOU	90e337bd
358	2026-07-07 10:00:49.856-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	0aebcc62
359	2026-07-07 10:01:04.752-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	f9a14cbf
360	2026-07-07 10:01:05.355-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	e09420f5
361	2026-07-07 10:06:41.306-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	03149dfd
362	2026-07-07 10:07:18.928-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/webhooks/wh_000001/test)	99967c52
363	2026-07-07 10:37:24.668-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	59b7cace
364	2026-07-07 10:37:31.032-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	78fd52b3
365	2026-07-07 10:37:37.393-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	c6a506fc
366	2026-07-07 10:37:44.973-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	13a62812
371	2026-07-07 10:42:02.241-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	0bd2aaaf
373	2026-07-07 10:43:45.934-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	da1d6361
377	2026-07-07 10:45:58.737-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	0d408825
1239	2026-07-15 09:40:54.142-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	051d8cc3
1243	2026-07-15 09:42:38.56-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	e4dfaa19
1244	2026-07-15 09:44:42.972-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	6c9ee010
1257	2026-07-15 10:05:57.484-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	d72b5838
1259	2026-07-15 10:06:59.445-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	51483e7d
1403	2026-07-16 11:00:40.144-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	944ef46d
1404	2026-07-16 11:19:38.632-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	6ef822b3
1406	2026-07-16 11:19:43.122-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	10ea1861
1408	2026-07-16 11:19:52.863-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	fac38deb
1417	2026-07-16 11:25:32.422-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9ULT-UK1BBU/cancelar)	75d2167d
1427	2026-07-16 11:36:47.944-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	24248996
1429	2026-07-16 11:37:29.341-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	299d337a
1430	2026-07-16 11:37:49.113-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	72249469
1449	2026-07-16 12:10:49.923-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	200a048b
1451	2026-07-16 12:10:56.082-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	ea989503
1456	2026-07-16 12:11:15.566-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	5e2f8448
1458	2026-07-16 12:11:52.639-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	fc83b685
1460	2026-07-16 12:11:55.317-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	012ed4c8
1461	2026-07-16 12:19:44.134-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/termos_uso)	161b76da
1466	2026-07-16 12:23:54.727-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/termos_uso)	82a1bb80
1467	2026-07-16 12:23:58.88-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	9628add7
1473	2026-07-16 12:29:45.547-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/cartao_consignado)	b00b2775
1474	2026-07-16 12:29:50.13-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/cartao_beneficio)	cd628686
367	2026-07-07 10:38:51.311-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/smtp/test)	cae2f83e
375	2026-07-07 10:43:58.632-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	6ed55204
1245	2026-07-15 09:50:55.887-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes) — FALHOU	b3905c30
1246	2026-07-15 09:59:26.662-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	246f40d6
1264	2026-07-15 10:24:04.922-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	4676becc
1265	2026-07-15 10:25:05.413-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	dfc5e6a9
1266	2026-07-15 10:25:08.469-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9605700/aprovar)	c0545119
1267	2026-07-15 10:25:36.718-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	e16a4170
1270	2026-07-15 10:30:16.479-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9891171/aprovar)	07c157fe
1280	2026-07-15 10:58:24.802-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	c0ca193d
1412	2026-07-16 11:20:07.262-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	0510543a
1434	2026-07-16 11:39:09.13-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9712741/aprovar)	31331c51
1454	2026-07-16 12:11:09.837-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9WU7-GPQ1SK/contrato)	e6ef0cc7
368	2026-07-07 10:38:56.525-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	e472c794
369	2026-07-07 10:41:58.444-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis)	bb3490a1
370	2026-07-07 10:42:00.255-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	2ff5fbbd
376	2026-07-07 10:45:52.304-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	c1b2ed89
380	2026-07-07 10:56:35.365-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	9d32ffb7
384	2026-07-07 10:59:07.05-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	444f775b
389	2026-07-07 11:15:59.033-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	dd8f15ad
391	2026-07-07 11:18:34.2-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	b26ab4ce
393	2026-07-07 11:19:01.664-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	17a22068
396	2026-07-07 11:19:56.062-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	2a99cd63
399	2026-07-07 11:23:08.012-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	dce8040e
1248	2026-07-15 10:02:17.644-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	53d1e4a2
1250	2026-07-15 10:04:06.688-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	398bf1b7
1256	2026-07-15 10:05:45.791-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9087745/aprovar)	3354c76c
1260	2026-07-15 10:16:27.668-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	6953b186
1263	2026-07-15 10:23:52.302-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	4ca32a87
1268	2026-07-15 10:25:57.117-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9258525/aprovar)	1b20bc4f
1271	2026-07-15 10:30:25.121-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	1d0d4512
1437	2026-07-16 11:52:09.907-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	bd035d91
372	2026-07-07 10:43:39.563-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	9e9e8114
374	2026-07-07 10:43:52.29-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	42584748
378	2026-07-07 10:46:05.343-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	90efbe26
379	2026-07-07 10:46:11.904-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	41764c34
381	2026-07-07 10:56:57.827-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	32ccd0e6
382	2026-07-07 10:56:59.019-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	a026f55e
383	2026-07-07 10:57:04.567-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	d184ab5d
385	2026-07-07 11:05:52.826-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/smtp/test)	70e02a80
386	2026-07-07 11:05:59.229-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	12c4567d
387	2026-07-07 11:06:05.948-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	4102406a
388	2026-07-07 11:06:12.6-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	c8554b3b
390	2026-07-07 11:18:32.993-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar)	fa6e04a3
392	2026-07-07 11:18:50.26-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	0ba3cea5
394	2026-07-07 11:19:23.155-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9567986	e8377c8f
395	2026-07-07 11:19:28.704-03	warn	banco.mutacao	banco	Banco aprovou/averbou a proposta 9567986 — FALHOU	9a0b4b97
397	2026-07-07 11:21:46.434-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	570d17a2
398	2026-07-07 11:21:53.921-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	e69c73ab
400	2026-07-07 11:23:13.264-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	83cf79d4
401	2026-07-07 11:25:17.7-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	5e78323e
402	2026-07-07 11:27:14.765-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	380f201a
403	2026-07-07 11:27:21.398-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	3d755242
404	2026-07-07 11:27:27.848-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	aa5cc585
405	2026-07-07 11:27:34.14-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	3fda8287
406	2026-07-07 11:27:40.993-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	eb2eec5a
407	2026-07-07 11:28:39.601-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis)	a7bf5e2a
408	2026-07-07 11:28:41.3-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	84dced59
409	2026-07-07 11:28:43.058-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	dc2e8a18
410	2026-07-07 11:28:49.922-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	96a835e5
411	2026-07-07 11:28:56.234-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	03c5ff41
412	2026-07-07 11:29:02.636-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	9416b71d
413	2026-07-07 11:29:09.368-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	f0d13ebe
414	2026-07-07 11:29:36.384-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	496372c6
415	2026-07-07 11:29:43.149-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	a3578744
416	2026-07-07 11:29:50.954-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	6f6f630f
417	2026-07-07 11:31:41.895-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PUT admin/smtp/config)	d4429448
418	2026-07-07 11:32:26.363-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	d46ddad3
419	2026-07-07 11:32:32.019-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	a237f089
420	2026-07-07 11:33:12.819-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	bff70775
421	2026-07-07 11:33:27.521-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	43a7effa
422	2026-07-07 11:33:43.268-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	c0fa940b
423	2026-07-07 11:34:49.33-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	5f3e0e03
424	2026-07-07 11:35:04.091-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	3a9c5f39
425	2026-07-07 11:35:17.928-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	e4cc7c52
426	2026-07-07 11:35:29.319-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/cadastros/tabela-emprestimos/TBL-001/reativar)	5f0658cd
427	2026-07-07 11:35:58.231-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	a3f8af26
428	2026-07-07 11:36:14.541-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar)	2fbe01ce
429	2026-07-07 11:36:15.719-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	b983ed77
430	2026-07-07 11:36:38.192-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	46566777
431	2026-07-07 11:36:59.359-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	c4af87d2
432	2026-07-07 11:37:07.759-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9306696	88050f51
433	2026-07-07 11:38:20.766-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	12048a91
434	2026-07-07 11:38:58.204-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	8d0dc9d0
435	2026-07-07 11:48:59.085-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PUT admin/smtp/config)	57e1ba56
436	2026-07-07 11:49:05.802-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	3eb9ffc2
437	2026-07-07 11:49:12.35-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	e2704b54
438	2026-07-07 11:49:19.079-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	cfce27c8
439	2026-07-07 11:49:25.471-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	c1e22ac4
440	2026-07-07 11:49:31.736-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	fd063dd4
443	2026-07-07 11:55:55.994-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	fa1b353c
1249	2026-07-15 10:02:53.892-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	a758f9d6
1438	2026-07-16 11:52:19.813-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	0c21f57a
441	2026-07-07 11:55:35.16-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	2b92973f
1251	2026-07-15 10:04:13.266-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	7d18c51e
1439	2026-07-16 11:52:23.461-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	6972a70d
1441	2026-07-16 11:52:26.325-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	463a05e3
1442	2026-07-16 11:52:27.321-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	828065f3
1444	2026-07-16 11:57:14.28-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	07d99f29
1462	2026-07-16 12:20:40.555-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	7c483df2
1477	2026-07-16 12:30:19.619-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/politica_privacidade)	85df1164
442	2026-07-07 11:55:54.785-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar)	9aefe625
444	2026-07-07 11:56:49.077-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	e0fb7228
445	2026-07-07 11:57:06.725-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	8d069472
446	2026-07-07 11:57:24.737-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9979041	28c66ad3
447	2026-07-07 11:58:05.689-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	88953462
448	2026-07-07 11:58:13.78-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	fe96c12d
450	2026-07-07 12:00:09.552-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	7b4ac105
451	2026-07-07 12:00:36.586-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	cc5aaa2d
456	2026-07-07 12:22:49.114-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	743c28ce
459	2026-07-07 12:23:55.968-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	b4112cd8
460	2026-07-07 12:24:06.286-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9556721	c687b22f
461	2026-07-07 12:24:09.052-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9109124	42bcc091
464	2026-07-07 12:42:33.135-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	a32563aa
465	2026-07-07 12:42:34.874-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	a54ba8ed
470	2026-07-07 12:43:20.852-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	766a0fd8
1252	2026-07-15 10:04:22.235-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	569ced87
1253	2026-07-15 10:05:21.905-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	2d4956b9
1254	2026-07-15 10:05:26.082-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9124911/aprovar)	f49852a9
1255	2026-07-15 10:05:40.259-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	da12710a
1440	2026-07-16 11:52:24.191-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	05e9288c
1443	2026-07-16 11:55:55.954-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	87524947
1445	2026-07-16 11:57:22.502-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	ab8f34ac
1447	2026-07-16 11:57:28.817-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	3c0c0c44
449	2026-07-07 12:00:00.673-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	1e56072d
452	2026-07-07 12:01:03.1-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	ff05e72f
453	2026-07-07 12:20:44.735-03	info	prefeitura.mutacao	prefeitura	Prefeitura importou/atualizou a base de servidores	27c90141
454	2026-07-07 12:22:37.469-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	9e87a7c3
455	2026-07-07 12:22:47.907-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar)	e5286146
457	2026-07-07 12:23:43.076-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	1dc00595
458	2026-07-07 12:23:52.545-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	35621cfe
462	2026-07-07 12:25:02.699-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	f5ba3600
463	2026-07-07 12:33:25.342-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	8c64dd46
466	2026-07-07 12:42:35.928-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	ca63b906
467	2026-07-07 12:42:43.83-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	f7bf047c
468	2026-07-07 12:42:43.992-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro	e8f8e80b
469	2026-07-07 12:42:44.337-03	warn	servidor.mutacao	servidor	Servidor atualizou os dados da conta — FALHOU	bd27634b
471	2026-07-07 12:45:13.042-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	5bbee37f
472	2026-07-07 12:45:15.823-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	e5ea1e65
473	2026-07-07 12:45:17.518-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	f47edd52
474	2026-07-07 12:45:18.585-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	ccbccc4a
475	2026-07-07 12:45:42.117-03	warn	sistema.mutacao	sistema	Sistema criou/atualizou uma prefeitura — FALHOU	7f1eb540
476	2026-07-07 12:45:42.734-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST admin/prefeituras/1/sincronizar) — FALHOU	9cbd22f6
477	2026-07-07 12:46:01.174-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	6f7a6b03
478	2026-07-07 12:46:02.274-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	1270162c
479	2026-07-07 12:46:27.076-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	2eecf741
480	2026-07-07 12:46:28.154-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	4e0fb97d
481	2026-07-07 12:46:35.523-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	3167f9e4
482	2026-07-07 12:47:01.826-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	177a50b6
483	2026-07-07 12:47:02.862-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	ef41886d
484	2026-07-07 12:47:43.648-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura — FALHOU	6f66dd8b
485	2026-07-07 12:47:44.714-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	798eb115
486	2026-07-07 12:51:26.805-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	22216b07
487	2026-07-07 12:52:29.679-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	60134a7c
488	2026-07-07 12:53:20.851-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/2/sincronizar)	fe1abee5
489	2026-07-07 12:53:21.163-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/2/sincronizar)	39fb183a
490	2026-07-07 12:53:23.689-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	a8f780c9
491	2026-07-07 12:53:31.901-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/3/sincronizar)	6b50c71b
492	2026-07-07 12:53:53.766-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	766ca2a1
493	2026-07-07 12:54:04.756-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/prefeituras/1/sincronizar)	8f0d6443
494	2026-07-07 12:54:35.827-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	349c3bff
495	2026-07-07 12:54:48.007-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	9d83830f
496	2026-07-07 12:55:08.878-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	1295bde7
497	2026-07-07 12:55:14.453-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	0ec4f019
498	2026-07-07 12:55:18.848-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	89f041af
499	2026-07-07 13:08:42.84-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	fe9364bc
500	2026-07-07 13:13:54.672-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	0b4f4690
501	2026-07-07 13:20:13.966-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9016712	10ded661
502	2026-07-07 13:24:11.485-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	048b34a0
503	2026-07-07 13:24:14.001-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	85646d65
504	2026-07-07 13:27:02.938-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	3ae12e1b
505	2026-07-07 13:27:15.532-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	784b4fa3
506	2026-07-07 13:27:17.975-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	552da98c
507	2026-07-07 13:27:21.856-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	01f24b3a
508	2026-07-07 13:34:31.353-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	0aca4fb8
509	2026-07-07 13:47:43.511-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	d1595431
510	2026-07-07 13:48:02.777-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	87895dde
511	2026-07-07 13:48:07.235-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	f6d8d28f
512	2026-07-07 13:48:11.737-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	8bb2dfb2
513	2026-07-07 13:51:20.619-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9806075	0bca4f45
514	2026-07-07 14:02:37.757-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PUT admin/smtp/config)	57ec10b5
515	2026-07-07 14:02:46.831-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	339a2d21
658	2026-07-08 16:09:01.463-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	30af40dc
516	2026-07-07 14:02:53.596-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	e27d7231
517	2026-07-07 14:03:00.307-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	a44fc799
518	2026-07-07 14:03:07.526-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	55d215ab
519	2026-07-07 14:14:16.523-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	b783b579
520	2026-07-07 14:16:01.695-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	8c96fd3f
523	2026-07-07 14:21:37.54-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	5b234198
526	2026-07-07 14:39:40.133-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	f2ed6d1a
532	2026-07-07 14:42:12.673-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9250438	cbdf6a29
1261	2026-07-15 10:21:53.005-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	f3af90bc
1262	2026-07-15 10:23:28.216-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	3c8abdd0
1274	2026-07-15 10:51:10.057-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	38c6f564
1275	2026-07-15 10:51:57.313-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	0e483e42
1290	2026-07-15 11:10:06.861-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9806495/aprovar)	0d4c75c6
1291	2026-07-15 11:12:00.682-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	c59212e8
1450	2026-07-16 12:10:50.907-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	ba792e57
1453	2026-07-16 12:11:04.938-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/telemedicina/cotacoes/TMC-TI9WU7-GPQ1SK/contrato)	e45b3e1b
1463	2026-07-16 12:21:30.365-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9XAE-BWMRBL/contrato)	10bda1f0
1465	2026-07-16 12:22:05.552-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	5243dfbf
521	2026-07-07 14:17:27.252-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	3cb8c9d3
529	2026-07-07 14:40:25.671-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	bcbc5cf2
535	2026-07-07 14:43:24.486-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	004cf3e5
539	2026-07-07 14:56:54.723-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9622428	9fb5a293
540	2026-07-07 15:03:04.385-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	0ff604b7
1269	2026-07-15 10:30:12.194-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	000fced1
1273	2026-07-15 10:49:03.307-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	82da80f2
1276	2026-07-15 10:52:00.97-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	376d6cc6
1459	2026-07-16 12:11:53.635-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	af8ffc1c
1468	2026-07-16 12:28:47.766-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/termos_uso)	d27c9ad6
1469	2026-07-16 12:29:00.861-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/lgpd_servidor)	e23f0d8b
1470	2026-07-16 12:29:17.893-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/refinanciamento)	ef5110e8
1471	2026-07-16 12:29:33.996-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/portabilidade)	717961dd
1472	2026-07-16 12:29:40.432-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/emprestimo)	b1714251
522	2026-07-07 14:18:30.11-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	ff9042e9
524	2026-07-07 14:38:07.428-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	dc77c8c1
525	2026-07-07 14:38:10.713-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9455341	ac937fd0
527	2026-07-07 14:40:08.497-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	c595a682
528	2026-07-07 14:40:15.338-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	4fd839b6
530	2026-07-07 14:40:50.409-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	13021156
531	2026-07-07 14:41:54.13-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	6fe60a10
533	2026-07-07 14:42:49.288-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	baebad63
534	2026-07-07 14:43:08.958-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	6ee99c7d
536	2026-07-07 14:43:42.673-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9875797	59562faf
537	2026-07-07 14:44:09.471-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	62d09e74
538	2026-07-07 14:56:51.754-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	b34d9417
541	2026-07-07 15:03:15.826-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	a739d270
542	2026-07-07 15:03:52.412-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	714f2e23
543	2026-07-07 15:04:32.368-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9108876	dc03ff43
544	2026-07-07 15:10:24.846-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	bce46277
545	2026-07-07 15:11:37.373-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	cc5ac917
546	2026-07-07 15:35:47.855-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	ba0fcb06
547	2026-07-07 15:35:49.053-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	114b8010
548	2026-07-07 15:49:17.34-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	41e5562f
549	2026-07-07 15:49:25.518-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	cdba8762
550	2026-07-07 15:49:37.769-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	98d0e2ee
551	2026-07-07 15:49:57.065-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9123932	2e5be7df
552	2026-07-07 15:50:37.375-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	d5643c7d
553	2026-07-07 15:52:58.421-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	7eaf8a78
554	2026-07-07 15:53:03.644-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	8ab0fa39
555	2026-07-07 16:00:51.353-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	9b290cfe
556	2026-07-07 16:01:05.733-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	5c082cf0
557	2026-07-07 16:27:25.888-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	17b3950f
558	2026-07-07 16:29:09.835-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	30f2eae2
559	2026-07-07 16:36:07.925-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	b829f813
560	2026-07-07 16:36:08.69-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	b34859ae
561	2026-07-07 16:41:46.974-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9772820	64b6d2b0
562	2026-07-07 16:44:19.358-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	a6b51998
563	2026-07-07 16:44:34.286-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	d6f77950
564	2026-07-07 16:44:44.515-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	4a9917ae
565	2026-07-07 17:10:07.858-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	3765a7c1
566	2026-07-07 17:12:24.104-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	7c497bcb
567	2026-07-07 17:12:36.826-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9716170	325f8398
568	2026-07-07 17:13:52.979-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9339188	30f999bb
569	2026-07-07 17:14:18.084-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	c1b7ada1
570	2026-07-08 08:33:32.061-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	6ab992d9
571	2026-07-08 08:33:33.784-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9635559	639774c8
572	2026-07-08 08:33:35.501-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	36c7a730
573	2026-07-08 08:33:36.72-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9451162	59b25bfd
574	2026-07-08 08:35:02.998-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	b399b25d
575	2026-07-08 08:35:14.355-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	dbc04b1d
576	2026-07-08 08:36:47.203-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	a7f15970
577	2026-07-08 08:36:55.165-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	7eb6c15a
578	2026-07-08 08:37:00.47-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	46d3ce47
579	2026-07-08 08:44:01.507-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	02e9134f
580	2026-07-08 08:45:04.569-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	6465054e
581	2026-07-08 08:45:45.314-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	b9486352
582	2026-07-08 08:50:08.072-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ofertas)	49baca6a
583	2026-07-08 08:51:15.458-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	b1a57e76
584	2026-07-08 08:51:46.762-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	b212aa09
585	2026-07-08 08:51:54.288-03	info	banco.mutacao	banco	Banco fez uma alteração (PATCH portal/banco/ofertas/OFT-B1-1/pausar)	2764d975
586	2026-07-08 09:30:05.978-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1/mover)	6dd63086
587	2026-07-08 09:30:12.845-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1/mover)	0c3f0d5a
588	2026-07-08 09:30:15.693-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1/mover)	216b00a6
589	2026-07-08 09:30:19.265-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1/mover)	15edc228
590	2026-07-08 09:30:22.719-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1/mover)	6a420115
591	2026-07-08 09:30:24.946-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1/mover)	ff907c2d
592	2026-07-08 09:30:40.22-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	9d7c0f08
593	2026-07-08 09:30:44.383-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783513840220/mover)	5c72d3fc
596	2026-07-08 09:37:22.004-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST confirmacao/solicitar)	837e4092
598	2026-07-08 09:37:35.636-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (POST confirmacao/solicitar)	6fa30cd6
1277	2026-07-15 10:52:04.689-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	1a35004a
1278	2026-07-15 10:52:08.159-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	fabe466b
1279	2026-07-15 10:52:11.649-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	0d36cb85
1284	2026-07-15 11:03:32.688-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	caa61d11
1285	2026-07-15 11:09:28.535-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	3d90f3fb
1288	2026-07-15 11:09:48.559-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9075173/aprovar)	28df4f16
1475	2026-07-16 12:30:00.239-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/telemedicina)	af8754a6
1476	2026-07-16 12:30:05.092-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/beneficio_generico)	c38965c0
594	2026-07-08 09:30:46.227-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783513840220/mover)	eb691e5d
597	2026-07-08 09:37:28.669-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	64394c65
599	2026-07-08 09:37:42.97-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	c6b5c334
1281	2026-07-15 10:59:51.106-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	18dbbc66
1282	2026-07-15 11:03:14.122-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	b4e1a580
1283	2026-07-15 11:03:25.762-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	dc35b020
1478	2026-07-16 12:30:30.129-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/termos/anuencia_prefeitura)	8065d759
1483	2026-07-16 12:55:25.092-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9YVY-K307HF/ativar)	d6312db0
1489	2026-07-16 12:56:15.721-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	52638443
1494	2026-07-16 12:56:48.085-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	97147749
1495	2026-07-16 12:56:51.91-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	d9dd4b0f
1496	2026-07-16 12:56:52.493-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	1bbd2559
1507	2026-07-16 12:59:19.382-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	07efdd00
1512	2026-07-16 12:59:50.713-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	6fc7efa9
595	2026-07-08 09:30:48.646-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783513840220/mover)	1c644462
600	2026-07-08 09:47:26.846-03	warn	sistema.mutacao	sistema	Sistema publicou um comunicado — FALHOU	c25279eb
601	2026-07-08 09:47:29.739-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	848a3f68
602	2026-07-08 09:47:32.263-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783514849739/mover)	50cdff67
603	2026-07-08 09:48:01.428-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783514849739)	88308f56
604	2026-07-08 10:06:07.553-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	1bad9b17
605	2026-07-08 10:13:22.115-03	warn	admin.mutacao	averbadora	Averbadora publicou um comunicado — FALHOU	6d482f27
606	2026-07-08 10:13:27.771-03	warn	admin.mutacao	averbadora	Averbadora publicou um comunicado — FALHOU	606e7542
607	2026-07-08 10:13:41.837-03	warn	admin.mutacao	averbadora	Averbadora publicou um comunicado — FALHOU	3654f31f
608	2026-07-08 10:15:17.442-03	warn	admin.mutacao	averbadora	Averbadora publicou um comunicado — FALHOU	88ee249d
609	2026-07-08 10:16:25.165-03	warn	admin.mutacao	averbadora	Averbadora publicou um comunicado — FALHOU	a7c19634
610	2026-07-08 10:16:29.37-03	warn	admin.mutacao	averbadora	Averbadora publicou um comunicado — FALHOU	cdea440d
611	2026-07-08 10:16:48.38-03	warn	admin.mutacao	averbadora	Averbadora publicou um comunicado — FALHOU	89845669
612	2026-07-08 10:17:24.655-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	f36144b6
613	2026-07-08 10:17:48-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	5a668c0c
614	2026-07-08 10:17:54.572-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783516644655)	83f8ce45
615	2026-07-08 10:17:58.721-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	7b3f419c
616	2026-07-08 10:18:57.547-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783516668000)	a7529b6e
617	2026-07-08 10:19:03.272-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783516678721)	9e336f2d
618	2026-07-08 10:21:19.352-03	warn	sistema.mutacao	sistema	Sistema publicou um comunicado — FALHOU	9444899e
619	2026-07-08 10:21:22.49-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	0d1aa2d7
620	2026-07-08 10:21:31.512-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783516882490)	646a0221
621	2026-07-08 10:31:35.305-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	8003e844
622	2026-07-08 10:38:42.086-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	0e8ab561
623	2026-07-08 10:42:10.367-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	e778c77a
624	2026-07-08 10:47:57.978-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783518127612)	a06a63c8
625	2026-07-08 11:24:48.863-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	35891365
626	2026-07-08 11:25:00.722-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	f4ec11fc
627	2026-07-08 11:45:31.155-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	89dbe3cd
628	2026-07-08 11:46:04.125-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9364763	0b26e372
629	2026-07-08 11:51:24.041-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	97e76ab7
630	2026-07-08 11:51:51.691-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9664502	0e58dec8
631	2026-07-08 11:53:47.419-03	info	prefeitura.mutacao	prefeitura	Prefeitura confirmou ADF(s) em folha — desconto aplicado	13fc3726
632	2026-07-08 12:21:53.575-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	37340ced
633	2026-07-08 13:37:25.219-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	e0c542fc
634	2026-07-08 13:37:25.395-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	0f92f8ec
635	2026-07-08 13:37:36.214-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	b7e9d50a
636	2026-07-08 13:55:42.443-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	a406c090
637	2026-07-08 13:56:20.746-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	afc893d7
638	2026-07-08 14:23:57.188-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	c187dc6f
639	2026-07-08 14:24:08.162-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	2cd387f1
640	2026-07-08 15:00:25.645-03	warn	banco.mutacao	banco	Banco recusou/cancelou a proposta 999999999 — FALHOU	dbe9de0f
641	2026-07-08 15:00:26.479-03	warn	banco.mutacao	banco	Banco recusou/cancelou a proposta 999999999 — FALHOU	4d638220
642	2026-07-08 15:02:58.433-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	1ebf981e
643	2026-07-08 15:04:33.85-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/beneficios/BEN-1/pausar)	2e2a9f82
644	2026-07-08 15:21:41.301-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	043cccdd
645	2026-07-08 15:21:42.088-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	266569b0
646	2026-07-08 15:23:34.297-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar) — FALHOU	d1b2e32d
647	2026-07-08 15:45:12.759-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	3df11f1e
648	2026-07-08 16:05:23.876-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	f4093413
649	2026-07-08 16:05:28.524-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST confirmacao/solicitar) — FALHOU	a111527f
650	2026-07-08 16:05:34.395-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	661478a0
651	2026-07-08 16:05:42.477-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar) — FALHOU	39cf875f
652	2026-07-08 16:06:00.605-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar)	2f4fcd41
653	2026-07-08 16:06:02.035-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	de264979
654	2026-07-08 16:06:18.767-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	bfb4da62
655	2026-07-08 16:07:03.29-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	7f67dada
656	2026-07-08 16:08:27.717-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	e0044dd4
657	2026-07-08 16:08:48.44-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	f7c39564
667	2026-07-08 16:18:27.492-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	fa3de383
671	2026-07-08 16:35:57.58-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	d0f7c819
677	2026-07-08 17:09:26.842-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	2f4daaea
688	2026-07-08 17:34:06.42-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste) — FALHOU	c4f27bc4
1286	2026-07-15 11:09:34.106-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9795128/aprovar)	f07afe4e
1287	2026-07-15 11:09:43.025-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	b85b2900
1289	2026-07-15 11:10:00.991-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	fce65137
1479	2026-07-16 12:55:01.958-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	d5bb99f9
1480	2026-07-16 12:55:04.793-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	3969c5c8
1484	2026-07-16 12:55:27.213-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	c7dcb0b5
1486	2026-07-16 12:55:33.826-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	2b39b598
1488	2026-07-16 12:56:14.766-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	1e2eb089
1492	2026-07-16 12:56:35.179-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9YXW-ORT6M0/ativar)	c5a33259
1502	2026-07-16 12:58:46.239-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	7ae8e85d
1511	2026-07-16 12:59:44.796-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	5fdc0147
1518	2026-07-16 13:55:33.079-03	info	admin.mutacao	averbadora	Averbadora processou tombamento de contratos	8b12923f
1523	2026-07-16 14:15:26.678-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	d64f59e5
1525	2026-07-16 14:21:07.394-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	dcce163a
1526	2026-07-16 14:21:09.442-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	ca6fdd15
1530	2026-07-16 14:43:27.346-03	warn	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (PUT prefeitura/convenios/CONV-001/config) — FALHOU	50772e0e
1531	2026-07-16 14:43:38.675-03	warn	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (PUT prefeitura/convenios/CONV-001/config) — FALHOU	3f38f309
1532	2026-07-16 14:44:36.832-03	warn	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (PUT prefeitura/convenios/CONV-001/config) — FALHOU	d01267a1
1534	2026-07-16 14:47:35.017-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	b7858124
1535	2026-07-16 14:47:36.84-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	e226bea2
1545	2026-07-16 14:52:11.285-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me) — FALHOU	62ddd88a
1547	2026-07-16 14:52:12.503-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/beneficios/x/clique) — FALHOU	0d96766b
1549	2026-07-16 14:52:13.816-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/codigo) — FALHOU	d71d363e
1555	2026-07-16 14:52:17.562-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/ofertas) — FALHOU	a3ec0efb
1569	2026-07-16 14:53:05.713-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	46c2e368
1570	2026-07-16 14:53:06.335-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	2457fe8f
1572	2026-07-16 14:54:28.553-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	d08ee68b
1575	2026-07-16 14:55:10.214-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	98757c78
659	2026-07-08 16:09:10.059-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 472600084	20842438
660	2026-07-08 16:09:22.279-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	6364b52d
661	2026-07-08 16:09:43.625-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9897029	6b75ac44
663	2026-07-08 16:09:49.649-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	69291017
665	2026-07-08 16:17:45.296-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar)	16cff0cf
672	2026-07-08 16:45:44.655-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	96144b93
673	2026-07-08 16:46:46.662-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	218360d7
674	2026-07-08 16:51:50.776-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	847303a7
1292	2026-07-15 11:49:26.327-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	4705366a
1481	2026-07-16 12:55:10.789-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	1e1ab620
1500	2026-07-16 12:58:35.552-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9Z1A-A7AZVP/contrato)	8a89a8b3
1505	2026-07-16 12:58:51.486-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	90ee0230
1510	2026-07-16 12:59:39.805-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9Z30-1MDWED/ativar)	9128d67f
662	2026-07-08 16:09:45.458-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	44793e4d
664	2026-07-08 16:17:23.083-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	ccb6476f
666	2026-07-08 16:17:46.495-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	f03a9bfd
668	2026-07-08 16:18:39.709-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	05a361d5
669	2026-07-08 16:20:02.857-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9264856	5a11f245
670	2026-07-08 16:34:17.419-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	a52534bd
675	2026-07-08 17:00:49.282-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	761340bc
676	2026-07-08 17:01:16.764-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	1a94ec0e
678	2026-07-08 17:12:56.089-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	8c0e0b3c
679	2026-07-08 17:13:00.879-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar) — FALHOU	fce9a6b6
680	2026-07-08 17:13:04.759-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar) — FALHOU	43858f4f
681	2026-07-08 17:14:06.867-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	400215f2
682	2026-07-08 17:14:09.365-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar) — FALHOU	3a3976f8
683	2026-07-08 17:14:13.12-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar) — FALHOU	859cabd9
684	2026-07-08 17:19:28.003-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	e1f5689f
685	2026-07-08 17:20:03.898-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	7b1fcde7
686	2026-07-08 17:27:30.338-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	0c5b5b09
687	2026-07-08 17:28:35.669-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/folhas/F-2026-06-2/consolidar)	a4387d76
689	2026-07-08 17:35:05.959-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste) — FALHOU	a9e1855b
690	2026-07-08 17:38:23.848-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	1e73be7b
691	2026-07-08 17:40:20.67-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis/201/2fa/rotate)	586babc8
692	2026-07-08 17:40:23.848-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	8bf819e7
693	2026-07-08 17:40:38.355-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis/201/2fa/disable)	dfe737a0
694	2026-07-08 17:40:45.428-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis/201/2fa/disable)	f921d15a
695	2026-07-08 17:40:57.043-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis)	b567e793
696	2026-07-08 17:55:55.833-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	d7b05b54
697	2026-07-09 19:06:28.029-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	2cae8f67
698	2026-07-09 19:14:15.195-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	6680c002
699	2026-07-09 19:14:27.728-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	aeb52557
700	2026-07-09 19:14:36.806-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar) — FALHOU	1e2c65fd
701	2026-07-10 08:43:27.113-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	6e85fbb3
702	2026-07-10 08:43:45.284-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	30d05008
703	2026-07-10 08:44:06.472-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	a79a5f25
704	2026-07-10 08:45:16.151-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	66a63bad
705	2026-07-10 08:45:22.446-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/solicitar)	2d2f498a
706	2026-07-10 08:45:33.935-03	info	banco.mutacao	banco	Banco fez uma alteração (POST confirmacao/verificar)	5d0eeff9
707	2026-07-10 08:48:07.766-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ofertas)	c1f03f9b
708	2026-07-10 08:49:04.006-03	info	banco.mutacao	banco	Banco fez uma alteração (PATCH portal/banco/ofertas/OFT-B1-2/pausar)	739a54d4
709	2026-07-10 08:58:27.3-03	info	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (PUT prefeitura/convenios/CONV-004/config)	68b83bd8
710	2026-07-10 08:58:49.021-03	warn	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (PUT prefeitura/convenios/CONV-004/config) — FALHOU	d6508f7a
711	2026-07-10 08:58:58.126-03	warn	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (PUT prefeitura/convenios/CONV-004/config) — FALHOU	9be165d8
712	2026-07-10 08:59:05.395-03	warn	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (PUT prefeitura/convenios/CONV-004/config) — FALHOU	f619cbc0
713	2026-07-10 09:01:33.079-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/folhas/F-2026-06-1/consolidar)	6692b59f
714	2026-07-10 09:01:56.165-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	d596a8b4
715	2026-07-10 09:01:59.676-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	b000a0ea
716	2026-07-10 09:02:05.468-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	6c06ce44
717	2026-07-10 09:02:09.057-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	352c4297
718	2026-07-10 09:02:12.516-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	00c3de73
719	2026-07-10 09:02:16.255-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	de8f1ee1
720	2026-07-10 09:02:19.508-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	6b02bdcd
721	2026-07-10 09:06:35.069-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	2d90fef8
722	2026-07-10 09:08:32.975-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	41f7cfd2
723	2026-07-10 09:21:34.075-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	15376538
724	2026-07-10 09:32:55.702-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	0736b427
725	2026-07-10 09:34:14.831-03	info	prefeitura.mutacao	prefeitura	Prefeitura importou/atualizou a base de servidores	e3fdcd88
727	2026-07-10 09:35:05.742-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	64346057
728	2026-07-10 09:41:14.607-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	f130df5c
734	2026-07-10 09:41:48.28-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	a7bf792a
745	2026-07-10 11:13:08.364-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	91f26943
1293	2026-07-15 11:49:34.128-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	9d0ea81f
1482	2026-07-16 12:55:19.146-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9YVY-K307HF/contrato)	d9e50906
1493	2026-07-16 12:56:40.036-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	671f4079
1498	2026-07-16 12:58:18.302-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	22666550
1506	2026-07-16 12:59:18.405-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	412ea9c7
1508	2026-07-16 12:59:25.146-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	b881a5a4
1509	2026-07-16 12:59:34.001-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9Z30-1MDWED/contrato)	0991da83
1513	2026-07-16 12:59:55.273-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	8577dc11
726	2026-07-10 09:34:38.18-03	info	prefeitura.mutacao	prefeitura	Prefeitura importou/atualizou a base de servidores	5c8d65db
729	2026-07-10 09:41:17.313-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	ae74c531
730	2026-07-10 09:41:25.965-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	6703a7e4
731	2026-07-10 09:41:28.667-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	34398dbb
732	2026-07-10 09:41:31.021-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	7069005e
733	2026-07-10 09:41:34.185-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	f6a67eeb
735	2026-07-10 09:41:50.9-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	aee26dfc
736	2026-07-10 09:41:55.071-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	3a70bc82
737	2026-07-10 09:41:56.956-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	c82a2756
738	2026-07-10 09:42:21.871-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro — FALHOU	0dc0878f
739	2026-07-10 09:42:22.505-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou um banco parceiro — FALHOU	29880dfb
740	2026-07-10 10:02:45.568-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST me/2fa/setup)	5e474e7b
741	2026-07-10 10:08:07.829-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	bd517b22
1294	2026-07-15 13:30:03.569-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	82da21b9
1295	2026-07-15 13:30:36.425-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	da59a661
1297	2026-07-15 13:31:03.823-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	933e09b3
1485	2026-07-16 12:55:31.735-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	17242359
1490	2026-07-16 12:56:22.674-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	243f9c9c
1491	2026-07-16 12:56:27.115-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9YXW-ORT6M0/contrato)	ae982a7b
1497	2026-07-16 12:58:16.424-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	db9293b2
1499	2026-07-16 12:58:23.708-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	ecf207c5
1501	2026-07-16 12:58:43.134-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9Z1A-A7AZVP/ativar)	1f58578b
1503	2026-07-16 12:58:49.16-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	edf3638e
1504	2026-07-16 12:58:50.788-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	d460640c
742	2026-07-10 10:08:08.442-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	e86da6b1
743	2026-07-10 10:46:34.331-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/beneficios/BEN-1/reativar)	7634f5fb
744	2026-07-10 10:58:13.505-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios) — FALHOU	1c8109d2
746	2026-07-10 11:14:04.23-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	597e682b
747	2026-07-10 11:31:57.433-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	d2bbe7b7
748	2026-07-10 11:39:53.099-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	5065768c
749	2026-07-10 11:41:18.001-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	e624dd8f
750	2026-07-10 12:04:33.763-03	info	prefeitura.mutacao	prefeitura	Prefeitura atualizou o status da folha	8362a062
751	2026-07-10 12:04:41.743-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	006405b3
752	2026-07-10 12:04:45.029-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	682ff4ef
753	2026-07-10 12:04:48.133-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	53c9fe6f
754	2026-07-10 12:04:50.406-03	info	prefeitura.mutacao	prefeitura	Prefeitura ajustou exigências de averbação (CCB/2FA)	662f1136
755	2026-07-10 12:42:06.855-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	0ff9269d
756	2026-07-10 12:42:35.598-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783698121177)	1f8d88ef
757	2026-07-10 12:44:37.43-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	ef5e0874
758	2026-07-10 12:48:14.366-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	33964f62
759	2026-07-10 12:48:25.46-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	42b60345
760	2026-07-10 12:56:23.122-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	0dd2207b
761	2026-07-10 12:56:34.438-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	5d796182
762	2026-07-10 13:02:06.409-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	8bcc45f9
763	2026-07-10 13:02:10.823-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	59315663
764	2026-07-10 13:02:20.175-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	62220737
765	2026-07-10 13:02:41.595-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	7a75e72f
766	2026-07-10 13:05:17.808-03	warn	sistema.mutacao	sistema	Sistema solicitou uma nova proposta de empréstimo ao banco — FALHOU	1eee986b
767	2026-07-10 13:05:20.584-03	warn	sistema.mutacao	sistema	Sistema solicitou uma nova proposta de empréstimo ao banco — FALHOU	3dc9d207
768	2026-07-10 13:05:26.676-03	warn	sistema.mutacao	sistema	Sistema solicitou uma nova proposta de empréstimo ao banco — FALHOU	2a6f376d
769	2026-07-10 13:05:34.743-03	warn	sistema.mutacao	sistema	Sistema solicitou uma nova proposta de empréstimo ao banco — FALHOU	bfcb660b
770	2026-07-10 13:07:42.118-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	da5f3514
771	2026-07-10 13:09:49.899-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	abc28441
772	2026-07-10 13:10:01.873-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	ce79dfa1
773	2026-07-10 13:10:09.53-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	f66dac49
774	2026-07-10 13:10:21.611-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	79dd676c
775	2026-07-10 13:10:22.413-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	c0ec4dae
776	2026-07-10 13:10:29.531-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	8f579a1e
777	2026-07-10 13:14:05.112-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	925d605e
778	2026-07-10 13:14:06.265-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	257ead3f
779	2026-07-10 13:22:39.473-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	18f80371
780	2026-07-10 13:23:04.805-03	warn	sistema.mutacao	sistema	Sistema publicou um comunicado — FALHOU	e24a89b0
781	2026-07-10 13:23:16.143-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	71471fcd
782	2026-07-10 13:23:56.349-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	b0cb452b
783	2026-07-10 13:27:06.673-03	warn	sistema.mutacao	sistema	Sistema trocou o convênio ativo — FALHOU	36b7fde4
784	2026-07-10 13:27:19.244-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	9cc08638
785	2026-07-10 13:27:26.482-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	24fa6490
786	2026-07-10 13:27:31.606-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	520cc9b1
787	2026-07-10 13:28:39.741-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/solicitar)	f3d09377
788	2026-07-10 13:29:24.8-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST confirmacao/verificar)	6769f933
789	2026-07-10 13:29:26.013-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	d4f6c4fa
790	2026-07-10 13:33:27.137-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	741e0bb9
791	2026-07-10 13:33:33.456-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9737613	4b1354b4
792	2026-07-10 13:38:33.746-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	06b4aaf6
793	2026-07-10 13:43:18.465-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783698989794/mover)	47061306
794	2026-07-10 13:43:33.002-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783698989794/mover)	9ca752f1
795	2026-07-10 13:44:17.127-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	206eabad
796	2026-07-10 13:44:58.166-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	b0f881e2
797	2026-07-10 13:45:17.928-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783701852300)	07882b19
798	2026-07-10 13:54:03.228-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	a4c2fc74
799	2026-07-10 13:54:06.216-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	bb602252
800	2026-07-10 13:54:14.561-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9264923/aprovar)	6d226b99
801	2026-07-10 14:00:24.451-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	5986330d
804	2026-07-10 14:00:30.075-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9737613	0d92a242
806	2026-07-10 14:01:28.67-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9737613	06c273c0
828	2026-07-10 14:15:30.956-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	dca63306
1296	2026-07-15 13:30:40.893-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9178485/aprovar)	39a827e4
1487	2026-07-16 12:55:34.33-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	c5147196
802	2026-07-10 14:00:25.722-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	5930923f
805	2026-07-10 14:01:24.806-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	b93165ba
815	2026-07-10 14:07:25.233-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	6d81d127
822	2026-07-10 14:11:34.965-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	2bbf2ae8
825	2026-07-10 14:14:45.634-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9381490/aprovar)	3a380711
1298	2026-07-15 15:51:13.857-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar) — FALHOU	5d523ea2
1514	2026-07-16 13:47:49.978-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST admin/manutencao/reset-servidores-teste) — FALHOU	2f6960f8
1515	2026-07-16 13:47:50.556-03	warn	sistema.mutacao	sistema	Sistema processou tombamento de contratos — FALHOU	e62cd732
1519	2026-07-16 13:55:34.139-03	info	admin.mutacao	averbadora	Averbadora processou tombamento de contratos	2ccabb79
1522	2026-07-16 14:09:55.347-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	13f9b5a7
803	2026-07-10 14:00:27.015-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	02866f17
811	2026-07-10 14:03:16.477-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	62b49056
812	2026-07-10 14:03:21.154-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	76a4a0e7
819	2026-07-10 14:11:12.506-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	d80af497
820	2026-07-10 14:11:16.965-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	319983f6
823	2026-07-10 14:13:09.056-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	08f6c446
824	2026-07-10 14:14:37.888-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	4e7f301a
1299	2026-07-15 15:51:22.377-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar) — FALHOU	573207f3
1516	2026-07-16 13:49:46.536-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	aaf654c4
1517	2026-07-16 13:51:46.006-03	info	admin.mutacao	averbadora	Averbadora processou tombamento de contratos	628f2750
1521	2026-07-16 14:05:45.822-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	109bee7f
807	2026-07-10 14:01:55.04-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	0c51b909
809	2026-07-10 14:02:42.05-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	37b14317
813	2026-07-10 14:03:35.215-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	f75d4c06
1300	2026-07-15 15:51:26.302-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar) — FALHOU	97c6cc72
1520	2026-07-16 13:55:58.85-03	info	admin.mutacao	averbadora	Averbadora processou tombamento de contratos	5ee02c7c
808	2026-07-10 14:02:36.946-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	5820737b
810	2026-07-10 14:03:04.655-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	03d9318e
814	2026-07-10 14:07:23.955-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	0fa17fa1
816	2026-07-10 14:07:26.407-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	a3ee2e84
817	2026-07-10 14:07:28.616-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	35ee38e6
818	2026-07-10 14:09:24.544-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	8f0385c4
821	2026-07-10 14:11:24.194-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	98f251ad
826	2026-07-10 14:14:56.781-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	1fe74e35
827	2026-07-10 14:15:06.446-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	3ad3bbfd
829	2026-07-10 14:15:35.33-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	e5734729
830	2026-07-10 14:17:04.115-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	6232ee31
831	2026-07-10 14:17:09.252-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	5dea5c3f
832	2026-07-10 14:17:29.668-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	211304e0
1301	2026-07-15 16:17:31.521-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	e13bcd0f
1304	2026-07-15 16:18:24.165-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	f957f96e
1313	2026-07-15 17:17:03.578-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	23ee8883
1315	2026-07-15 17:17:10.318-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	535544b2
1317	2026-07-15 17:17:30.197-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8GCQ-C2RHWY/ativar)	ea42de20
1321	2026-07-15 17:28:27.954-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8GM7-1WOYMQ/ativar)	69124836
1524	2026-07-16 14:18:16.568-03	info	admin.mutacao	averbadora	Averbadora rodou o bate de carteira (conciliação banco × folha)	6dc7fd68
1527	2026-07-16 14:29:12.332-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	2e769d4b
1539	2026-07-16 14:49:33.186-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	5ef8ac5e
1551	2026-07-16 14:52:15.034-03	warn	sistema.mutacao	sistema	Sistema atualizou os dados da conta — FALHOU	f4f32d66
1554	2026-07-16 14:52:16.963-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/matriculas) — FALHOU	c2c96c34
1556	2026-07-16 14:52:18.165-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/ofertas-banco) — FALHOU	35bb4063
1559	2026-07-16 14:52:20.101-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/x/cancelar) — FALHOU	17ea3921
1561	2026-07-16 14:52:21.299-03	warn	sistema.mutacao	sistema	Sistema solicitou uma nova proposta de empréstimo ao banco — FALHOU	d434db98
1563	2026-07-16 14:52:22.484-03	warn	sistema.mutacao	sistema	Sistema atualizou os dados da conta — FALHOU	0a53127f
1571	2026-07-16 14:54:27.075-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	7d2082d8
1576	2026-07-16 14:55:11.38-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	ad31d2cf
1578	2026-07-16 14:59:54.829-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	1d4e56eb
1585	2026-07-16 15:07:39.89-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura — FALHOU	d59c5718
833	2026-07-10 14:17:35.201-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	ee9624e0
834	2026-07-10 14:17:43.032-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	a7c9667a
835	2026-07-10 14:23:37.855-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/pre-reservas/sweep)	60d843f2
836	2026-07-10 14:24:06.648-03	info	admin.mutacao	averbadora	Averbadora cancelou a pré-reserva 472600084	1c5bdb19
837	2026-07-10 14:24:13.495-03	info	admin.mutacao	averbadora	Averbadora cancelou a pré-reserva 9698695	b2f79331
838	2026-07-10 14:24:17.72-03	info	admin.mutacao	averbadora	Averbadora cancelou a pré-reserva 9136959	866ee260
839	2026-07-10 14:24:21.458-03	info	admin.mutacao	averbadora	Averbadora cancelou a pré-reserva 9136959	69570c9f
840	2026-07-10 14:24:25.235-03	info	admin.mutacao	averbadora	Averbadora cancelou a pré-reserva 9264923	466838e2
841	2026-07-10 14:24:32.212-03	info	admin.mutacao	averbadora	Averbadora cancelou a pré-reserva 9381490	83a6f0da
842	2026-07-10 14:25:51.835-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	2a603bc7
843	2026-07-10 14:30:18.505-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	801678c3
844	2026-07-10 14:36:05.074-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	fc2be4a1
845	2026-07-10 14:36:06.925-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9178405/aprovar)	29322011
846	2026-07-10 14:36:19.63-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9148704/aprovar)	2b19f5a8
847	2026-07-10 14:41:16.383-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	ad6505f5
848	2026-07-10 14:43:48.283-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	a93d7e4e
849	2026-07-10 14:44:30.601-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9823825	becc329d
850	2026-07-10 14:44:36.089-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9144513/aprovar)	4d66a758
851	2026-07-10 14:45:30.951-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	6f0f650d
852	2026-07-10 14:45:49.077-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	25e2a874
853	2026-07-10 14:46:09.668-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	984a9b2d
854	2026-07-10 14:46:31.053-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	4e92d9fa
855	2026-07-10 14:47:01.243-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	8f30325c
856	2026-07-10 14:50:15.522-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	41b4bdd7
857	2026-07-10 14:50:21.28-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade) — FALHOU	fe84bff2
858	2026-07-10 14:50:27.426-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	30f9a47b
859	2026-07-10 14:52:12.494-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	fedf28bc
860	2026-07-10 14:52:13.762-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade)	3efb8fbc
861	2026-07-10 14:52:14.947-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade)	a4daf998
862	2026-07-10 14:53:20.025-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	2f97e0f5
863	2026-07-10 14:54:03.829-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade)	13d3bfc7
864	2026-07-10 14:54:20.294-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	9d914021
865	2026-07-10 14:56:34.817-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	c5884c60
866	2026-07-10 14:56:36.018-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade)	e4a768f8
867	2026-07-10 14:56:43.391-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	c9540be3
868	2026-07-10 16:19:22.423-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	448f8fb3
869	2026-07-10 16:19:57.792-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	f4b96902
870	2026-07-10 16:28:57.593-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	a5c2aa44
871	2026-07-10 16:37:14.721-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	b0f73da4
872	2026-07-10 16:37:40.556-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	d912d267
873	2026-07-10 16:54:29.542-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	5e7a656a
874	2026-07-10 17:10:33.541-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	1a7570c4
875	2026-07-10 17:12:32.745-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	9f4b1323
876	2026-07-10 17:12:34.355-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	f8ac92c7
877	2026-07-10 17:19:48.382-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9518368/aprovar)	53931bac
878	2026-07-10 17:28:38.006-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	1782a9da
879	2026-07-10 17:28:38.482-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade) — FALHOU	7f63e840
880	2026-07-10 17:28:42.922-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	5f6c5761
881	2026-07-10 17:28:52.382-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	b316885d
882	2026-07-10 17:31:21.905-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade)	9d14a803
883	2026-07-10 17:31:26.035-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	5e1fb5c0
884	2026-07-13 08:25:00.462-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9857375/aprovar)	b2e6c25f
885	2026-07-13 08:25:09.945-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9870830/aprovar)	99a509ee
886	2026-07-13 08:31:57.966-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	b3934d65
887	2026-07-13 08:33:46.504-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9441452	07fc6d94
888	2026-07-13 08:59:48.244-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	b6237ab1
889	2026-07-13 09:00:18.542-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	b912c059
890	2026-07-13 09:00:22.405-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9785093/aprovar)	1da9926a
891	2026-07-13 09:00:41.883-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	e2df6a4a
892	2026-07-13 09:07:50.691-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	af8a9d9a
1302	2026-07-15 16:17:35.478-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	cc70c238
1303	2026-07-15 16:18:22.289-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	83438780
1307	2026-07-15 16:41:56.565-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8DLA-5HL8XL/ativar)	8b81720f
1528	2026-07-16 14:29:41.826-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	e904023a
1529	2026-07-16 14:41:33.304-03	info	prefeitura.mutacao	prefeitura	Prefeitura processou um lote de tombamento	719b615e
1536	2026-07-16 14:48:19.331-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	03c8572b
1540	2026-07-16 14:51:07.076-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	0d048c33
1542	2026-07-16 14:51:34.493-03	info	prefeitura.mutacao	prefeitura	Prefeitura processou um lote de tombamento	e909ebae
1550	2026-07-16 14:52:14.448-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/comunicados) — FALHOU	4c19a98b
1552	2026-07-16 14:52:15.678-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/contratos/x/ccb.pdf) — FALHOU	4e67f89e
1553	2026-07-16 14:52:16.274-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/margem-consignavel) — FALHOU	d7111bee
1566	2026-07-16 14:52:24.338-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/termos/x) — FALHOU	fad4321b
1584	2026-07-16 15:07:38.409-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura — FALHOU	8fab4d5a
893	2026-07-13 09:08:09.445-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	e5003df9
894	2026-07-13 09:08:16.161-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9727139/aprovar)	159927a1
1305	2026-07-15 16:21:36.205-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	5f18afd2
1533	2026-07-16 14:44:41.976-03	warn	prefeitura.mutacao	prefeitura	Prefeitura fez uma alteração (PUT prefeitura/convenios/CONV-001/config) — FALHOU	c50b929b
1538	2026-07-16 14:49:30.141-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	e514a56b
1541	2026-07-16 14:51:31.432-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	55603b39
1544	2026-07-16 14:52:10.722-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/x) — FALHOU	468cdce0
1557	2026-07-16 14:52:18.864-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade) — FALHOU	0ed99f83
1558	2026-07-16 14:52:19.456-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/x/aceitar) — FALHOU	47dec342
1560	2026-07-16 14:52:20.705-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	1e74c5b6
1562	2026-07-16 14:52:21.913-03	warn	sistema.mutacao	sistema	Sistema atualizou os dados da conta — FALHOU	6677d98a
1564	2026-07-16 14:52:23.065-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	bed4250a
1565	2026-07-16 14:52:23.696-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/telemedicina/cotacoes) — FALHOU	411692de
1567	2026-07-16 14:52:24.935-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/vitrine) — FALHOU	6d2adc4d
1568	2026-07-16 14:52:29.119-03	info	prefeitura.mutacao	prefeitura	Prefeitura processou um lote de tombamento	0fd524cd
1574	2026-07-16 14:55:09.051-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	6eb60ec7
1579	2026-07-16 15:00:02.18-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	4ce7c0d4
1583	2026-07-16 15:07:32.678-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura — FALHOU	9c96602c
895	2026-07-13 09:08:30.964-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	ecd8b1c5
896	2026-07-13 09:09:07.014-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	9f669770
897	2026-07-13 10:44:10.36-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	57d93d17
898	2026-07-13 10:45:04.82-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	1fd5c425
899	2026-07-13 10:45:19.177-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9936685/aprovar)	c24dc78b
900	2026-07-13 10:45:32.887-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	3c9e75e7
901	2026-07-13 10:45:37.566-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	5f744965
902	2026-07-13 10:51:10.662-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9443792	02ea7618
903	2026-07-13 10:51:12.639-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	53d481a3
904	2026-07-13 10:51:47.512-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	a2e41908
905	2026-07-13 10:51:57.898-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9875017	c05d68fc
906	2026-07-13 10:52:17.45-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	269c46ad
907	2026-07-13 10:52:50.064-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9324526	c4b14b2a
908	2026-07-13 10:53:02.364-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	74b3e233
909	2026-07-13 10:53:27.336-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	31092012
910	2026-07-13 10:54:14.884-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	9f33c4be
911	2026-07-13 10:54:52.825-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	c41f418a
912	2026-07-13 10:55:00.18-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9604929/aprovar)	c687d3ad
913	2026-07-13 10:55:19.537-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	efd83df9
914	2026-07-13 10:57:47.03-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	69f4c5cd
915	2026-07-13 10:57:47.81-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	6e73f11e
916	2026-07-13 11:02:44.208-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/cadastros/tabela-emprestimos)	fdd2b797
917	2026-07-13 11:02:56.012-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	f20a467d
918	2026-07-13 11:02:56.764-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/margem/buscar)	871f11c0
919	2026-07-13 11:04:34.008-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/cadastros/tabela-emprestimos)	9282ab85
920	2026-07-13 11:05:26.927-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/cadastros/tabela-emprestimos)	60809674
921	2026-07-13 11:05:34.679-03	info	banco.mutacao	banco	Banco fez uma alteração (DELETE portal/banco/cadastros/tabela-emprestimos/TBL-102)	77e0c051
922	2026-07-13 11:05:50.387-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	0a81e408
923	2026-07-13 11:05:51.634-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	6472596c
924	2026-07-13 11:06:15.15-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	4092a115
925	2026-07-13 11:06:19.107-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9301453/aprovar)	55e4691c
926	2026-07-13 11:06:38.807-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	a9203b65
927	2026-07-13 11:06:43.408-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9551942/aprovar)	6350a59f
928	2026-07-13 11:07:00.289-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	d5c5eb8f
929	2026-07-13 11:07:04.995-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	6e94002c
930	2026-07-13 11:07:18.621-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	2b772d48
931	2026-07-13 11:07:24.414-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes) — FALHOU	bc5d3b10
932	2026-07-13 11:14:32.394-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9235185	085d7317
933	2026-07-13 11:14:50.669-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	5034b21d
934	2026-07-13 11:16:25.498-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	97d89712
935	2026-07-13 11:16:37.813-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	1ce6b08c
936	2026-07-13 11:19:28.311-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	68a05614
937	2026-07-13 11:22:45.244-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9666566	c6edcaf5
938	2026-07-13 11:27:19.421-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	fb4fff0e
939	2026-07-13 11:27:21.135-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	40e2410f
940	2026-07-13 11:27:23.013-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	7643d4e4
941	2026-07-13 11:27:23.536-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	47d78b5b
942	2026-07-13 11:30:39.133-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	a0d443c0
943	2026-07-13 11:30:40.483-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	5f1f91c7
944	2026-07-13 11:30:41.334-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	01e3ab25
945	2026-07-13 11:30:42.626-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	a40146ad
946	2026-07-13 11:30:43.472-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes) — FALHOU	161a42e5
947	2026-07-13 11:30:44.795-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	b326d077
948	2026-07-13 11:38:11.848-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	0e6df549
949	2026-07-13 11:38:13.192-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	44475021
950	2026-07-13 11:38:14.02-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	a52bfa04
952	2026-07-13 11:38:16.33-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes) — FALHOU	d43087e1
957	2026-07-13 11:40:04.113-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	8d635ce6
963	2026-07-13 11:48:09.236-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	041c9ac1
964	2026-07-13 11:48:25.796-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	b5355b6b
1306	2026-07-15 16:41:38.433-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	ef40126d
1537	2026-07-16 14:48:21.133-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	8c9a7d7e
951	2026-07-13 11:38:15.507-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	34ba6eab
956	2026-07-13 11:39:51.8-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	1299dea2
1308	2026-07-15 16:48:43.667-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	ce2ff354
1310	2026-07-15 16:51:50.364-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8DLA-5HL8XL/cancelar)	472ac8d8
1543	2026-07-16 14:52:10.043-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores) — FALHOU	b166841c
1546	2026-07-16 14:52:11.871-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/beneficios) — FALHOU	0e3ef8d7
1548	2026-07-16 14:52:13.089-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/cartoes) — FALHOU	1c684716
1573	2026-07-16 14:54:57.773-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	0eeef46a
1580	2026-07-16 15:06:22.376-03	info	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura	1a293ab6
1582	2026-07-16 15:07:16.857-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura — FALHOU	6414d8e7
953	2026-07-13 11:38:28.817-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	025b607a
965	2026-07-13 11:48:41.377-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	a288683b
966	2026-07-13 11:48:45.083-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9119355/aprovar)	d3ee4489
1309	2026-07-15 16:51:35.206-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8F16-5637RE/cancelar)	c5fbccdd
1333	2026-07-15 17:55:35.37-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	1510d895
1577	2026-07-16 14:59:45.822-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	c7dc3340
1581	2026-07-16 15:07:12.099-03	warn	admin.mutacao	averbadora	Averbadora criou/atualizou uma prefeitura — FALHOU	6ba088d1
954	2026-07-13 11:39:49.698-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	ea5f9e48
958	2026-07-13 11:40:28.924-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	3a1c01d5
1311	2026-07-15 17:15:58.135-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	f5b336b2
1322	2026-07-15 17:44:06.461-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	fe54e919
1328	2026-07-15 17:44:48.204-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	ead874d2
955	2026-07-13 11:39:50.99-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	a3a7899f
969	2026-07-13 11:49:02.115-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	84f2fd61
1312	2026-07-15 17:16:53.717-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	24f713a7
1314	2026-07-15 17:17:07.724-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8GC3-9DUOOL/cancelar)	81d662d8
1325	2026-07-15 17:44:25.267-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	0afee131
959	2026-07-13 11:42:39.182-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	1ca3d635
960	2026-07-13 11:47:26.655-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST portal/banco/ccb/upload) — FALHOU	ae33d072
961	2026-07-13 11:47:30.774-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	48004578
962	2026-07-13 11:47:33.963-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9300581/aprovar)	472f952e
1316	2026-07-15 17:17:15.832-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	319f51de
967	2026-07-13 11:48:47.831-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9119355/aprovar)	1c5c58e4
968	2026-07-13 11:48:53.059-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/cadastros/tabela-emprestimos)	654cbee3
970	2026-07-13 12:00:53.849-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9901760	1c28b8d7
971	2026-07-13 12:01:42.127-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	4883d4a7
972	2026-07-13 12:02:15.838-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/cadastros/tabela-emprestimos)	e1af911d
973	2026-07-13 12:02:51.275-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/cadastros/tabela-emprestimos)	176fde33
974	2026-07-13 12:06:15.226-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9337711	6e6b2a69
975	2026-07-13 12:11:01.92-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	39d64a36
976	2026-07-13 12:11:03.48-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	68b0ecd5
977	2026-07-13 12:11:05.831-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	67bf4310
978	2026-07-13 12:11:17.977-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	30e21834
979	2026-07-13 12:13:02.494-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/cadastros/tabela-emprestimos)	4f583b22
980	2026-07-13 12:13:25.126-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	3c062018
981	2026-07-13 12:13:58.5-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	4e70316a
982	2026-07-13 12:20:09.885-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	4cf8b413
983	2026-07-13 12:20:21.45-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	cc0ac605
984	2026-07-13 12:21:41.303-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	3b6c35b3
985	2026-07-13 12:21:42.632-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	6a11e5f4
986	2026-07-13 12:21:43.994-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	341fc3a2
987	2026-07-13 12:22:06.709-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	cd75125c
988	2026-07-13 12:22:20.4-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes) — FALHOU	b59bc46f
989	2026-07-13 12:22:32.43-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	5f3eae82
990	2026-07-13 12:22:43.327-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9518845/aprovar)	b56cb32c
991	2026-07-13 12:23:28.305-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	3536d9b7
992	2026-07-13 12:23:40.806-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	a4189477
993	2026-07-13 12:23:45.758-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	e1fa0c74
994	2026-07-13 12:23:50.515-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	82a650d1
995	2026-07-13 12:23:55.347-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	39eb1f1e
996	2026-07-13 12:23:59.332-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	5d2201ae
997	2026-07-13 12:24:09.963-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	8eced524
998	2026-07-13 12:25:05.982-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	c7492f24
999	2026-07-13 12:44:02.334-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	fb7e159a
1000	2026-07-13 12:46:58.196-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	cfbd88af
1001	2026-07-13 12:47:04.041-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9761667/aprovar)	e69a76e7
1002	2026-07-13 12:47:42.206-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	64b3cd65
1003	2026-07-13 12:59:32.413-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios) — FALHOU	7053f6bd
1004	2026-07-13 12:59:37.95-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios) — FALHOU	31615806
1005	2026-07-13 13:00:24.68-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios) — FALHOU	62dde2a3
1006	2026-07-13 13:00:35.817-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios) — FALHOU	15d07c7c
1007	2026-07-13 13:00:38.386-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios) — FALHOU	6912e777
1008	2026-07-13 13:01:44.824-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	a79993d8
1009	2026-07-13 13:02:03.527-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	89786d1a
1010	2026-07-13 13:02:52.212-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9280219	7b44dd7a
1011	2026-07-13 13:04:52.049-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9748723	03367946
1012	2026-07-13 13:05:22.06-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	4a4d9b98
1013	2026-07-13 13:05:28.294-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	aa52797a
1014	2026-07-13 13:06:02.178-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	f74c6d89
1015	2026-07-13 13:06:02.567-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	64f24507
1016	2026-07-13 13:06:08.508-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9665401/aprovar)	a3164e0c
1017	2026-07-13 13:06:36.491-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	c72d0339
1018	2026-07-13 13:06:45.478-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9987594/aprovar)	7f8af00d
1019	2026-07-13 13:06:58.009-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	aa3f48b1
1020	2026-07-13 13:07:35.822-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	55ac3f6a
1021	2026-07-13 13:07:39.465-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9217112/aprovar)	4f8c96c9
1022	2026-07-13 13:08:48.381-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	91bc95d3
1023	2026-07-13 13:10:50.374-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	4328cb29
1037	2026-07-13 13:43:33.803-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	bc115236
1053	2026-07-13 14:26:40.852-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	55529ff3
1084	2026-07-13 15:28:00.747-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	77af0300
1318	2026-07-15 17:17:58.823-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	c1395519
1319	2026-07-15 17:18:07.543-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8GCQ-C2RHWY/cancelar)	c962f84e
1024	2026-07-13 13:18:12.473-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	8b8d8897
1025	2026-07-13 13:18:13.732-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	8a299b1e
1027	2026-07-13 13:18:37.418-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	f98c9dc8
1030	2026-07-13 13:20:27.801-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	3fbed611
1031	2026-07-13 13:21:57.467-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	b803ab89
1032	2026-07-13 13:22:10.989-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	c32dc0a6
1035	2026-07-13 13:42:09.201-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	fb2ded07
1039	2026-07-13 13:44:27.744-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9099922/aprovar)	d6ec4c97
1041	2026-07-13 13:44:50.887-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9710953/aprovar)	966bb694
1042	2026-07-13 13:44:58.185-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9710953/aprovar)	c7cb4ce2
1048	2026-07-13 13:54:40.351-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	b996d1c9
1320	2026-07-15 17:22:56.934-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	bd4ef3c8
1026	2026-07-13 13:18:36.198-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	f5fe5b1e
1028	2026-07-13 13:18:39.941-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9365037	ba2c2930
1036	2026-07-13 13:43:19.975-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	8565d1ba
1043	2026-07-13 13:45:23.781-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	65ad8ad1
1323	2026-07-15 17:44:10.716-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	3d0344fd
1327	2026-07-15 17:44:46.291-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	a408920e
1332	2026-07-15 17:52:25.823-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	ba74ce43
1029	2026-07-13 13:20:14.658-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	e6edf641
1033	2026-07-13 13:34:23.206-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula) — FALHOU	c637afd2
1040	2026-07-13 13:44:46.593-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	87f85a50
1045	2026-07-13 13:47:35.332-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9852941	34cb2769
1049	2026-07-13 13:56:31.065-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	d65be1da
1052	2026-07-13 14:26:29.52-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	0bd31f16
1055	2026-07-13 14:29:20.157-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade) — FALHOU	87713c7d
1058	2026-07-13 14:54:15.486-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	8d22711a
1060	2026-07-13 14:56:33.368-03	info	servidor.mutacao	servidor	Servidor atualizou os dados da conta	3850ab38
1082	2026-07-13 15:27:01.324-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	25997a4d
1092	2026-07-13 15:32:24.638-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	3ff1342e
1096	2026-07-13 15:32:28.479-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	8e4ed9b5
1097	2026-07-13 15:32:29.014-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	ecc903a5
1106	2026-07-13 15:41:59.647-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	9fcd5a1e
1111	2026-07-13 15:45:32.98-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/codigo)	346bfd18
1113	2026-07-13 15:46:40.549-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	b71d6670
1114	2026-07-13 15:46:45.689-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	de2893a8
1116	2026-07-13 15:46:51.319-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	0d0c64aa
1118	2026-07-13 15:47:07.772-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	bcbebee9
1324	2026-07-15 17:44:13.145-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	42cab328
1326	2026-07-15 17:44:38.513-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8HM0-7BOLME/ativar)	96eb617f
1331	2026-07-15 17:51:38.18-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI8HWG-SEYPIA/ativar)	49ff976f
1034	2026-07-13 13:34:54.817-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	a08b248b
1038	2026-07-13 13:44:20.452-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	dbda8215
1046	2026-07-13 13:51:45.927-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	cb7748fc
1054	2026-07-13 14:27:28.703-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	cdaa687d
1329	2026-07-15 17:50:43.291-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	d9dcba57
1330	2026-07-15 17:51:08.206-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	643e10bf
1044	2026-07-13 13:47:15.596-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	4921ce8f
1047	2026-07-13 13:52:52.243-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	d03ecf95
1051	2026-07-13 13:56:55.596-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9582701/aprovar)	94286f6d
1065	2026-07-13 15:16:27.676-03	info	servidor.mutacao	servidor	Servidor atualizou os dados da conta	fcf1a17c
1070	2026-07-13 15:17:44.861-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783966567081/mover)	e90173b2
1115	2026-07-13 15:46:50.881-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	6c243c2d
1117	2026-07-13 15:46:59.508-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	9c778f97
1334	2026-07-16 09:27:15.592-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	81c579b9
1338	2026-07-16 09:43:23.332-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	b14c260b
1340	2026-07-16 09:43:35.921-03	warn	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload) — FALHOU	80f0e777
1347	2026-07-16 09:45:19.634-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	f9d32793
1349	2026-07-16 09:45:24.958-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST portal/banco/contratos/9688434/acao) — FALHOU	ee3ce29b
1350	2026-07-16 09:45:31.131-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	cf7463dc
1351	2026-07-16 09:45:39.532-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9Q3U-RJVCEB/ativar)	586cfd2e
1360	2026-07-16 09:46:59.129-03	info	banco.mutacao	banco	Banco recusou/cancelou a proposta 9529702	e82f6853
1391	2026-07-16 10:06:40.43-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/telemedicina/cotacao) — FALHOU	44ec4f52
1050	2026-07-13 13:56:50.138-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	de5a391c
1056	2026-07-13 14:40:30.065-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade) — FALHOU	cdd9440f
1057	2026-07-13 14:52:12.931-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	91f6ecbb
1059	2026-07-13 14:55:04.115-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	020d46e9
1061	2026-07-13 15:07:37.655-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	3e9812a5
1062	2026-07-13 15:08:31.247-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	9a5524bc
1063	2026-07-13 15:14:43.562-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	5f4441ba
1064	2026-07-13 15:16:14.743-03	info	admin.mutacao	averbadora	Averbadora publicou um comunicado	bb3b3977
1066	2026-07-13 15:16:44.485-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783966567081/mover)	d63ca761
1067	2026-07-13 15:16:57.701-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783966567081/mover)	64d94b05
1068	2026-07-13 15:17:33.316-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-2/mover)	03a57feb
1069	2026-07-13 15:17:36.754-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-1783966567081/mover)	b35fad2d
1071	2026-07-13 15:18:08.951-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/COM-3/mover)	e2d209cf
1072	2026-07-13 15:19:05.896-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	78653523
1073	2026-07-13 15:19:35.253-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	57b953ad
1074	2026-07-13 15:20:51.792-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	4268d8b4
1075	2026-07-13 15:22:51.028-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	fc69315b
1076	2026-07-13 15:22:59.492-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9699565/aprovar)	acc0e9cb
1077	2026-07-13 15:23:57.216-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	11f4473b
1078	2026-07-13 15:26:41.759-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	f4036a45
1079	2026-07-13 15:26:48.163-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	c3d8ee63
1080	2026-07-13 15:26:57.054-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	f2a2e443
1081	2026-07-13 15:26:58.757-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	f4acb1d7
1083	2026-07-13 15:27:10.819-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	f3b900e0
1085	2026-07-13 15:28:18.523-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	f87b89ca
1086	2026-07-13 15:28:21.927-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9145479/aprovar)	5ed4e5f2
1087	2026-07-13 15:29:43.969-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	1ed370e2
1088	2026-07-13 15:32:09.601-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	771893c3
1089	2026-07-13 15:32:13.037-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	33d93407
1090	2026-07-13 15:32:19.91-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	1f099529
1091	2026-07-13 15:32:24.094-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	f24a7a42
1093	2026-07-13 15:32:24.923-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	9848093f
1094	2026-07-13 15:32:25.534-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	67d54228
1095	2026-07-13 15:32:26.011-03	warn	sistema.mutacao	sistema	Sistema trocou o convênio ativo — FALHOU	1da9bd71
1098	2026-07-13 15:32:47.614-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	52115191
1099	2026-07-13 15:32:49.675-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	25f31b59
1100	2026-07-13 15:32:52.271-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	9897f2ae
1101	2026-07-13 15:33:04.841-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	301468f0
1102	2026-07-13 15:33:11.106-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	bfd7b8b1
1103	2026-07-13 15:33:15.498-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	190136b4
1104	2026-07-13 15:40:11.128-03	info	servidor.mutacao	servidor	Servidor atualizou os dados da conta	4e70b84d
1105	2026-07-13 15:41:55.617-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	f8fec36a
1107	2026-07-13 15:42:06.538-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	20c10471
1108	2026-07-13 15:42:12.665-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	769cfaf0
1109	2026-07-13 15:42:19.374-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	b627c561
1110	2026-07-13 15:45:00.826-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	6cddfcb3
1112	2026-07-13 15:46:26.619-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/codigo) — FALHOU	03052162
1119	2026-07-13 15:56:03.47-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	3a88075d
1120	2026-07-13 15:56:30.468-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	f349624d
1121	2026-07-13 15:56:54.597-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	90e74a53
1122	2026-07-13 15:57:09.097-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	4240f321
1123	2026-07-13 15:57:27.523-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/codigo) — FALHOU	6bbe69b0
1124	2026-07-13 15:58:21.598-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar) — FALHOU	2bd36427
1125	2026-07-13 15:58:25.399-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar) — FALHOU	04db2c8f
1126	2026-07-13 16:02:11.157-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/codigo)	fd1461bb
1127	2026-07-13 16:02:36.095-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/codigo) — FALHOU	7e98fff3
1128	2026-07-13 16:10:59.141-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	a4fc2deb
1130	2026-07-13 16:11:20.228-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	3d8967d8
1335	2026-07-16 09:27:22.228-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9601878/aprovar)	f5804219
1348	2026-07-16 09:45:23.554-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	8560d7c9
1353	2026-07-16 09:45:47.047-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	b04cd6a6
1355	2026-07-16 09:46:39.83-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	777f76ce
1356	2026-07-16 09:46:46.555-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	ea6d9ec5
1379	2026-07-16 09:54:18.881-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9QI6-ADDG9F/ativar)	b6887c15
1382	2026-07-16 09:54:36.865-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	f9a6f2d0
1384	2026-07-16 09:56:40.526-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	6b2e9a5b
1386	2026-07-16 09:56:51.744-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9QMN-C53YYO/ativar)	7809267f
1129	2026-07-13 16:11:03.084-03	info	banco.mutacao	banco	Banco aprovou/averbou a proposta 9833742	501d1d91
1131	2026-07-13 16:23:06.384-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/reset-servidores-teste)	ba5b40c7
1132	2026-07-13 16:23:08.516-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	a31f7d08
1135	2026-07-13 17:13:21.707-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	858d3d98
1336	2026-07-16 09:27:53.861-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	4f20e922
1339	2026-07-16 09:43:29.275-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	630b8afc
1342	2026-07-16 09:44:20.955-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	42560874
1343	2026-07-16 09:44:23.713-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	1952bdc1
1358	2026-07-16 09:46:53.466-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	cbcb7d74
1381	2026-07-16 09:54:35.003-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	e6e9e2db
1133	2026-07-13 16:30:48.721-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	1a2313c8
1134	2026-07-13 16:56:11.084-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	5423860c
1136	2026-07-13 17:14:01.829-03	info	banco.mutacao	banco	Banco trocou o convênio ativo	bd0a387d
1137	2026-07-13 17:14:59.11-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	c8e585d6
1138	2026-07-13 17:15:04.033-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9691962/aprovar)	5de31ef5
1139	2026-07-13 17:42:05.308-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	b6e9a555
1140	2026-07-13 17:42:49.286-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	e1f39fe9
1141	2026-07-14 09:13:21.623-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	819cfc0f
1142	2026-07-14 09:14:48.121-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	f27f648b
1143	2026-07-14 09:18:46.205-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	7ed0f8f2
1144	2026-07-14 09:18:55.348-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	7ccd2632
1145	2026-07-14 09:39:00.212-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	f66fee34
1146	2026-07-14 09:39:17.351-03	info	admin.mutacao	averbadora	Averbadora atualizou um servidor	2da7dd80
1147	2026-07-14 09:58:11.6-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/email-templates)	21f6da0a
1148	2026-07-14 09:58:24.24-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/email-templates/TPL-simulacao-cartao_beneficio-aprovada-banco/test)	4534d303
1149	2026-07-14 09:59:27.465-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/email-templates/TPL-simulacao-cartao_consignado-aprovada-banco/test)	d14e3fa1
1150	2026-07-14 10:00:04.627-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/email-templates/TPL-simulacao-cartao_consignado-aprovada-banco/test)	a2c423b8
1151	2026-07-14 10:10:53.257-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/email-templates/TPL-simulacao-cartao_beneficio-aprovada-servidor/test)	1dddbc35
1152	2026-07-14 10:11:33.395-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/email-templates/TPL-simulacao-cartao_beneficio-aprovada-servidor/test)	f1634933
1153	2026-07-14 10:13:43.653-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/email-templates/TPL-simulacao-cartao_beneficio-recusada-servidor/test)	df93ae52
1154	2026-07-14 10:20:57.189-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST me/2fa/setup)	5d13242c
1155	2026-07-14 10:25:10.684-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST admin/ai/normalize-csv) — FALHOU	ebea5273
1156	2026-07-14 10:25:33.423-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/ai/normalize-csv)	b13172b8
1157	2026-07-14 10:25:36.844-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	7ed611b8
1158	2026-07-14 10:25:54.981-03	info	admin.mutacao	averbadora	Averbadora importou base de servidores	2c1a0a4e
1159	2026-07-14 10:26:08.66-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/ai/normalize-csv)	9b6cfaac
1160	2026-07-14 10:34:26.977-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/comunicados/COM-1783966567081)	b2c84213
1161	2026-07-14 10:36:01.343-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/beneficios/BEN-2/pausar)	274c4316
1162	2026-07-14 11:11:19.9-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	8ddd939f
1163	2026-07-14 11:12:32.928-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	d4afe560
1164	2026-07-14 11:12:51.335-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	96056d20
1165	2026-07-14 11:12:55.765-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9696350/aprovar)	059ef6be
1166	2026-07-14 11:13:29.305-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	b08e6f73
1167	2026-07-14 11:13:45.102-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	0551a2bd
1168	2026-07-14 11:39:52.241-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	96c886fd
1169	2026-07-14 11:43:36.294-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	054e878b
1170	2026-07-14 11:43:45.211-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9257374/aprovar)	71ed138d
1171	2026-07-14 11:50:28.849-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade) — FALHOU	ebeaf6dc
1172	2026-07-14 12:03:47.603-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	ca7228e5
1173	2026-07-14 12:05:25.588-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/comunicados/reordenar)	23d3dae3
1174	2026-07-14 12:19:33.297-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/beneficios)	2bac03f3
1175	2026-07-14 12:20:24.724-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (PATCH admin/beneficios/BEN-3/pausar)	b657dec7
1176	2026-07-14 12:33:00.918-03	info	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco	b51d6c6e
1177	2026-07-14 14:36:12.933-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis) — FALHOU	6c7b7f41
1178	2026-07-14 14:36:28.928-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis) — FALHOU	08a04e36
1179	2026-07-14 14:36:30.691-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis) — FALHOU	b02b625e
1180	2026-07-14 14:37:39.338-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis)	4064a2af
1181	2026-07-14 14:38:47.105-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (DELETE admin/perfis/206)	1184454c
1182	2026-07-14 14:39:03.671-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis) — FALHOU	054589d7
1183	2026-07-14 14:39:10.081-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis) — FALHOU	10a60e08
1184	2026-07-14 14:39:14.581-03	warn	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/perfis) — FALHOU	87411121
1185	2026-07-14 15:39:56.334-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	c0c14c98
1186	2026-07-14 15:39:59.929-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9071994/aprovar)	901cd5e1
1187	2026-07-14 16:19:17.561-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	014e024d
1188	2026-07-14 16:20:06.098-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	14d6acde
1189	2026-07-14 16:21:00.001-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	5b5ca1c8
1190	2026-07-14 16:21:01.571-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	f148a249
1191	2026-07-14 16:21:02.859-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	97f2a34c
1192	2026-07-14 16:21:04.226-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	9bb20bbf
1193	2026-07-14 16:21:32.741-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/ccb/upload)	05db9479
1195	2026-07-14 16:22:52.155-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas) — FALHOU	dca7ebca
1200	2026-07-14 16:24:34.271-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	377e1e2e
1201	2026-07-14 16:24:41.825-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	33f7c433
1202	2026-07-14 16:24:48.604-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	87319415
1203	2026-07-14 16:25:22.642-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	bb221ce5
1204	2026-07-14 16:25:26.39-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	1cd85514
1206	2026-07-14 16:25:34.201-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	4ebaa7d8
1207	2026-07-14 16:25:35.542-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/cartoes)	8fe89877
1208	2026-07-14 16:25:41.665-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	89f49855
1337	2026-07-16 09:43:20.265-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	8be617c2
1346	2026-07-16 09:45:18.083-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	a329e039
1354	2026-07-16 09:46:38.899-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	7258dcfe
1357	2026-07-16 09:46:51.795-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/TMC-TI9Q5W-QKETB2/ativar)	5c20ac51
1390	2026-07-16 10:00:11.297-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/telemedicina/cotacao)	3236f5c9
1194	2026-07-14 16:21:44.554-03	info	banco.mutacao	banco	Banco fez uma alteração (POST portal/banco/contratos/9213428/aprovar)	4aee4fb9
1196	2026-07-14 16:23:52.018-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	424b608c
1197	2026-07-14 16:24:14.207-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	19d2ff5f
1198	2026-07-14 16:24:20.975-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	b1d6b9c1
1199	2026-07-14 16:24:33.747-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/adf/confirmar)	326074ec
1205	2026-07-14 16:25:29.199-03	warn	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	e3cfc210
1209	2026-07-14 16:50:39.226-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (POST servidores/me/portabilidade/solicitar) — FALHOU	b2a6b1f4
1210	2026-07-14 16:52:08.905-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	7d0d7417
1211	2026-07-14 17:11:47.959-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	91e3c1e6
1212	2026-07-14 17:17:19.611-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	339ef515
1213	2026-07-14 17:27:43.132-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	1719f33d
1214	2026-07-14 17:28:36.244-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	66a66745
1215	2026-07-14 17:28:39.105-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	f01da9d3
1216	2026-07-14 17:28:41.453-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	1e2caa54
1217	2026-07-14 17:34:06.759-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (DELETE servidores/me/propostas) — FALHOU	8198a268
1218	2026-07-14 17:34:35.692-03	warn	sistema.mutacao	sistema	Sistema fez uma alteração (DELETE servidores/me/propostas) — FALHOU	fb9fc39c
1219	2026-07-14 17:35:54.27-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	c6706cd6
1220	2026-07-14 17:35:57.304-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	7ccc3b5b
1221	2026-07-14 17:36:51.248-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	c79a1b0b
1222	2026-07-14 17:38:54.521-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	703b61ba
1223	2026-07-14 18:01:25.244-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	c8dbb421
1224	2026-07-14 18:01:31.322-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (POST servidores/me/portabilidade/solicitar)	ee0366f0
1225	2026-07-14 18:01:37.999-03	info	servidor.mutacao	servidor	Servidor fez uma alteração (DELETE servidores/me/propostas)	aa711efb
1341	2026-07-16 09:43:51.175-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	a5b8f365
1344	2026-07-16 09:44:27.95-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	ab4a4f65
1345	2026-07-16 09:44:51.067-03	warn	servidor.mutacao	servidor	Servidor solicitou uma nova proposta de empréstimo ao banco — FALHOU	0db91947
1352	2026-07-16 09:45:45.376-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	23712020
1359	2026-07-16 09:46:55.261-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	230b2769
1366	2026-07-16 09:49:06.761-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/telemedicina/cotacoes/purge)	40c82e11
1367	2026-07-16 09:50:34.49-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	5533b5e2
1376	2026-07-16 09:54:00.348-03	info	admin.mutacao	averbadora	Averbadora fez uma alteração (POST admin/manutencao/purge-contratos-matricula)	47577d23
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, trace_id, categoria, acao, cpf, matricula, proposta_id, contrato_id, id_unico, ip, user_agent, device_id, termo_aceito, user_id, user_role, detalhes, ts) FROM stdin;
1	\N	pre_reserva	criada	***.***.***-33	764521800	PR-MR57YZXL-6UC5	\N	FLO-000734	\N	\N	\N	\N	servidor:1	servidor	Servidor ADRIANA MARQUES DA SILVA solicitou credito: R$ 25000.00 em 48x — banco 1	2026-07-03 14:40:55.398077-03
2	\N	pre_reserva	criada	***.***.***-33	764521800	PR-MR58GOYW-VGHQ	\N	FLO-410267	\N	\N	\N	\N	servidor:1	servidor	Servidor ADRIANA MARQUES DA SILVA solicitou credito: R$ 5600.00 em 72x — banco 1	2026-07-03 14:54:40.992842-03
3	\N	pre_reserva	criada	***.***.***-33	764521800	PR-MR58HSQY-UMEW	\N	FLO-405703	\N	\N	\N	\N	servidor:1	servidor	Servidor ADRIANA MARQUES DA SILVA solicitou credito: R$ 3100.00 em 36x — banco 1	2026-07-03 14:55:32.52097-03
4	\N	pre_reserva	criada	***.***.***-33	764521800	PR-MR58SP3J-BAD3	\N	FLO-794832	\N	\N	\N	\N	servidor:1	servidor	Servidor ADRIANA MARQUES DA SILVA solicitou credito: R$ 25000.00 em 48x — banco 1	2026-07-03 15:04:01.044078-03
5	\N	pre_reserva	criada	***.***.***-33	764521800	PR-MR58ZI0Y-N8VW	\N	FLO-544731	\N	\N	\N	\N	servidor:1	servidor	Servidor ADRIANA MARQUES DA SILVA solicitou credito: R$ 8500.00 em 36x — banco 1	2026-07-03 15:09:18.503088-03
6	\N	pre_reserva	criada	***.***.***-33	764521800	PR-MR59JGHC-7KF9	\N	FLO-925338	\N	\N	\N	\N	servidor:1	servidor	Servidor ADRIANA MARQUES DA SILVA solicitou credito: R$ 10000.00 em 24x — banco 1	2026-07-03 15:24:49.580362-03
7	\N	pre_reserva	criada	***.***.***-33	764521800	PR-MR5A4QZ2-LF0Q	\N	FLO-848987	\N	\N	\N	\N	servidor:1	servidor	Servidor ADRIANA MARQUES DA SILVA solicitou credito: R$ 15900.00 em 24x — banco 1	2026-07-03 15:41:29.592016-03
8	\N	pre_reserva	criada	***.***.***-33	764521800	PR-MR5ADMUF-S88D	\N	FLO-722440	\N	\N	\N	\N	servidor:1	servidor	Servidor ADRIANA MARQUES DA SILVA solicitou credito: R$ 1100.00 em 12x — banco 1	2026-07-03 15:48:17.527828-03
\.


--
-- Data for Name: banco_usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banco_usuarios (id, banco_id, user_id, perfil, ips_permitidos, ativo, criado_em) FROM stdin;
\.


--
-- Data for Name: bancos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bancos (id, nome, adapter, status, dominios_email, config, created_at) FROM stdin;
3	BANCO TESTE ISOLAMENTO	sandbox	inativo	["test.local"]	{"scopes": ["contratos:read"], "loginEmail": "bancoiso@test.local", "contatoEmail": "iso@test.local", "passwordHash": "2adc6da6b1b1688b73bb7b8776b920f1d4ddc94b6f7d070698d716bda7f9e28b", "mtlsHabilitado": false}	2026-07-06 15:52:13.765243-03
1	Banco Atlas	sandbox	ativo	["atlas.com"]	{"scopes": [], "loginEmail": "banco@atlas.com", "ultimoTeste": "2026-06-22T10:00:00Z", "contatoEmail": "anthonysantosmachado159@gmail.com", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "ultimoTesteOk": true, "mtlsHabilitado": false}	2026-07-02 16:47:05.980173-03
4	teste123	sandbox	inativo	["gmail.com"]	{"scopes": ["propostas:rw"], "loginEmail": "test231@gmail.com", "contatoEmail": "test231@gmail.com", "passwordHash": "d9b5f58f0b38198293971865a14074f59eba3e82595becbe86ae51f1d9f1f65e", "mtlsHabilitado": false}	2026-07-07 09:22:15.093471-03
5	TESTE ISOLAMENTO	sandbox	inativo	["atlas.test"]	{"scopes": ["propostas:rw"], "loginEmail": "teste-isolamento@atlas.test", "contatoEmail": "teste@teste.com", "passwordHash": "2adc6da6b1b1688b73bb7b8776b920f1d4ddc94b6f7d070698d716bda7f9e28b", "mtlsHabilitado": false}	2026-07-07 09:53:56.670626-03
2	test	sandbox	inativo	["gmail.com"]	{"scopes": ["propostas:rw"], "loginEmail": "test@gmail.com", "contatoEmail": "test@Gmail.com", "passwordHash": "d9b5f58f0b38198293971865a14074f59eba3e82595becbe86ae51f1d9f1f65e", "mtlsHabilitado": false}	2026-07-06 15:42:41.603435-03
\.


--
-- Data for Name: comunicados; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comunicados (id, prefeitura_id, banco_id, titulo, corpo, imagem_url, link_label, link_href, ativo_de, ativo_ate, criado_em) FROM stdin;
\.


--
-- Data for Name: consentimentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consentimentos (id, servidor_id, tipo, versao_texto, aceito_em, ip, user_agent, revogado_em, ativo) FROM stdin;
\.


--
-- Data for Name: contrato_eventos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contrato_eventos (id, contrato_id, evento, de_estado, para_estado, ator, motivo, payload_hash, trace_id, criado_em) FROM stdin;
\.


--
-- Data for Name: contratos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contratos (id, proposta_id, servidor_id, banco_id, convenio_id, adf, tipo_contrato, codigo_verba, valor_financiado, valor_liquido, valor_parcela, parcelas_total, parcelas_pagas, taxa_am, cet_am, valor_iof, dias_carencia, saldo_devedor, folha_primeiro_desconto, folha_ultimo_desconto, situacao, situacao_detalhe, criado_em, atualizado_em, prefeitura_id) FROM stdin;
\.


--
-- Data for Name: convenio_tabelas_emprestimo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.convenio_tabelas_emprestimo (id, convenio_id, taxa_min_am, taxa_max_am, prazo_max_meses, vigencia_inicio, vigencia_fim, ativo, created_at) FROM stdin;
\.


--
-- Data for Name: convenios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.convenios (id, prefeitura_id, banco_id, nome, codigo_verba, data_corte, dia_repasse, ativo, created_at) FROM stdin;
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_templates (id, data, updated_at) FROM stdin;
TPL-primeiro-acesso-servidor	{"id": "TPL-primeiro-acesso-servidor", "nome": "Primeiro acesso — Servidor", "ativo": true, "corpo": "Olá {{nome}},\\n\\nUse o código abaixo para concluir seu primeiro acesso ao Atlas:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe você não iniciou este cadastro, ignore este e-mail.\\n\\nAtlas Averbadora", "evento": "primeiro_acesso", "assunto": "Confirme seu primeiro acesso ao Atlas", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"servidor\\" solicita o código de primeiro acesso.", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:54:57.666989-03
TPL-primeiro-acesso-banco	{"id": "TPL-primeiro-acesso-banco", "nome": "Primeiro acesso — Banco", "ativo": true, "corpo": "Olá {{nome}},\\n\\nUse o código abaixo para concluir seu primeiro acesso ao Atlas:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe você não iniciou este cadastro, ignore este e-mail.\\n\\nAtlas Averbadora", "evento": "primeiro_acesso", "assunto": "Confirme seu primeiro acesso ao Atlas", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"banco\\" solicita o código de primeiro acesso.", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:54:58.345911-03
TPL-primeiro-acesso-prefeitura	{"id": "TPL-primeiro-acesso-prefeitura", "nome": "Primeiro acesso — Prefeitura", "ativo": true, "corpo": "Olá {{nome}},\\n\\nUse o código abaixo para concluir seu primeiro acesso ao Atlas:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe você não iniciou este cadastro, ignore este e-mail.\\n\\nAtlas Averbadora", "evento": "primeiro_acesso", "assunto": "Confirme seu primeiro acesso ao Atlas", "publico": "prefeitura", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"prefeitura\\" solicita o código de primeiro acesso.", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:54:59.03023-03
TPL-primeiro-acesso-averbadora	{"id": "TPL-primeiro-acesso-averbadora", "nome": "Primeiro acesso — Averbadora", "ativo": true, "corpo": "Olá {{nome}},\\n\\nUse o código abaixo para concluir seu primeiro acesso ao Atlas:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe você não iniciou este cadastro, ignore este e-mail.\\n\\nAtlas Averbadora", "evento": "primeiro_acesso", "assunto": "Confirme seu primeiro acesso ao Atlas", "publico": "averbadora", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"averbadora\\" solicita o código de primeiro acesso.", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:54:59.731404-03
TPL-recuperar-senha-servidor	{"id": "TPL-recuperar-senha-servidor", "nome": "Recuperar senha — Servidor", "ativo": true, "corpo": "Olá {{nome}},\\n\\nRecebemos um pedido de recuperação de senha para sua conta.\\n\\nUse o código abaixo para redefinir sua senha:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe você não solicitou, ignore este e-mail — sua senha atual continua válida.\\n\\nAtlas Averbadora", "evento": "recuperar_senha", "assunto": "Recupere sua senha do Atlas", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"servidor\\" clica em \\"Esqueci a senha\\".", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:55:00.603793-03
TPL-recuperar-senha-banco	{"id": "TPL-recuperar-senha-banco", "nome": "Recuperar senha — Banco", "ativo": true, "corpo": "Olá {{nome}},\\n\\nRecebemos um pedido de recuperação de senha para sua conta.\\n\\nUse o código abaixo para redefinir sua senha:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe você não solicitou, ignore este e-mail — sua senha atual continua válida.\\n\\nAtlas Averbadora", "evento": "recuperar_senha", "assunto": "Recupere sua senha do Atlas", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"banco\\" clica em \\"Esqueci a senha\\".", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:55:01.281348-03
TPL-recuperar-senha-prefeitura	{"id": "TPL-recuperar-senha-prefeitura", "nome": "Recuperar senha — Prefeitura", "ativo": true, "corpo": "Olá {{nome}},\\n\\nRecebemos um pedido de recuperação de senha para sua conta.\\n\\nUse o código abaixo para redefinir sua senha:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe você não solicitou, ignore este e-mail — sua senha atual continua válida.\\n\\nAtlas Averbadora", "evento": "recuperar_senha", "assunto": "Recupere sua senha do Atlas", "publico": "prefeitura", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"prefeitura\\" clica em \\"Esqueci a senha\\".", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:55:01.948225-03
TPL-recuperar-senha-averbadora	{"id": "TPL-recuperar-senha-averbadora", "nome": "Recuperar senha — Averbadora", "ativo": true, "corpo": "Olá {{nome}},\\n\\nRecebemos um pedido de recuperação de senha para sua conta.\\n\\nUse o código abaixo para redefinir sua senha:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe você não solicitou, ignore este e-mail — sua senha atual continua válida.\\n\\nAtlas Averbadora", "evento": "recuperar_senha", "assunto": "Recupere sua senha do Atlas", "publico": "averbadora", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"averbadora\\" clica em \\"Esqueci a senha\\".", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:55:02.615317-03
TPL-redefinir-senha-servidor	{"id": "TPL-redefinir-senha-servidor", "nome": "Redefinir senha — Servidor", "ativo": true, "corpo": "Olá {{nome}},\\n\\nUse o código abaixo para confirmar a troca da sua senha:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe não foi você que pediu a troca, entre em contato com o suporte imediatamente.\\n\\nAtlas Averbadora", "evento": "redefinir_senha", "assunto": "Confirme a troca de senha do Atlas", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"servidor\\" pede pra trocar a senha (verificação por email).", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:55:03.358722-03
TPL-redefinir-senha-banco	{"id": "TPL-redefinir-senha-banco", "nome": "Redefinir senha — Banco", "ativo": true, "corpo": "Olá {{nome}},\\n\\nUse o código abaixo para confirmar a troca da sua senha:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe não foi você que pediu a troca, entre em contato com o suporte imediatamente.\\n\\nAtlas Averbadora", "evento": "redefinir_senha", "assunto": "Confirme a troca de senha do Atlas", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"banco\\" pede pra trocar a senha (verificação por email).", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:55:04.039543-03
TPL-redefinir-senha-prefeitura	{"id": "TPL-redefinir-senha-prefeitura", "nome": "Redefinir senha — Prefeitura", "ativo": true, "corpo": "Olá {{nome}},\\n\\nUse o código abaixo para confirmar a troca da sua senha:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe não foi você que pediu a troca, entre em contato com o suporte imediatamente.\\n\\nAtlas Averbadora", "evento": "redefinir_senha", "assunto": "Confirme a troca de senha do Atlas", "publico": "prefeitura", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"prefeitura\\" pede pra trocar a senha (verificação por email).", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:55:04.708576-03
TPL-simulacao-emprestimo-recusada-banco	{"id": "TPL-simulacao-emprestimo-recusada-banco", "nome": "Simulação empréstimo consignado — recusada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de empréstimo consignado (protocolo {{adf}}) foi recusada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de empréstimo consignado — recusada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de empréstimo consignado muda para \\"recusada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "emprestimo", "simulacaoStatus": "recusada"}	2026-07-14 09:55:09.46301-03
TPL-simulacao-cartao_consignado-enviada-banco	{"id": "TPL-simulacao-cartao_consignado-enviada-banco", "nome": "Simulação cartão consignado — enviada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão consignado (protocolo {{adf}}) foi enviada.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão consignado — enviada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de cartão consignado muda para \\"enviada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_consignado", "simulacaoStatus": "enviada"}	2026-07-14 09:55:12.320541-03
TPL-simulacao-cartao_consignado-recusada-banco	{"id": "TPL-simulacao-cartao_consignado-recusada-banco", "nome": "Simulação cartão consignado — recusada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão consignado (protocolo {{adf}}) foi recusada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão consignado — recusada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de cartão consignado muda para \\"recusada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_consignado", "simulacaoStatus": "recusada"}	2026-07-14 09:55:14.993572-03
TPL-simulacao-cartao_beneficio-enviada-banco	{"id": "TPL-simulacao-cartao_beneficio-enviada-banco", "nome": "Simulação cartão benefício — enviada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão benefício (protocolo {{adf}}) foi enviada.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão benefício — enviada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de cartão benefício muda para \\"enviada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_beneficio", "simulacaoStatus": "enviada"}	2026-07-14 09:55:17.699645-03
TPL-simulacao-cartao_beneficio-averbada-servidor	{"id": "TPL-simulacao-cartao_beneficio-averbada-servidor", "nome": "Simulação cartão benefício — averbada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão benefício (protocolo {{adf}}) foi averbada em folha.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão benefício — averbada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de cartão benefício muda para \\"averbada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_beneficio", "simulacaoStatus": "averbada"}	2026-07-14 09:55:21.119546-03
TPL-simulacao-portabilidade-enviada-servidor	{"id": "TPL-simulacao-portabilidade-enviada-servidor", "nome": "Simulação portabilidade — enviada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de portabilidade (protocolo {{adf}}) foi enviada.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de portabilidade — enviada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de portabilidade muda para \\"enviada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "portabilidade", "simulacaoStatus": "enviada"}	2026-07-14 09:55:22.47356-03
TPL-simulacao-portabilidade-recusada-banco	{"id": "TPL-simulacao-portabilidade-recusada-banco", "nome": "Simulação portabilidade — recusada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de portabilidade (protocolo {{adf}}) foi recusada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de portabilidade — recusada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de portabilidade muda para \\"recusada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "portabilidade", "simulacaoStatus": "recusada"}	2026-07-14 09:55:25.817403-03
TPL-redefinir-senha-averbadora	{"id": "TPL-redefinir-senha-averbadora", "nome": "Redefinir senha — Averbadora", "ativo": true, "corpo": "Olá {{nome}},\\n\\nUse o código abaixo para confirmar a troca da sua senha:\\n\\n{{codigo}}\\n\\nO código expira em {{expira_em}} minutos.\\n\\nSe não foi você que pediu a troca, entre em contato com o suporte imediatamente.\\n\\nAtlas Averbadora", "evento": "redefinir_senha", "assunto": "Confirme a troca de senha do Atlas", "publico": "averbadora", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Enviado quando um usuário do perfil \\"averbadora\\" pede pra trocar a senha (verificação por email).", "variaveis": ["nome", "codigo", "expira_em"], "atualizadoEm": "2026-07-14T10:00:00.000Z"}	2026-07-14 09:55:05.387293-03
TPL-simulacao-emprestimo-enviada-servidor	{"id": "TPL-simulacao-emprestimo-enviada-servidor", "nome": "Simulação empréstimo consignado — enviada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de empréstimo consignado (protocolo {{adf}}) foi enviada.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de empréstimo consignado — enviada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de empréstimo consignado muda para \\"enviada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "emprestimo", "simulacaoStatus": "enviada"}	2026-07-14 09:55:06.055681-03
TPL-simulacao-emprestimo-aprovada-banco	{"id": "TPL-simulacao-emprestimo-aprovada-banco", "nome": "Simulação empréstimo consignado — aprovada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de empréstimo consignado (protocolo {{adf}}) foi aprovada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de empréstimo consignado — aprovada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de empréstimo consignado muda para \\"aprovada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "emprestimo", "simulacaoStatus": "aprovada"}	2026-07-14 09:55:08.068953-03
TPL-simulacao-emprestimo-averbada-banco	{"id": "TPL-simulacao-emprestimo-averbada-banco", "nome": "Simulação empréstimo consignado — averbada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de empréstimo consignado (protocolo {{adf}}) foi averbada em folha.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de empréstimo consignado — averbada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de empréstimo consignado muda para \\"averbada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "emprestimo", "simulacaoStatus": "averbada"}	2026-07-14 09:55:10.971161-03
TPL-simulacao-cartao_beneficio-enviada-servidor	{"id": "TPL-simulacao-cartao_beneficio-enviada-servidor", "nome": "Simulação cartão benefício — enviada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão benefício (protocolo {{adf}}) foi enviada.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão benefício — enviada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de cartão benefício muda para \\"enviada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_beneficio", "simulacaoStatus": "enviada"}	2026-07-14 09:55:17.031125-03
TPL-simulacao-cartao_beneficio-aprovada-servidor	{"id": "TPL-simulacao-cartao_beneficio-aprovada-servidor", "nome": "Simulação cartão benefício — aprovada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão benefício (protocolo {{adf}}) foi aprovada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão benefício — aprovada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de cartão benefício muda para \\"aprovada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_beneficio", "simulacaoStatus": "aprovada"}	2026-07-14 09:55:18.375166-03
TPL-simulacao-cartao_beneficio-recusada-servidor	{"id": "TPL-simulacao-cartao_beneficio-recusada-servidor", "nome": "Simulação cartão benefício — recusada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão benefício (protocolo {{adf}}) foi recusada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão benefício — recusada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de cartão benefício muda para \\"recusada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_beneficio", "simulacaoStatus": "recusada"}	2026-07-14 09:55:19.768961-03
TPL-simulacao-portabilidade-averbada-banco	{"id": "TPL-simulacao-portabilidade-averbada-banco", "nome": "Simulação portabilidade — averbada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de portabilidade (protocolo {{adf}}) foi averbada em folha.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de portabilidade — averbada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de portabilidade muda para \\"averbada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "portabilidade", "simulacaoStatus": "averbada"}	2026-07-14 09:55:27.179541-03
TPL-simulacao-emprestimo-enviada-banco	{"id": "TPL-simulacao-emprestimo-enviada-banco", "nome": "Simulação empréstimo consignado — enviada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de empréstimo consignado (protocolo {{adf}}) foi enviada.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de empréstimo consignado — enviada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de empréstimo consignado muda para \\"enviada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "emprestimo", "simulacaoStatus": "enviada"}	2026-07-14 09:55:06.718653-03
TPL-simulacao-emprestimo-averbada-servidor	{"id": "TPL-simulacao-emprestimo-averbada-servidor", "nome": "Simulação empréstimo consignado — averbada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de empréstimo consignado (protocolo {{adf}}) foi averbada em folha.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de empréstimo consignado — averbada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de empréstimo consignado muda para \\"averbada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "emprestimo", "simulacaoStatus": "averbada"}	2026-07-14 09:55:10.299621-03
TPL-simulacao-cartao_consignado-recusada-servidor	{"id": "TPL-simulacao-cartao_consignado-recusada-servidor", "nome": "Simulação cartão consignado — recusada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão consignado (protocolo {{adf}}) foi recusada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão consignado — recusada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de cartão consignado muda para \\"recusada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_consignado", "simulacaoStatus": "recusada"}	2026-07-14 09:55:14.321718-03
TPL-simulacao-cartao_consignado-averbada-servidor	{"id": "TPL-simulacao-cartao_consignado-averbada-servidor", "nome": "Simulação cartão consignado — averbada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão consignado (protocolo {{adf}}) foi averbada em folha.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão consignado — averbada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de cartão consignado muda para \\"averbada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_consignado", "simulacaoStatus": "averbada"}	2026-07-14 09:55:15.668077-03
TPL-simulacao-portabilidade-enviada-banco	{"id": "TPL-simulacao-portabilidade-enviada-banco", "nome": "Simulação portabilidade — enviada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de portabilidade (protocolo {{adf}}) foi enviada.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de portabilidade — enviada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de portabilidade muda para \\"enviada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "portabilidade", "simulacaoStatus": "enviada"}	2026-07-14 09:55:23.140734-03
TPL-simulacao-portabilidade-recusada-servidor	{"id": "TPL-simulacao-portabilidade-recusada-servidor", "nome": "Simulação portabilidade — recusada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de portabilidade (protocolo {{adf}}) foi recusada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de portabilidade — recusada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de portabilidade muda para \\"recusada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "portabilidade", "simulacaoStatus": "recusada"}	2026-07-14 09:55:25.139503-03
TPL-simulacao-emprestimo-aprovada-servidor	{"id": "TPL-simulacao-emprestimo-aprovada-servidor", "nome": "Simulação empréstimo consignado — aprovada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de empréstimo consignado (protocolo {{adf}}) foi aprovada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de empréstimo consignado — aprovada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de empréstimo consignado muda para \\"aprovada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "emprestimo", "simulacaoStatus": "aprovada"}	2026-07-14 09:55:07.386652-03
TPL-simulacao-emprestimo-recusada-servidor	{"id": "TPL-simulacao-emprestimo-recusada-servidor", "nome": "Simulação empréstimo consignado — recusada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de empréstimo consignado (protocolo {{adf}}) foi recusada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de empréstimo consignado — recusada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de empréstimo consignado muda para \\"recusada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "emprestimo", "simulacaoStatus": "recusada"}	2026-07-14 09:55:08.784458-03
TPL-simulacao-cartao_consignado-aprovada-banco	{"id": "TPL-simulacao-cartao_consignado-aprovada-banco", "nome": "Simulação cartão consignado — aprovada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão consignado (protocolo {{adf}}) foi aprovada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão consignado — aprovada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de cartão consignado muda para \\"aprovada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_consignado", "simulacaoStatus": "aprovada"}	2026-07-14 09:55:13.651648-03
TPL-simulacao-cartao_beneficio-recusada-banco	{"id": "TPL-simulacao-cartao_beneficio-recusada-banco", "nome": "Simulação cartão benefício — recusada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão benefício (protocolo {{adf}}) foi recusada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão benefício — recusada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de cartão benefício muda para \\"recusada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_beneficio", "simulacaoStatus": "recusada"}	2026-07-14 09:55:20.443256-03
TPL-simulacao-cartao_beneficio-averbada-banco	{"id": "TPL-simulacao-cartao_beneficio-averbada-banco", "nome": "Simulação cartão benefício — averbada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão benefício (protocolo {{adf}}) foi averbada em folha.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão benefício — averbada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de cartão benefício muda para \\"averbada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_beneficio", "simulacaoStatus": "averbada"}	2026-07-14 09:55:21.79159-03
TPL-simulacao-cartao_consignado-enviada-servidor	{"id": "TPL-simulacao-cartao_consignado-enviada-servidor", "nome": "Simulação cartão consignado — enviada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão consignado (protocolo {{adf}}) foi enviada.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão consignado — enviada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de cartão consignado muda para \\"enviada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_consignado", "simulacaoStatus": "enviada"}	2026-07-14 09:55:11.64151-03
TPL-simulacao-cartao_consignado-aprovada-servidor	{"id": "TPL-simulacao-cartao_consignado-aprovada-servidor", "nome": "Simulação cartão consignado — aprovada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão consignado (protocolo {{adf}}) foi aprovada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão consignado — aprovada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de cartão consignado muda para \\"aprovada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_consignado", "simulacaoStatus": "aprovada"}	2026-07-14 09:55:12.983092-03
TPL-simulacao-cartao_consignado-averbada-banco	{"id": "TPL-simulacao-cartao_consignado-averbada-banco", "nome": "Simulação cartão consignado — averbada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão consignado (protocolo {{adf}}) foi averbada em folha.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão consignado — averbada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de cartão consignado muda para \\"averbada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "cartao_consignado", "simulacaoStatus": "averbada"}	2026-07-14 09:55:16.350097-03
TPL-simulacao-portabilidade-aprovada-servidor	{"id": "TPL-simulacao-portabilidade-aprovada-servidor", "nome": "Simulação portabilidade — aprovada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de portabilidade (protocolo {{adf}}) foi aprovada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de portabilidade — aprovada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de portabilidade muda para \\"aprovada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "portabilidade", "simulacaoStatus": "aprovada"}	2026-07-14 09:55:23.814658-03
TPL-simulacao-portabilidade-aprovada-banco	{"id": "TPL-simulacao-portabilidade-aprovada-banco", "nome": "Simulação portabilidade — aprovada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de portabilidade (protocolo {{adf}}) foi aprovada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de portabilidade — aprovada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de portabilidade muda para \\"aprovada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "portabilidade", "simulacaoStatus": "aprovada"}	2026-07-14 09:55:24.482002-03
TPL-simulacao-portabilidade-averbada-servidor	{"id": "TPL-simulacao-portabilidade-averbada-servidor", "nome": "Simulação portabilidade — averbada (Servidor)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de portabilidade (protocolo {{adf}}) foi averbada em folha.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de portabilidade — averbada", "publico": "servidor", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"servidor\\" quando uma simulação de portabilidade muda para \\"averbada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T10:00:00.000Z", "simulacaoTipo": "portabilidade", "simulacaoStatus": "averbada"}	2026-07-14 09:55:26.500796-03
TPL-simulacao-cartao_beneficio-aprovada-banco	{"id": "TPL-simulacao-cartao_beneficio-aprovada-banco", "nome": "Simulação cartão benefício — aprovada (Banco)", "ativo": true, "corpo": "Olá {{nome}},\\n\\nSua simulação de cartão benefício (protocolo {{adf}}) foi aprovada pelo banco.\\n\\nValor: {{valor}}\\nParcelas: {{parcelas}}x de {{valorParcela}}\\nBanco: {{banco}}\\n\\nAtlas Averbadora", "evento": "simulacao", "assunto": "Simulação de cartão benefício — aprovada", "publico": "banco", "criadoEm": "2026-07-14T10:00:00.000Z", "descricao": "Disparado no perfil \\"banco\\" quando uma simulação de cartão benefício muda para \\"aprovada\\".", "variaveis": ["nome", "adf", "valor", "parcelas", "valorParcela", "banco"], "atualizadoEm": "2026-07-14T12:58:10.909Z", "simulacaoTipo": "cartao_beneficio", "simulacaoStatus": "aprovada"}	2026-07-14 09:58:11.303908-03
TPL-beneficio-BEN-3	{"id": "TPL-beneficio-BEN-3", "nome": "Benefício — Academia", "ativo": true, "corpo": "Olá {{nome}},\\n\\nO benefício \\"Academia\\" está disponível para você.\\n\\n{{desconto_label}} {{desconto_complemento}}\\n\\nAcesse o Atlas para ver os detalhes.\\n\\nAtlas Averbadora", "evento": "beneficio", "assunto": "Novo benefício disponível: Academia", "publico": "servidor", "criadoEm": "2026-07-14T15:19:32.187Z", "descricao": "Aviso enviado quando o benefício \\"Academia\\" fica disponível para o público-alvo.", "variaveis": ["nome", "desconto_label", "desconto_complemento"], "beneficioId": "BEN-3", "atualizadoEm": "2026-07-14T15:19:32.187Z"}	2026-07-14 12:19:32.936614-03
\.


--
-- Data for Name: folha_movimentacoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.folha_movimentacoes (id, folha_id, prefeitura_id, servidor_id, matricula, competencia, tipo, adf, banco_id, valor, detalhe, aplicado_em) FROM stdin;
\.


--
-- Data for Name: folhas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.folhas (id, prefeitura_id, competencia, data_corte, data_repasse, status, sincronizado_em) FROM stdin;
\.


--
-- Data for Name: notificacoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notificacoes (id, target_role, target_id, from_role, tipo, titulo, corpo, link_href, proposta_id, contrato_id, matricula, severidade, lida_em, criado_em) FROM stdin;
\.


--
-- Data for Name: portabilidade_intencoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portabilidade_intencoes (id, data, updated_at) FROM stdin;
\.


--
-- Data for Name: portal_banco_contratos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portal_banco_contratos (adf, data, updated_at) FROM stdin;
461050084	{"adf": "461050084", "iof": 885.41, "nome": "SUZANA DALLARMI", "cetAm": 0.0229, "taxaAm": 0.0179, "bancoId": 1, "convenio": "JOINVILLE / DELTA GLOBAL", "situacao": "Ativo", "cpfMasked": "***.***.***-35", "expiracao": null, "matricula": "56571701", "convenioId": "CONV-003", "lancamento": "25/03/2026", "servidorId": 71701, "codigoVerba": "1547 - DELTA GLOBAL I", "folhaStatus": "aplicada", "idMatricula": "MAT-56571701", "observacoes": "Operacao gerada pelo seed inicial.", "dataContrato": "25/03/2026", "diasCarencia": 30, "saldoDevedor": 25312.5, "tipoContrato": "EMPRESTIMO", "valorLiquido": 25364.59, "valorParcela": 312.5, "parcelasPagas": 3, "totalParcelas": 84, "valorFinanciado": 26250, "folhaUltimoDesconto": "Marco/2033", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-08 17:09:26.534078-03
472600084	{"adf": "472600084", "iof": 777.72, "nome": "FERNANDA KELLI TOMAZONI", "cetAm": 0.0229, "taxaAm": 0.0179, "bancoId": 1, "convenio": "FLORIPA / DELTA GLOBAL", "situacao": "Cancelado", "cpfMasked": "***.***.***-34", "expiracao": "26/06/2026", "matricula": "843796302", "convenioId": "CONV-002", "lancamento": "19/06/2026", "servidorId": 96302, "codigoVerba": "1547 - DELTA GLOBAL I", "idMatricula": "MAT-843796302", "observacoes": "Operacao gerada pelo seed inicial.", "dataContrato": "19/06/2026", "diasCarencia": 30, "saldoDevedor": 22336.74, "tipoContrato": "EMPRESTIMO", "valorLiquido": 22279.56, "valorParcela": 240.18, "parcelasPagas": 3, "totalParcelas": 96, "valorFinanciado": 23057.28, "folhaUltimoDesconto": "Marco/2034", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-10 14:24:06.352714-03
9529702	{"adf": "9529702", "iof": 50.6, "nome": "ADRIANA MARQUES DA SILVA", "cetAm": 0.02, "taxaAm": 0.0179, "bancoId": 1, "convenio": "PALHOCA / DELTA GLOBAL", "situacao": "Cancelado", "cpfMasked": "***.***.***-33", "expiracao": "18/07/2026", "matricula": "852029100", "convenioId": "CONV-001", "lancamento": "16/07/2026", "servidorId": 29100, "tipoMargem": "EMPRESTIMO", "codigoVerba": "1547 - DELTA GLOBAL I", "criadoEmIso": "2026-07-16T12:27:52.125Z", "idMatricula": "MAT-852029100", "observacoes": "Solicitacao via app do servidor (SCred Financeira)", "dataContrato": "16/07/2026", "diasCarencia": 30, "expiracaoIso": "2026-07-18T12:27:52.125Z", "saldoDevedor": 1500, "tipoContrato": "EMPRESTIMO", "valorLiquido": 1449.41, "valorParcela": 56.88, "parcelasPagas": 0, "totalParcelas": 36, "valorFinanciado": 1500, "folhaUltimoDesconto": "Marco/2029", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-16 09:46:58.720176-03
9698695	{"adf": "9698695", "iof": 769.04, "nome": "Alvaro Ramos", "cetAm": 0.02, "taxaAm": 0.0179, "bancoId": 1, "convenio": "PALHOCA / DELTA GLOBAL", "situacao": "Cancelado", "cpfMasked": "237.***.***-87", "expiracao": "12/07/2026", "matricula": "M-2200", "convenioId": "CONV-001", "lancamento": "10/07/2026", "servidorId": 2200, "codigoVerba": "1547 - DELTA GLOBAL I", "idMatricula": "MAT-M-2200", "observacoes": "Solicitacao via app do servidor (SCred Financeira)", "dataContrato": "10/07/2026", "diasCarencia": 30, "saldoDevedor": 22800, "tipoContrato": "EMPRESTIMO", "valorLiquido": 22030.96, "valorParcela": 864.62, "parcelasPagas": 0, "totalParcelas": 36, "valorFinanciado": 22800, "folhaUltimoDesconto": "Marco/2029", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-10 14:24:13.189611-03
9264923	{"adf": "9264923", "iof": 414.88, "nome": "SUZANA DALLARMI", "cetAm": 0.0196, "taxaAm": 0.0179, "bancoId": 1, "convenio": "JOINVILLE / DELTA GLOBAL", "situacao": "Cancelado", "cpfMasked": "***.***.***-35", "expiracao": "12/07/2026", "matricula": "56571701", "convenioId": "CONV-003", "lancamento": "10/07/2026", "servidorId": 71701, "codigoVerba": "2310 - DELTA GLOBAL III", "idMatricula": "MAT-56571701", "observacoes": "Solicitacao via app do servidor (SCred Financeira)", "dataContrato": "10/07/2026", "diasCarencia": 30, "saldoDevedor": 12300, "tipoContrato": "EMPRESTIMO", "valorLiquido": 11885.12, "valorParcela": 384.06, "parcelasPagas": 0, "totalParcelas": 48, "valorFinanciado": 12300, "folhaUltimoDesconto": "Marco/2030", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-10 14:24:24.929877-03
9139486	{"adf": "9139486", "iof": 0, "nome": "ADRIANA MARQUES DA SILVA", "cetAm": 0, "taxaAm": 0, "bancoId": 1, "convenio": "FLORIPA / DELTA GLOBAL", "situacao": "Aguardando Confirmação do Deferimento", "cpfMasked": "***.***.***-33", "expiracao": "12/07/2026", "matricula": "764521800", "convenioId": "CONV-002", "lancamento": "10/07/2026", "servidorId": 9001, "codigoVerba": "2210 - DELTA GLOBAL II", "idMatricula": "MAT-764521800", "observacoes": "Solicitacao de Cartao Consignado via app do servidor (Banco Atlas)", "dataContrato": "10/07/2026", "diasCarencia": 30, "saldoDevedor": 5000, "tipoContrato": "ECONSIGNADO", "valorLiquido": 5000, "valorParcela": 199, "parcelasPagas": 0, "totalParcelas": 12, "valorFinanciado": 5000, "folhaUltimoDesconto": "Marco/2027", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-10 16:54:29.296633-03
9782200	{"adf": "9782200", "iof": 455.36, "nome": "ADRIANA MARQUES DA SILVA", "cetAm": 0.02, "taxaAm": 0.0179, "bancoId": 1, "convenio": "FLORIPA / DELTA GLOBAL", "situacao": "Aguardando Confirmação do Deferimento", "cpfMasked": "***.***.***-33", "expiracao": "12/07/2026", "matricula": "764521800", "convenioId": "CONV-002", "lancamento": "10/07/2026", "servidorId": 9001, "tipoMargem": "EMPRESTIMO", "codigoVerba": "2210 - DELTA GLOBAL II", "idMatricula": "MAT-764521800", "observacoes": "Solicitacao via app do servidor (SCred Financeira)", "dataContrato": "10/07/2026", "diasCarencia": 30, "saldoDevedor": 13500, "tipoContrato": "EMPRESTIMO", "valorLiquido": 13044.65, "valorParcela": 511.95, "parcelasPagas": 0, "totalParcelas": 36, "valorFinanciado": 13500, "folhaUltimoDesconto": "Marco/2029", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-10 17:10:33.293712-03
9795128	{"adf": "9795128", "iof": 30.36, "nome": "ADRIANA MARQUES DA SILVA", "cetAm": 0.02, "ccbKey": "ccb/1/9795128/2026-07-15T14-09-26-843Z-Fluxo.pdf", "taxaAm": 0.0179, "bancoId": 1, "convenio": "PALHOCA / DELTA GLOBAL", "situacao": "Ativo", "cpfMasked": "***.***.***-33", "expiracao": null, "matricula": "852029100", "convenioId": "CONV-001", "lancamento": "15/07/2026", "servidorId": 29100, "tipoMargem": "EMPRESTIMO", "codigoVerba": "1547 - DELTA GLOBAL I", "criadoEmIso": "2026-07-15T14:03:13.665Z", "folhaStatus": "aplicada", "idMatricula": "MAT-852029100", "observacoes": "Solicitacao via app do servidor (SCred Financeira)", "ccbAnexadoEm": "2026-07-15T14:09:28.069Z", "dataContrato": "15/07/2026", "diasCarencia": 30, "expiracaoIso": "2026-07-17T14:03:13.665Z", "saldoDevedor": 900, "tipoContrato": "EMPRESTIMO", "valorLiquido": 869.64, "valorParcela": 34.13, "parcelasPagas": 0, "totalParcelas": 36, "valorFinanciado": 900, "folhaUltimoDesconto": "Marco/2029", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-15 11:11:59.465602-03
9075173	{"adf": "9075173", "iof": 0, "nome": "ADRIANA MARQUES DA SILVA", "cetAm": 0, "ccbKey": "ccb/1/9075173/2026-07-15T14-09-41-714Z-Fluxo.pdf", "taxaAm": 0, "bancoId": 1, "convenio": "PALHOCA / DELTA GLOBAL", "situacao": "Ativo", "cpfMasked": "***.***.***-33", "expiracao": null, "matricula": "852029100", "convenioId": "CONV-001", "lancamento": "15/07/2026", "servidorId": 29100, "tipoMargem": "CARTAO_CONSIGNADO", "codigoVerba": "1547 - DELTA GLOBAL I", "criadoEmIso": "2026-07-15T14:03:25.307Z", "folhaStatus": "aplicada", "idMatricula": "MAT-852029100", "observacoes": "Solicitacao de Cartao Consignado via app do servidor (Banco Atlas)", "ccbAnexadoEm": "2026-07-15T14:09:42.564Z", "dataContrato": "15/07/2026", "diasCarencia": 30, "expiracaoIso": "2026-07-17T14:03:25.307Z", "saldoDevedor": 6900, "tipoContrato": "ECONSIGNADO", "valorLiquido": 6900, "valorParcela": 231, "parcelasPagas": 0, "totalParcelas": 12, "valorFinanciado": 6900, "folhaUltimoDesconto": "Marco/2027", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-15 11:11:59.918827-03
9806495	{"adf": "9806495", "iof": 0, "nome": "ADRIANA MARQUES DA SILVA", "cetAm": 0, "ccbKey": "ccb/1/9806495/2026-07-15T14-09-59-740Z-Fluxo.pdf", "taxaAm": 0, "bancoId": 1, "convenio": "PALHOCA / DELTA GLOBAL", "situacao": "Ativo", "cpfMasked": "***.***.***-33", "expiracao": null, "matricula": "852029100", "convenioId": "CONV-001", "lancamento": "15/07/2026", "servidorId": 29100, "tipoMargem": "CARTAO_BENEFICIOS", "codigoVerba": "1547 - DELTA GLOBAL I", "criadoEmIso": "2026-07-15T14:03:32.222Z", "folhaStatus": "aplicada", "idMatricula": "MAT-852029100", "observacoes": "Solicitacao de Cartao Beneficio via app do servidor (Banco Atlas)", "ccbAnexadoEm": "2026-07-15T14:10:00.558Z", "dataContrato": "15/07/2026", "diasCarencia": 30, "expiracaoIso": "2026-07-17T14:03:32.222Z", "saldoDevedor": 6900, "tipoContrato": "ECONSIGNADO", "valorLiquido": 6900, "valorParcela": 231, "parcelasPagas": 0, "totalParcelas": 12, "valorFinanciado": 6900, "folhaUltimoDesconto": "Marco/2027", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-15 11:12:00.372625-03
9417340	{"adf": "9417340", "iof": 269.84, "nome": "DIEGO PEREZ FERREIRA", "cetAm": 0.0171, "taxaAm": 0.0155, "bancoId": 1, "convenio": "PALHOCA / DELTA GLOBAL", "situacao": "Aguardando Confirmação do Deferimento", "cpfMasked": "***.***.***-00", "expiracao": "18/07/2026", "matricula": "993410027", "convenioId": "CONV-001", "lancamento": "16/07/2026", "servidorId": 10027, "tipoMargem": "EMPRESTIMO", "codigoVerba": "1547 - DELTA GLOBAL I", "criadoEmIso": "2026-07-16T17:54:57.317Z", "idMatricula": "MAT-993410027", "observacoes": "Solicitacao via app do servidor (Banco Atlas)", "dataContrato": "16/07/2026", "diasCarencia": 30, "expiracaoIso": "2026-07-18T17:54:57.317Z", "saldoDevedor": 8000, "tipoContrato": "EMPRESTIMO", "valorLiquido": 7730.16, "valorParcela": 237.52, "parcelasPagas": 0, "totalParcelas": 48, "valorFinanciado": 8000, "folhaUltimoDesconto": "Marco/2030", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-16 14:54:57.471577-03
9178485	{"adf": "9178485", "iof": 74.21, "nome": "ADRIANA MARQUES DA SILVA", "cetAm": 0.02, "ccbKey": "ccb/1/9178485/2026-07-15T16-30-35-123Z-Fluxo.pdf", "taxaAm": 0.0179, "bancoId": 1, "convenio": "PALHOCA / DELTA GLOBAL", "situacao": "Ativo", "cpfMasked": "***.***.***-33", "expiracao": null, "matricula": "852029100", "convenioId": "CONV-001", "lancamento": "15/07/2026", "servidorId": 29100, "tipoMargem": "EMPRESTIMO", "codigoVerba": "1547 - DELTA GLOBAL I", "criadoEmIso": "2026-07-15T16:30:03.118Z", "folhaStatus": "aplicada", "idMatricula": "MAT-852029100", "observacoes": "Solicitacao via app do servidor (SCred Financeira)", "ccbAnexadoEm": "2026-07-15T16:30:35.982Z", "dataContrato": "15/07/2026", "diasCarencia": 30, "expiracaoIso": "2026-07-17T16:30:03.118Z", "saldoDevedor": 2200, "tipoContrato": "EMPRESTIMO", "valorLiquido": 2125.79, "valorParcela": 83.43, "parcelasPagas": 0, "totalParcelas": 36, "valorFinanciado": 2200, "folhaUltimoDesconto": "Marco/2029", "folhaPrimeiroDesconto": "Abril/2026"}	2026-07-15 13:31:03.543327-03
\.


--
-- Data for Name: portal_banco_tabelas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portal_banco_tabelas (id, data, updated_at) FROM stdin;
TBL-002	{"id": "TBL-002", "ativo": true, "convenio": "FLORIPA / DELTA GLOBAL", "criadoEm": "2026-04-01", "taxaMaxAm": 0.021, "taxaMinAm": 0.0171, "convenioId": "CONV-002", "prazoMaxMeses": 96, "vigenciaInicio": "2026-04-01"}	2026-07-02 12:13:57.969737-03
TBL-101	{"id": "TBL-101", "ativo": true, "convenio": "CASTRO / DELTA GLOBAL", "criadoEm": "2026-07-02", "taxaMaxAm": 0.0201, "taxaMinAm": 0.015, "convenioId": "CONV-001", "prazoMaxMeses": 120, "vigenciaInicio": "2026-07-02"}	2026-07-03 09:09:23.48704-03
TBL-102	{"id": "TBL-102", "ativo": false, "convenio": "PALHOCA / DELTA GLOBAL", "criadoEm": "2026-07-13", "taxaMaxAm": 0.02, "taxaMinAm": 0.015, "convenioId": "CONV-001", "prazoMaxMeses": 96, "vigenciaInicio": "2026-07-13"}	2026-07-13 12:02:50.980911-03
TBL-001	{"id": "TBL-001", "ativo": true, "convenio": "PALHOCA / DELTA GLOBAL", "criadoEm": "2026-03-18", "taxaMaxAm": 0.0199, "taxaMinAm": 0.0155, "convenioId": "CONV-001", "prazoMaxMeses": 72, "vigenciaInicio": "2026-03-18"}	2026-07-13 12:13:02.205736-03
\.


--
-- Data for Name: pre_reservas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pre_reservas (id, id_unico, banco_id, prefeitura_id, convenio_id, servidor_id, matricula, tipo_operacao, valor_margem, valor_parcela, parcelas, taxa_am, status, criado_em, expira_em, finalizado_em, finalizado_por, motivo_finalizacao) FROM stdin;
PRR-MR5ADN8R-N1DI	FLO-722440	1	2	\N	2	764521800	EMPRESTIMO	1100.00	102.68	12	0.017900	ativa	2026-07-03 15:48:17.017221-03	2026-07-05 15:48:17.017221-03	\N	\N	\N
\.


--
-- Data for Name: prefeituras; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prefeituras (id, nome, uf, municipio_ibge, modo_integracao, status, ultima_sincronizacao, created_at, config) FROM stdin;
2	Florianopolis	SC	4205407	SOAP	ativo	2026-07-07 12:53:20.424-03	2026-07-02 16:47:04.71841-03	{"exigeCcb": false, "loginEmail": "prefeitura@florianopolis.com", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "exigeBanco2FA": false, "servidoresCount": 1100}
1	Palhoca	SC	4211900	CSV	ativo	2026-07-07 12:54:04.317-03	2026-07-02 16:47:04.191353-03	{"exigeCcb": false, "loginEmail": "prefeitura@palhoca.com", "contatoEmail": "anthonysantosmachado159@gmail.com", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "exigeBanco2FA": false, "servidoresCount": 0}
3	Joinville	SC	4209102	CSV	ativo	2026-07-07 12:53:31.451-03	2026-07-02 16:47:05.227857-03	{"exigeCcb": false, "loginEmail": "prefeitura@joinville.com", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "exigeBanco2FA": false, "servidoresCount": 480}
4	Test	SC	8	REST	inativo	\N	2026-07-06 15:40:51.619932-03	{"exigeCcb": false, "loginEmail": "test@gmail.com", "contatoEmail": "admin@atlas.test", "passwordHash": "c233f60c1fd195b8b3aaabaa478ab7ece548ade89b615668abf998533b8a21ec", "exigeBanco2FA": false, "servidoresCount": 1}
6	Capistrano	CE	2302909	CSV	ativo	\N	2026-07-16 15:06:22.079655-03	{"exigeCcb": false, "loginEmail": "capistrano@prefeitura.com.br", "contatoEmail": "admin@atlas.test", "passwordHash": "7da852ae47737c9c8ed2d7f89f2b8cc113d586da226ef31a2642d213ea2db707", "exigeBanco2FA": false, "servidoresCount": 0}
5	Teste321	SC	0	REST	inativo	\N	2026-07-06 15:45:18.454554-03	{"exigeCcb": false, "loginEmail": "test321@gmail.com", "contatoEmail": "test321@gmail.com", "passwordHash": "51892cda53d22f86a5fb17dd08e26852bd70e7f24ca272c4b791e3d0f9fd064f", "exigeBanco2FA": false, "servidoresCount": 0}
\.


--
-- Data for Name: proposta_eventos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proposta_eventos (id, proposta_id, evento, de_estado, para_estado, direcao, ator, payload_hash, idempotency_key, status_http, duracao_ms, trace_id, criado_em) FROM stdin;
\.


--
-- Data for Name: propostas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.propostas (id, servidor_id, banco_id, valor, parcelas, taxa_am, cet_am, status, adf, criada_em, atualizada_em, convenio_id, prefeitura_id) FROM stdin;
PR-MR5ADMUF-S88D	2	1	1100.00	12	0.017900	0.018258	recebida	\N	2026-07-03 15:48:16.502752-03	2026-07-03 15:48:16.502752-03	\N	\N
\.


--
-- Data for Name: servidores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.servidores (id, prefeitura_id, nome, cpf, matricula, vinculo, situacao_funcional, status, data_nascimento, salario_base, created_at, data) FROM stdin;
3	2	FERNANDA KELLI TOMAZONI	00011122234	843796302	ESTATUTARIO	ATIVO	ativo	1990-07-22 00:00:00	5320.00	2026-07-02 16:47:08.024815-03	{"cpf": "00011122234", "nome": "FERNANDA KELLI TOMAZONI", "cargo": "Enfermeira", "email": "fernanda.tomazoni@floripa.sc.gov.br", "origem": "PREFEITURA DE FLORIANOPOLIS", "vinculo": "ESTATUTARIO", "endereco": "Av. Beira Mar Norte, 1500 - Centro, Florianopolis/SC", "telefone": "48991022234", "cpfMasked": "***.***.***-34", "matricula": "843796302", "codigoIbge": 4205407, "idConvenio": "CONV-002", "idMatricula": "MAT-843796302", "dataAdmissao": "10/01/2019", "dataNascimento": "1990-07-22", "salarioLiquido": 5320, "situacaoFuncional": "TRABALHANDO"}
6	3	MARIANA COSTA LIMA	12345678909	778102055	ESTATUTARIO	ATIVO	ativo	1990-05-20 00:00:00	8500.00	2026-07-02 16:47:09.566526-03	{"rg": "33.112.845-2", "cpf": "12345678909", "nome": "MARIANA COSTA LIMA", "cargo": "Analista de Sistemas", "email": "mariana.lima@joinville.sc.gov.br", "origem": "PREFEITURA DE JOINVILLE", "vinculo": "ESTATUTARIO", "endereco": "Rua XV de Novembro, 480 - Centro, Joinville/SC", "telefone": "47992018745", "cpfMasked": "***.***.***-09", "matricula": "778102055", "codigoIbge": 4209102, "idConvenio": "CONV-003", "idMatricula": "MAT-778102055", "dataAdmissao": "10/02/2018", "dataNascimento": "1990-05-20", "salarioLiquido": 8500, "situacaoFuncional": "TRABALHANDO"}
9	1	TESTE DEBUG	11122233344	DBG-001	ESTATUTARIO	ATIVO	ativo	\N	3000.00	2026-07-06 11:37:37.494974-03	{"cpf": "11122233344", "nome": "TESTE DEBUG", "origem": "Palhoca", "vinculo": "ESTATUTARIO", "cpfMasked": "111.***.***-44", "matricula": "DBG-001", "idConvenio": "CONV-001", "idMatricula": "MAT-DBG-001", "dataAdmissao": "", "prefeituraId": 1, "dataNascimento": "", "salarioLiquido": 3000, "situacaoFuncional": "TRABALHANDO"}
10	1	SERVIDOR TESTE DIAGNOSTICO	99988877700	DIAGTESTE001	ESTATUTARIO	ATIVO	ativo	1990-01-01 00:00:00	3000.00	2026-07-06 14:24:58.229476-03	{"cpf": "99988877700", "nome": "SERVIDOR TESTE DIAGNOSTICO", "origem": "Palhoca", "vinculo": "ESTATUTARIO", "cpfMasked": "999.***.***-00", "matricula": "DIAGTESTE001", "idConvenio": "CONV-001", "idMatricula": "MAT-DIAGTESTE001", "dataAdmissao": "", "prefeituraId": 1, "dataNascimento": "1990-01-01", "salarioLiquido": 3000, "situacaoFuncional": "TRABALHANDO"}
12	1	SERVIDOR PREF DIAG	99988877701	PREFDIAG001	ESTATUTARIO	ATIVO	ativo	1988-05-05 00:00:00	3500.00	2026-07-06 14:40:15.413704-03	{"cpf": "99988877701", "nome": "SERVIDOR PREF DIAG", "cargo": "Analista", "origem": "Palhoca", "vinculo": "ESTATUTARIO", "cpfMasked": "999.***.***-01", "matricula": "PREFDIAG001", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-PREFDIAG001", "dataAdmissao": "", "prefeituraId": 1, "dataNascimento": "1988-05-05", "salarioLiquido": 3500, "situacaoFuncional": "TRABALHANDO"}
15	1	Joao da Silva Neves	00011122244	M-9002	CLT	ATIVO	ativo	1976-08-22 00:00:00	5840.00	2026-07-07 10:57:04.254725-03	{"cpf": "00011122244", "nome": "Joao da Silva Neves", "cargo": "Motorista", "email": "joao.neves@floripa.sc.gov.br", "origem": "Palhoca", "vinculo": "CLT", "endereco": "Rua Central, 45 - Ingleses, Florianopolis/SC", "telefone": "48991020002", "cpfMasked": "000.***.***-44", "matricula": "M-9002", "codigoIbge": 4205407, "idConvenio": "CONV-001", "idMatricula": "MAT-M-9002", "dataAdmissao": "02/02/2010", "prefeituraId": 1, "dataNascimento": "1976-08-22", "salarioLiquido": 5840, "situacaoFuncional": "TRABALHANDO"}
283	2	GRACE ANNE FELICIO CRISPIM	88293866349	61991	ESTATUTARIO	ATIVO	ativo	1981-11-01 00:00:00	0.00	2026-07-16 14:21:46.430432-03	{"cpf": "88293866349", "nome": "GRACE ANNE FELICIO CRISPIM", "cargo": "ORIENTADOR SOCIAL", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "882.***.***-49", "matricula": "61991", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61991", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "11/01/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
2	2	ADRIANA MARQUES DA SILVA	00011122233	764521800	ESTATUTARIO	ATIVO	ativo	1985-03-12 00:00:00	3980.00	2026-07-02 16:47:07.281527-03	{"cpf": "00011122233", "nome": "ADRIANA MARQUES DA SILVA", "cargo": "Auxiliar Administrativa", "origem": "PREFEITURA DE FLORIANOPOLIS", "vinculo": "ESTATUTARIO", "endereco": "Rua das Palmeiras, 320 - Centro, Palhoca/SC", "cpfMasked": "***.***.***-33", "matricula": "764521800", "codigoIbge": 4205407, "idConvenio": "CONV-002", "idMatricula": "MAT-764521800", "dataAdmissao": "05/09/2020", "dataNascimento": "1985-03-12", "salarioLiquido": 3980, "situacaoFuncional": "TRABALHANDO"}
4	3	SUZANA DALLARMI	00011122235	56571701	ESTATUTARIO	ATIVO	ativo	1988-11-30 00:00:00	3820.00	2026-07-02 16:47:08.555406-03	{"cpf": "00011122235", "nome": "SUZANA DALLARMI", "cargo": "Auxiliar Administrativo", "email": "testesemail159@gmail.com", "origem": "PREFEITURA DE JOINVILLE", "vinculo": "ESTATUTARIO", "endereco": "Rua XV de Novembro, 88 - Centro, Joinville/SC", "telefone": "47991032235", "cpfMasked": "***.***.***-35", "matricula": "56571701", "codigoIbge": 4209102, "idConvenio": "CONV-003", "idMatricula": "MAT-56571701", "dataAdmissao": "05/03/2015", "passwordHash": "289160db0d9f39f9ae1754c4ec9c16f90b50e32e09c5fb5481ae642b3d3d1a36", "dataNascimento": "1988-11-30", "salarioLiquido": 3820, "situacaoFuncional": "TRABALHANDO"}
5	1	DIEGO PEREZ FERREIRA	37534239800	993410027	ESTATUTARIO	ATIVO	ativo	1987-02-07 00:00:00	12000.00	2026-07-02 16:47:09.064365-03	{"rg": "40.837.175-4", "cpf": "37534239800", "nome": "DIEGO PEREZ FERREIRA", "cargo": "Programador", "email": "diego@marketingcentral.com.br", "origem": "PREFEITURA DE PALHOCA", "vinculo": "ESTATUTARIO", "endereco": "Rua dos Programadores, 100 - Centro, Palhoca/SC", "telefone": "48991073451", "cpfMasked": "***.***.***-00", "matricula": "993410027", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-993410027", "dataAdmissao": "01/03/2015", "passwordHash": "7da852ae47737c9c8ed2d7f89f2b8cc113d586da226ef31a2642d213ea2db707", "dataNascimento": "1987-02-07", "salarioLiquido": 12000, "situacaoFuncional": "TRABALHANDO"}
289	2	ISAAC LIMA EVANGELISTA	75059746372	1216090	ESTATUTARIO	ATIVO	ativo	1976-08-10 00:00:00	0.00	2026-07-16 14:21:57.176116-03	{"cpf": "75059746372", "nome": "ISAAC LIMA EVANGELISTA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "750.***.***-72", "matricula": "1216090", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1216090", "dataAdmissao": "20/01/2014", "prefeituraId": 2, "dataNascimento": "08/10/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
301	2	JARMENSON RODRIGUES SARAIVA	11232057363	62678	ESTATUTARIO	ATIVO	ativo	2007-05-08 00:00:00	700.00	2026-07-16 14:22:08.371511-03	{"cpf": "11232057363", "nome": "JARMENSON RODRIGUES SARAIVA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "112.***.***-63", "matricula": "62678", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62678", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "05/08/2007", "salarioLiquido": 700, "situacaoFuncional": ""}
276	2	GABRIEL NICOLLAS DE AGUIAR FERREIRA	11253850305	62327	ESTATUTARIO	ATIVO	ativo	2005-09-07 00:00:00	0.00	2026-07-16 14:21:33.577554-03	{"cpf": "11253850305", "nome": "GABRIEL NICOLLAS DE AGUIAR FERREIRA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "112.***.***-05", "matricula": "62327", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62327", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "09/07/2005", "salarioLiquido": 0, "situacaoFuncional": ""}
284	2	GRASIELLY SANTIAGO ARAUJO	60861654323	62699	ESTATUTARIO	ATIVO	ativo	2000-11-12 00:00:00	0.00	2026-07-16 14:21:46.857375-03	{"cpf": "60861654323", "nome": "GRASIELLY SANTIAGO ARAUJO", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-23", "matricula": "62699", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62699", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "11/12/2000", "salarioLiquido": 0, "situacaoFuncional": ""}
16	1	Alvaro Ramos	23701234787	M-2200	ESTATUTARIO	ATIVO	ativo	1985-03-12 00:00:00	4620.50	2026-07-07 10:59:06.74652-03	{"cpf": "23701234787", "nome": "Alvaro Ramos", "cargo": "engenheiro", "email": "testesemail159@gmail.com", "origem": "Palhoca", "vinculo": "ESTATUTARIO", "endereco": "Rua das Palmeiras, 320 - Centro, Palhoca/SC", "telefone": "48991010001", "cpfMasked": "237.***.***-87", "matricula": "M-2200", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-M-2200", "dataAdmissao": "17/04/2017", "passwordHash": "cc8b643b2595ddaa70784e69da542967f27c97b84894b704f669a07a3bc52d19", "prefeituraId": 1, "dataNascimento": "1985-03-12", "salarioLiquido": 4620.5, "situacaoFuncional": "TRABALHANDO"}
18	1	CARLOS EDUARDO SOUZA	01844730808	700100001	ESTATUTARIO	ATIVO	ativo	1988-03-12 00:00:00	3200.00	2026-07-08 10:04:11.314888-03	{"rg": "30000000-0", "cpf": "01844730808", "nome": "CARLOS EDUARDO SOUZA", "cargo": "Auxiliar Administrativo", "origem": "PREFEITURA DE PALHOCA", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 100 - Palhoca/SC", "cpfMasked": "***.***.***-08", "matricula": "700100001", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-700100001", "dataAdmissao": "12/03/2016", "prefeituraId": 1, "dataNascimento": "1988-03-12", "salarioLiquido": 3200, "situacaoFuncional": "ATIVO"}
19	2	MARIA APARECIDA LIMA	93025100850	700100002	ESTATUTARIO	ATIVO	ativo	1985-07-25 00:00:00	4800.00	2026-07-08 10:04:11.839959-03	{"rg": "30111111-1", "cpf": "93025100850", "nome": "MARIA APARECIDA LIMA", "cargo": "Professora", "origem": "PREFEITURA DE FLORIANOPOLIS", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 101 - Florianopolis/SC", "cpfMasked": "***.***.***-50", "matricula": "700100002", "codigoIbge": 4205407, "idConvenio": "CONV-002", "idMatricula": "MAT-700100002", "dataAdmissao": "01/02/2012", "prefeituraId": 2, "dataNascimento": "1985-07-25", "salarioLiquido": 4800, "situacaoFuncional": "ATIVO"}
331	2	JOSE FERREIRA BATISTA	23566728349	802425	ESTATUTARIO	ATIVO	ativo	1962-08-05 00:00:00	0.00	2026-07-16 14:22:48.74473-03	{"cpf": "23566728349", "nome": "JOSE FERREIRA BATISTA", "cargo": "ELETRICISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "235.***.***-49", "matricula": "802425", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802425", "dataAdmissao": "02/05/1983", "prefeituraId": 2, "dataNascimento": "08/05/1962", "salarioLiquido": 0, "situacaoFuncional": ""}
348	2	JOSE WILSON GOMES PEREIRA FILHO	60863094341	62063	ESTATUTARIO	ATIVO	ativo	1998-12-03 00:00:00	0.00	2026-07-16 14:23:08.322675-03	{"cpf": "60863094341", "nome": "JOSE WILSON GOMES PEREIRA FILHO", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-41", "matricula": "62063", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62063", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "12/03/1998", "salarioLiquido": 0, "situacaoFuncional": ""}
352	2	JULIANA COSTA SILVA	85981522500	62896	ESTATUTARIO	ATIVO	ativo	1998-05-01 00:00:00	0.00	2026-07-16 14:23:13.513757-03	{"cpf": "85981522500", "nome": "JULIANA COSTA SILVA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "859.***.***-00", "matricula": "62896", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62896", "dataAdmissao": "01/04/2026", "prefeituraId": 2, "dataNascimento": "05/01/1998", "salarioLiquido": 0, "situacaoFuncional": ""}
354	2	JULIANA JERONIMO DE FREITAS	59313757320	62200	ESTATUTARIO	ATIVO	ativo	1974-07-11 00:00:00	0.00	2026-07-16 14:23:14.33074-03	{"cpf": "59313757320", "nome": "JULIANA JERONIMO DE FREITAS", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "593.***.***-20", "matricula": "62200", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62200", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/11/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
365	2	KARYNE DE LIMA DE AGUIAR	11902287347	62637	ESTATUTARIO	ATIVO	ativo	2005-03-11 00:00:00	0.00	2026-07-16 14:23:21.591845-03	{"cpf": "11902287347", "nome": "KARYNE DE LIMA DE AGUIAR", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "119.***.***-47", "matricula": "62637", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62637", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "03/11/2005", "salarioLiquido": 0, "situacaoFuncional": ""}
390	2	LUCIANA DE SOUSA LIMA	90199995320	61289	ESTATUTARIO	ATIVO	ativo	1980-10-11 00:00:00	400.00	2026-07-16 14:23:52.355371-03	{"cpf": "90199995320", "nome": "LUCIANA DE SOUSA LIMA", "cargo": "DIR ADMINISTRATIVO FINANCEIRO (DAS-6)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-20", "matricula": "61289", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61289", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "10/11/1980", "salarioLiquido": 400, "situacaoFuncional": ""}
396	2	LUIS FERNANDES DE OLIVEIRA JUNIOR	44211813315	802050	ESTATUTARIO	ATIVO	ativo	1972-11-08 00:00:00	0.00	2026-07-16 14:24:04.832455-03	{"cpf": "44211813315", "nome": "LUIS FERNANDES DE OLIVEIRA JUNIOR", "cargo": "ATENDENTE", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-15", "matricula": "802050", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802050", "dataAdmissao": "06/03/1991", "prefeituraId": 2, "dataNascimento": "11/08/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
405	2	MAGNO WYLAMY ESTEVAM DO NASCIMENTO	97065200310	1229613	ESTATUTARIO	ATIVO	ativo	1983-11-04 00:00:00	0.00	2026-07-16 14:24:15.072056-03	{"cpf": "97065200310", "nome": "MAGNO WYLAMY ESTEVAM DO NASCIMENTO", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "970.***.***-10", "matricula": "1229613", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1229613", "dataAdmissao": "19/12/2016", "prefeituraId": 2, "dataNascimento": "11/04/1983", "salarioLiquido": 0, "situacaoFuncional": ""}
277	2	GEMONIA DA SILVA VIEIRA	60360714340	1213768	ESTATUTARIO	ATIVO	ativo	1991-03-03 00:00:00	0.00	2026-07-16 14:21:36.435039-03	{"cpf": "60360714340", "nome": "GEMONIA DA SILVA VIEIRA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "603.***.***-40", "matricula": "1213768", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213768", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "03/03/1991", "salarioLiquido": 0, "situacaoFuncional": ""}
282	2	GONCALO FERREIRA DE OLIVEIRA	23579358391	62854	ESTATUTARIO	ATIVO	ativo	1963-10-01 00:00:00	80.00	2026-07-16 14:21:45.993129-03	{"cpf": "23579358391", "nome": "GONCALO FERREIRA DE OLIVEIRA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "235.***.***-91", "matricula": "62854", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62854", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "10/01/1963", "salarioLiquido": 80, "situacaoFuncional": ""}
286	2	INES NASCIMENTO DE OLIVEIRA	86597183304	804207	ESTATUTARIO	ATIVO	ativo	1974-01-09 00:00:00	0.00	2026-07-16 14:21:53.718157-03	{"cpf": "86597183304", "nome": "INES NASCIMENTO DE OLIVEIRA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "865.***.***-04", "matricula": "804207", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804207", "dataAdmissao": "03/08/1998", "prefeituraId": 2, "dataNascimento": "01/09/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
20	3	JOAO PEDRO ALVES	40800297806	700100003	ESTATUTARIO	ATIVO	ativo	1992-11-03 00:00:00	5600.00	2026-07-08 10:04:12.360575-03	{"rg": "30222222-2", "cpf": "40800297806", "nome": "JOAO PEDRO ALVES", "cargo": "Agente de Saude", "origem": "PREFEITURA DE JOINVILLE", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 102 - Joinville/SC", "cpfMasked": "***.***.***-06", "matricula": "700100003", "codigoIbge": 4209102, "idConvenio": "CONV-003", "idMatricula": "MAT-700100003", "dataAdmissao": "15/08/2019", "prefeituraId": 3, "dataNascimento": "1992-11-03", "salarioLiquido": 5600, "situacaoFuncional": "ATIVO"}
22	2	RAFAEL MOREIRA DIAS	88549417866	700100005	ESTATUTARIO	ATIVO	ativo	1987-09-30 00:00:00	6200.00	2026-07-08 10:04:13.41083-03	{"rg": "30444444-4", "cpf": "88549417866", "nome": "RAFAEL MOREIRA DIAS", "cargo": "Motorista", "origem": "PREFEITURA DE FLORIANOPOLIS", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 104 - Florianopolis/SC", "cpfMasked": "***.***.***-66", "matricula": "700100005", "codigoIbge": 4205407, "idConvenio": "CONV-002", "idMatricula": "MAT-700100005", "dataAdmissao": "05/06/2014", "prefeituraId": 2, "dataNascimento": "1987-09-30", "salarioLiquido": 6200, "situacaoFuncional": "ATIVO"}
27	1	CAMILA FERREIRA PINTO	44334721826	700100010	ESTATUTARIO	ATIVO	ativo	1989-08-05 00:00:00	6800.00	2026-07-08 10:04:16.029867-03	{"rg": "30999999-0", "cpf": "44334721826", "nome": "CAMILA FERREIRA PINTO", "cargo": "Contadora", "origem": "PREFEITURA DE PALHOCA", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 109 - Palhoca/SC", "cpfMasked": "***.***.***-26", "matricula": "700100010", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-700100010", "dataAdmissao": "30/10/2015", "prefeituraId": 1, "dataNascimento": "1989-08-05", "salarioLiquido": 6800, "situacaoFuncional": "ATIVO"}
393	2	LUCIENE ALMEIDA DE ANDRADE	54921767300	803820	ESTATUTARIO	ATIVO	ativo	1967-01-07 00:00:00	0.00	2026-07-16 14:23:56.175811-03	{"cpf": "54921767300", "nome": "LUCIENE ALMEIDA DE ANDRADE", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "549.***.***-00", "matricula": "803820", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803820", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "01/07/1967", "salarioLiquido": 0, "situacaoFuncional": ""}
402	2	MADALENA LIMA MORAIS	91164214349	62385	ESTATUTARIO	ATIVO	ativo	1978-09-09 00:00:00	0.00	2026-07-16 14:24:12.050426-03	{"cpf": "91164214349", "nome": "MADALENA LIMA MORAIS", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "911.***.***-49", "matricula": "62385", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62385", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "09/09/1978", "salarioLiquido": 0, "situacaoFuncional": ""}
478	2	MARIA ELIZABETE DA SILVA ALVES	44211406353	803006	ESTATUTARIO	ATIVO	ativo	1971-11-09 00:00:00	0.00	2026-07-16 14:25:33.254317-03	{"cpf": "44211406353", "nome": "MARIA ELIZABETE DA SILVA ALVES", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-53", "matricula": "803006", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803006", "dataAdmissao": "11/12/1990", "prefeituraId": 2, "dataNascimento": "11/09/1971", "salarioLiquido": 0, "situacaoFuncional": ""}
24	1	BRUNO HENRIQUE GOMES	43012777814	700100007	ESTATUTARIO	ATIVO	ativo	1991-02-27 00:00:00	4400.00	2026-07-08 10:04:14.4575-03	{"rg": "30666666-6", "cpf": "43012777814", "nome": "BRUNO HENRIQUE GOMES", "cargo": "Tecnico de TI", "origem": "PREFEITURA DE PALHOCA", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 106 - Palhoca/SC", "cpfMasked": "***.***.***-14", "matricula": "700100007", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-700100007", "dataAdmissao": "02/01/2018", "prefeituraId": 1, "dataNascimento": "1991-02-27", "salarioLiquido": 4400, "situacaoFuncional": "ATIVO"}
25	2	PATRICIA REGINA MELO	76568969885	700100008	ESTATUTARIO	ATIVO	ativo	1986-12-08 00:00:00	5200.00	2026-07-08 10:04:14.982604-03	{"rg": "30777777-7", "cpf": "76568969885", "nome": "PATRICIA REGINA MELO", "cargo": "Assistente Social", "origem": "PREFEITURA DE FLORIANOPOLIS", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 107 - Florianopolis/SC", "cpfMasked": "***.***.***-85", "matricula": "700100008", "codigoIbge": 4205407, "idConvenio": "CONV-002", "idMatricula": "MAT-700100008", "dataAdmissao": "18/07/2011", "prefeituraId": 2, "dataNascimento": "1986-12-08", "salarioLiquido": 5200, "situacaoFuncional": "ATIVO"}
26	3	FELIPE AUGUSTO NUNES	45668163890	700100009	ESTATUTARIO	ATIVO	ativo	1994-06-21 00:00:00	8300.00	2026-07-08 10:04:15.505585-03	{"rg": "30888888-8", "cpf": "45668163890", "nome": "FELIPE AUGUSTO NUNES", "cargo": "Guarda Municipal", "origem": "PREFEITURA DE JOINVILLE", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 108 - Joinville/SC", "cpfMasked": "***.***.***-90", "matricula": "700100009", "codigoIbge": 4209102, "idConvenio": "CONV-003", "idMatricula": "MAT-700100009", "dataAdmissao": "25/03/2021", "prefeituraId": 3, "dataNascimento": "1994-06-21", "salarioLiquido": 8300, "situacaoFuncional": "ATIVO"}
1	1	ADRIANA MARQUES DA SILVA	00011122233	852029100	ESTATUTARIO	ATIVO	ativo	1985-03-12 00:00:00	4620.00	2026-07-02 16:47:06.771245-03	{"cpf": "00011122233", "nome": "ADRIANA MARQUES DA SILVA", "cargo": "Professora II", "origem": "PREFEITURA DE PALHOCA", "vinculo": "ESTATUTARIO", "endereco": "Rua das Palmeiras, 320 - Centro, Palhoca/SC", "cpfMasked": "***.***.***-33", "matricula": "852029100", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-852029100", "dataAdmissao": "17/04/2017", "dataNascimento": "1985-03-12", "salarioLiquido": 4620, "situacaoFuncional": "TRABALHANDO"}
21	1	ANA BEATRIZ ROCHA	22421560802	700100004	ESTATUTARIO	ATIVO	ativo	1990-01-18 00:00:00	3900.00	2026-07-08 10:04:12.884919-03	{"rg": "30333333-3", "cpf": "22421560802", "nome": "ANA BEATRIZ ROCHA", "cargo": "Fiscal Municipal", "origem": "PREFEITURA DE PALHOCA", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 103 - Palhoca/SC", "cpfMasked": "***.***.***-02", "matricula": "700100004", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-700100004", "dataAdmissao": "20/04/2017", "prefeituraId": 1, "dataNascimento": "1990-01-18", "salarioLiquido": 3900, "situacaoFuncional": "ATIVO"}
279	2	GILMAR RIGONI	29859549168	804827	ESTATUTARIO	ATIVO	ativo	1962-05-11 00:00:00	0.00	2026-07-16 14:21:39.262444-03	{"cpf": "29859549168", "nome": "GILMAR RIGONI", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "298.***.***-68", "matricula": "804827", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804827", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "05/11/1962", "salarioLiquido": 0, "situacaoFuncional": ""}
23	3	JULIANA SANTOS CRUZ	72430314800	700100006	ESTATUTARIO	ATIVO	ativo	1993-05-14 00:00:00	7100.00	2026-07-08 10:04:13.935372-03	{"rg": "30555555-5", "cpf": "72430314800", "nome": "JULIANA SANTOS CRUZ", "cargo": "Enfermeira", "origem": "PREFEITURA DE JOINVILLE", "vinculo": "ESTATUTARIO", "endereco": "Rua Central, 105 - Joinville/SC", "cpfMasked": "***.***.***-00", "matricula": "700100006", "codigoIbge": 4209102, "idConvenio": "CONV-003", "idMatricula": "MAT-700100006", "dataAdmissao": "10/09/2020", "prefeituraId": 3, "dataNascimento": "1993-05-14", "salarioLiquido": 7100, "situacaoFuncional": "ATIVO"}
295	2	ISAQUE DE SOUZA DE ALCANTARA	60862407362	1995391	ESTATUTARIO	ATIVO	ativo	1996-01-03 00:00:00	150.00	2026-07-16 14:22:01.273443-03	{"cpf": "60862407362", "nome": "ISAQUE DE SOUZA DE ALCANTARA", "cargo": "APRENDIZ DE MUSICA/BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-62", "matricula": "1995391", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1995391", "dataAdmissao": "01/02/2023", "prefeituraId": 2, "dataNascimento": "01/03/1996", "salarioLiquido": 150, "situacaoFuncional": ""}
326	2	JOSE DE ASSIS CESAR	27317544353	62841	ESTATUTARIO	ATIVO	ativo	1943-10-05 00:00:00	80.00	2026-07-16 14:22:42.926927-03	{"cpf": "27317544353", "nome": "JOSE DE ASSIS CESAR", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "273.***.***-53", "matricula": "62841", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62841", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "10/05/1943", "salarioLiquido": 80, "situacaoFuncional": ""}
339	2	JOSE OLIVEIRA DA SILVA	82637199334	62777	ESTATUTARIO	ATIVO	ativo	1970-08-11 00:00:00	80.00	2026-07-16 14:22:59.441491-03	{"cpf": "82637199334", "nome": "JOSE OLIVEIRA DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "826.***.***-34", "matricula": "62777", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62777", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "08/11/1970", "salarioLiquido": 80, "situacaoFuncional": ""}
351	2	JUCIANE MARTINS MENDES	60862096340	62707	ESTATUTARIO	ATIVO	ativo	1996-09-10 00:00:00	640.00	2026-07-16 14:23:11.103284-03	{"cpf": "60862096340", "nome": "JUCIANE MARTINS MENDES", "cargo": "MONITOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-40", "matricula": "62707", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62707", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "09/10/1996", "salarioLiquido": 640, "situacaoFuncional": ""}
356	2	JULIO FELIPE DOS REIS	19674718869	62795	ESTATUTARIO	ATIVO	ativo	1976-03-07 00:00:00	80.00	2026-07-16 14:23:16.212571-03	{"cpf": "19674718869", "nome": "JULIO FELIPE DOS REIS", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "196.***.***-69", "matricula": "62795", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62795", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "03/07/1976", "salarioLiquido": 80, "situacaoFuncional": ""}
394	2	LUCIVALDA BARROSO DE FREITAS	90201744368	62774	ESTATUTARIO	ATIVO	ativo	1963-03-12 00:00:00	80.00	2026-07-16 14:24:00.986019-03	{"cpf": "90201744368", "nome": "LUCIVALDA BARROSO DE FREITAS", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-68", "matricula": "62774", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62774", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "03/12/1963", "salarioLiquido": 80, "situacaoFuncional": ""}
14	1	Ana Carolina Silva	00011122233	M-9001	ESTATUTARIO	ATIVO	ativo	1985-03-12 00:00:00	4620.50	2026-07-07 10:57:03.800801-03	{"cpf": "00011122233", "nome": "Ana Carolina Silva", "cargo": "Professora II", "origem": "Palhoca", "vinculo": "ESTATUTARIO", "endereco": "Rua das Palmeiras, 320 - Centro, Palhoca/SC", "cpfMasked": "000.***.***-33", "matricula": "M-9001", "codigoIbge": 4211900, "idConvenio": "CONV-001", "idMatricula": "MAT-M-9001", "dataAdmissao": "17/04/2017", "prefeituraId": 1, "dataNascimento": "1985-03-12", "salarioLiquido": 4620.5, "situacaoFuncional": "TRABALHANDO"}
40	2	ADRIANA ALVES DA SILVA	67121489368	62006	ESTATUTARIO	ATIVO	ativo	1980-07-12 00:00:00	0.00	2026-07-16 14:15:58.722978-03	{"cpf": "67121489368", "nome": "ADRIANA ALVES DA SILVA", "cargo": "ORIENTADOR SOCIAL", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "671.***.***-68", "matricula": "62006", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62006", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "07/12/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
41	2	ADRIANO FEITOSA NATIVIDADE	70965593290	62594	ESTATUTARIO	ATIVO	ativo	2002-07-08 00:00:00	0.00	2026-07-16 14:16:03.152744-03	{"cpf": "70965593290", "nome": "ADRIANO FEITOSA NATIVIDADE", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "709.***.***-90", "matricula": "62594", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62594", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/08/2002", "salarioLiquido": 0, "situacaoFuncional": ""}
42	2	ADRIANO FERREIRA DA SILVA	41724666304	803316	ESTATUTARIO	ATIVO	ativo	1971-10-07 00:00:00	0.00	2026-07-16 14:16:03.58909-03	{"cpf": "41724666304", "nome": "ADRIANO FERREIRA DA SILVA", "cargo": "OPERADOR DE COMPUTADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "417.***.***-04", "matricula": "803316", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803316", "dataAdmissao": "08/06/2000", "prefeituraId": 2, "dataNascimento": "10/07/1971", "salarioLiquido": 0, "situacaoFuncional": ""}
43	2	ADRIANO LAURENTINO DE OLIVEIRA	90080408320	62025	ESTATUTARIO	ATIVO	ativo	1982-12-05 00:00:00	0.00	2026-07-16 14:16:04.307018-03	{"cpf": "90080408320", "nome": "ADRIANO LAURENTINO DE OLIVEIRA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-20", "matricula": "62025", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62025", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "12/05/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
44	2	AGOSTINHO DO NASCIMENTO LIMA	77965817349	1213601	ESTATUTARIO	ATIVO	ativo	1978-04-08 00:00:00	0.00	2026-07-16 14:16:05.186112-03	{"cpf": "77965817349", "nome": "AGOSTINHO DO NASCIMENTO LIMA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "779.***.***-49", "matricula": "1213601", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213601", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "04/08/1978", "salarioLiquido": 0, "situacaoFuncional": ""}
46	2	ALEXANDRE CALIXTO LUCK	90082265372	804070	ESTATUTARIO	ATIVO	ativo	1979-03-12 00:00:00	0.00	2026-07-16 14:16:08.682105-03	{"cpf": "90082265372", "nome": "ALEXANDRE CALIXTO LUCK", "cargo": "LAVADEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-72", "matricula": "804070", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804070", "dataAdmissao": "01/06/2008", "prefeituraId": 2, "dataNascimento": "03/12/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
47	2	ALEXANDRE LIMA DE SOUZA	86449060387	806528	ESTATUTARIO	ATIVO	ativo	1980-07-09 00:00:00	0.00	2026-07-16 14:16:09.941705-03	{"cpf": "86449060387", "nome": "ALEXANDRE LIMA DE SOUZA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "864.***.***-87", "matricula": "806528", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806528", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "07/09/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
48	2	ALEXSANDRA DE MENEZES SALES	90082524300	62643	ESTATUTARIO	ATIVO	ativo	1982-02-02 00:00:00	700.00	2026-07-16 14:16:10.771946-03	{"cpf": "90082524300", "nome": "ALEXSANDRA DE MENEZES SALES", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-00", "matricula": "62643", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62643", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "02/02/1982", "salarioLiquido": 700, "situacaoFuncional": ""}
49	2	ALUISIO CAVALCANTE OLIVEIRA	39345670378	62371	ESTATUTARIO	ATIVO	ativo	1960-04-07 00:00:00	700.00	2026-07-16 14:16:11.216135-03	{"cpf": "39345670378", "nome": "ALUISIO CAVALCANTE OLIVEIRA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "393.***.***-78", "matricula": "62371", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62371", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "04/07/1960", "salarioLiquido": 700, "situacaoFuncional": ""}
50	2	ANA CAROLINE DE OLIVEIRA FARIAS	62202061347	62620	ESTATUTARIO	ATIVO	ativo	2003-05-03 00:00:00	0.00	2026-07-16 14:16:15.847565-03	{"cpf": "62202061347", "nome": "ANA CAROLINE DE OLIVEIRA FARIAS", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-47", "matricula": "62620", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62620", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "05/03/2003", "salarioLiquido": 0, "situacaoFuncional": ""}
51	2	ANA CLARA FERREIRA LIMA	10284464384	62675	ESTATUTARIO	ATIVO	ativo	2003-01-01 00:00:00	700.00	2026-07-16 14:16:20.325215-03	{"cpf": "10284464384", "nome": "ANA CLARA FERREIRA LIMA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "102.***.***-84", "matricula": "62675", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62675", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/01/2003", "salarioLiquido": 700, "situacaoFuncional": ""}
67	2	ANISIO DA CUNHA TAVORA	90088417387	806218	ESTATUTARIO	ATIVO	ativo	1982-01-03 00:00:00	0.00	2026-07-16 14:16:50.191483-03	{"cpf": "90088417387", "nome": "ANISIO DA CUNHA TAVORA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-87", "matricula": "806218", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806218", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "01/03/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
52	2	ANA CLEIDE RAMOS DA SILVA	73534366387	805920	ESTATUTARIO	ATIVO	ativo	1975-03-11 00:00:00	0.00	2026-07-16 14:16:21.193992-03	{"cpf": "73534366387", "nome": "ANA CLEIDE RAMOS DA SILVA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "735.***.***-87", "matricula": "805920", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805920", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "03/11/1975", "salarioLiquido": 0, "situacaoFuncional": ""}
58	2	ANA LUCIA MOURA DE FREITAS LIMA	78214416353	62940	ESTATUTARIO	ATIVO	ativo	1975-06-12 00:00:00	80.00	2026-07-16 14:16:34.642886-03	{"cpf": "78214416353", "nome": "ANA LUCIA MOURA DE FREITAS LIMA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "782.***.***-53", "matricula": "62940", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62940", "dataAdmissao": "04/05/2026", "prefeituraId": 2, "dataNascimento": "06/12/1975", "salarioLiquido": 80, "situacaoFuncional": ""}
63	2	ANA REBIA FERREIRA DE SOUZA	79693091353	804681	ESTATUTARIO	ATIVO	ativo	1963-05-05 00:00:00	0.00	2026-07-16 14:16:41.712373-03	{"cpf": "79693091353", "nome": "ANA REBIA FERREIRA DE SOUZA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "796.***.***-53", "matricula": "804681", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804681", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "05/05/1963", "salarioLiquido": 0, "situacaoFuncional": ""}
69	2	ANNY KAROLINNE SOARES DA COSTA	10119743396	62411	ESTATUTARIO	ATIVO	ativo	2004-08-03 00:00:00	0.00	2026-07-16 14:16:52.170975-03	{"cpf": "10119743396", "nome": "ANNY KAROLINNE SOARES DA COSTA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "101.***.***-96", "matricula": "62411", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62411", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/03/2004", "salarioLiquido": 0, "situacaoFuncional": ""}
77	2	ANTONIA ERIVANIA GONCALVES DA COSTA	90091230306	1229788	ESTATUTARIO	ATIVO	ativo	1982-02-04 00:00:00	0.00	2026-07-16 14:17:00.939856-03	{"cpf": "90091230306", "nome": "ANTONIA ERIVANIA GONCALVES DA COSTA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-06", "matricula": "1229788", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1229788", "dataAdmissao": "19/12/2016", "prefeituraId": 2, "dataNascimento": "02/04/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
87	2	ANTONIA SILVA DE ASSIS FEITOSA	90095340300	1215620	ESTATUTARIO	ATIVO	ativo	1982-12-09 00:00:00	0.00	2026-07-16 14:17:15.671748-03	{"cpf": "90095340300", "nome": "ANTONIA SILVA DE ASSIS FEITOSA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-00", "matricula": "1215620", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1215620", "dataAdmissao": "02/09/2013", "prefeituraId": 2, "dataNascimento": "12/09/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
285	2	IASMIM MARIA GOMES DO NASCIMENTO	62204620335	62226	ESTATUTARIO	ATIVO	ativo	2003-05-11 00:00:00	0.00	2026-07-16 14:21:52.872759-03	{"cpf": "62204620335", "nome": "IASMIM MARIA GOMES DO NASCIMENTO", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-35", "matricula": "62226", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62226", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "05/11/2003", "salarioLiquido": 0, "situacaoFuncional": ""}
341	2	JOSE PLACIDO PEREIRA MIRANDA	24179400359	802301	ESTATUTARIO	ATIVO	ativo	1962-11-03 00:00:00	0.00	2026-07-16 14:23:01.267358-03	{"cpf": "24179400359", "nome": "JOSE PLACIDO PEREIRA MIRANDA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "241.***.***-59", "matricula": "802301", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802301", "dataAdmissao": "20/07/1998", "prefeituraId": 2, "dataNascimento": "11/03/1962", "salarioLiquido": 0, "situacaoFuncional": ""}
437	2	MARIA DAS GRACAS DA SILVA	22416625349	61037	ESTATUTARIO	ATIVO	ativo	1964-02-03 00:00:00	0.00	2026-07-16 14:24:52.758046-03	{"cpf": "22416625349", "nome": "MARIA DAS GRACAS DA SILVA", "cargo": "SEC ADMINIST FINANCAS CC-1", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "224.***.***-49", "matricula": "61037", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61037", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "02/03/1964", "salarioLiquido": 0, "situacaoFuncional": ""}
447	2	MARIA DE LOURDES AGUIAR DE OLIVEIRA	79132812353	800538	ESTATUTARIO	ATIVO	ativo	1966-06-04 00:00:00	0.00	2026-07-16 14:25:03.892117-03	{"cpf": "79132812353", "nome": "MARIA DE LOURDES AGUIAR DE OLIVEIRA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "791.***.***-53", "matricula": "800538", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800538", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "06/04/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
449	2	MARIA DE LOURDES FELIPE	94809780325	62838	ESTATUTARIO	ATIVO	ativo	1965-01-02 00:00:00	80.00	2026-07-16 14:25:06.088973-03	{"cpf": "94809780325", "nome": "MARIA DE LOURDES FELIPE", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "948.***.***-25", "matricula": "62838", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62838", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "01/02/1965", "salarioLiquido": 80, "situacaoFuncional": ""}
451	2	MARIA DE LOURDES TORRES DA SILVA	31671969391	806463	ESTATUTARIO	ATIVO	ativo	1966-07-08 00:00:00	0.00	2026-07-16 14:25:08.269322-03	{"cpf": "31671969391", "nome": "MARIA DE LOURDES TORRES DA SILVA", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "316.***.***-91", "matricula": "806463", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806463", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "07/08/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
455	2	MARIA DO CARMO DE AGUIAR DOS SANTOS	72530367353	62789	ESTATUTARIO	ATIVO	ativo	1961-10-12 00:00:00	80.00	2026-07-16 14:25:13.557244-03	{"cpf": "72530367353", "nome": "MARIA DO CARMO DE AGUIAR DOS SANTOS", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "725.***.***-53", "matricula": "62789", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62789", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "10/12/1961", "salarioLiquido": 80, "situacaoFuncional": ""}
53	2	ANA ELISA DE OLIVEIRA ALVES	62205700308	62456	ESTATUTARIO	ATIVO	ativo	2006-11-09 00:00:00	700.00	2026-07-16 14:16:21.657038-03	{"cpf": "62205700308", "nome": "ANA ELISA DE OLIVEIRA ALVES", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-08", "matricula": "62456", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62456", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "11/09/2006", "salarioLiquido": 700, "situacaoFuncional": ""}
55	2	ANA JASLENE TRINDADE MACIEL	60506337383	62295	ESTATUTARIO	ATIVO	ativo	1992-01-01 00:00:00	0.00	2026-07-16 14:16:22.92247-03	{"cpf": "60506337383", "nome": "ANA JASLENE TRINDADE MACIEL", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "605.***.***-83", "matricula": "62295", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62295", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/01/1992", "salarioLiquido": 0, "situacaoFuncional": ""}
56	2	ANA LIMA EUFRASIO	90085060330	803600	ESTATUTARIO	ATIVO	ativo	1973-06-11 00:00:00	0.00	2026-07-16 14:16:29.651112-03	{"cpf": "90085060330", "nome": "ANA LIMA EUFRASIO", "cargo": "AUX ESCRITURARIO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-30", "matricula": "803600", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803600", "dataAdmissao": "01/07/1989", "prefeituraId": 2, "dataNascimento": "06/11/1973", "salarioLiquido": 0, "situacaoFuncional": ""}
78	2	ANTONIA FERNANDA DE MENEZES MOURA	62203050357	62615	ESTATUTARIO	ATIVO	ativo	2004-01-08 00:00:00	350.00	2026-07-16 14:17:01.794025-03	{"cpf": "62203050357", "nome": "ANTONIA FERNANDA DE MENEZES MOURA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-57", "matricula": "62615", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62615", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/08/2004", "salarioLiquido": 350, "situacaoFuncional": ""}
281	2	GLAYCIANNE DA SILVA SOUZA	70442894368	62091	ESTATUTARIO	ATIVO	ativo	1976-01-05 00:00:00	0.00	2026-07-16 14:21:43.303459-03	{"cpf": "70442894368", "nome": "GLAYCIANNE DA SILVA SOUZA", "cargo": "CONSELHEIRO TUTELAR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "704.***.***-68", "matricula": "62091", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62091", "dataAdmissao": "01/01/2026", "prefeituraId": 2, "dataNascimento": "01/05/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
292	2	ISAIAS LIMA EUFRASIO	80904424391	806536	ESTATUTARIO	ATIVO	ativo	1978-07-11 00:00:00	0.00	2026-07-16 14:21:58.938826-03	{"cpf": "80904424391", "nome": "ISAIAS LIMA EUFRASIO", "cargo": "PROFESSOR PEB III - MESTRE HIST (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "809.***.***-91", "matricula": "806536", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806536", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "07/11/1978", "salarioLiquido": 0, "situacaoFuncional": ""}
303	2	JEFERSON VICTOR BATISTA DA SILVA	10438111338	62294	ESTATUTARIO	ATIVO	ativo	2005-02-03 00:00:00	0.00	2026-07-16 14:22:09.666715-03	{"cpf": "10438111338", "nome": "JEFERSON VICTOR BATISTA DA SILVA", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "104.***.***-38", "matricula": "62294", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62294", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "02/03/2005", "salarioLiquido": 0, "situacaoFuncional": ""}
314	2	JOAO MARTINS DE SOUZA FILHO	90175964300	806161	ESTATUTARIO	ATIVO	ativo	1981-10-08 00:00:00	0.00	2026-07-16 14:22:21.115457-03	{"cpf": "90175964300", "nome": "JOAO MARTINS DE SOUZA FILHO", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-00", "matricula": "806161", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806161", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "10/08/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
317	2	JONAS LIMA DE SOUSA	53828259391	804371	ESTATUTARIO	ATIVO	ativo	1974-07-05 00:00:00	0.00	2026-07-16 14:22:26.411431-03	{"cpf": "53828259391", "nome": "JONAS LIMA DE SOUSA", "cargo": "OPERADOR DE COMPUTADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "538.***.***-91", "matricula": "804371", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804371", "dataAdmissao": "03/04/2000", "prefeituraId": 2, "dataNascimento": "07/05/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
320	2	JOSE ARAUJO	11403187304	800481	ESTATUTARIO	ATIVO	ativo	1959-08-03 00:00:00	0.00	2026-07-16 14:22:33.275178-03	{"cpf": "11403187304", "nome": "JOSE ARAUJO", "cargo": "AGENTE ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "114.***.***-04", "matricula": "800481", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800481", "dataAdmissao": "05/06/1981", "prefeituraId": 2, "dataNascimento": "08/03/1959", "salarioLiquido": 0, "situacaoFuncional": ""}
321	2	JOSE ARIMATEIA MARCIEL AGUIAR	23052490397	62943	ESTATUTARIO	ATIVO	ativo	1952-07-07 00:00:00	80.00	2026-07-16 14:22:35.567829-03	{"cpf": "23052490397", "nome": "JOSE ARIMATEIA MARCIEL AGUIAR", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "230.***.***-97", "matricula": "62943", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62943", "dataAdmissao": "04/05/2026", "prefeituraId": 2, "dataNascimento": "07/07/1952", "salarioLiquido": 80, "situacaoFuncional": ""}
329	2	JOSE ERASMO CASTRO ALVES	33036020349	802123	ESTATUTARIO	ATIVO	ativo	1967-11-07 00:00:00	0.00	2026-07-16 14:22:44.01784-03	{"cpf": "33036020349", "nome": "JOSE ERASMO CASTRO ALVES", "cargo": "ELETRICISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "330.***.***-49", "matricula": "802123", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802123", "dataAdmissao": "03/08/1987", "prefeituraId": 2, "dataNascimento": "11/07/1967", "salarioLiquido": 0, "situacaoFuncional": ""}
336	2	JOSE MATOS DO NASCIMENTO	44905904315	62782	ESTATUTARIO	ATIVO	ativo	1951-05-05 00:00:00	80.00	2026-07-16 14:22:57.65575-03	{"cpf": "44905904315", "nome": "JOSE MATOS DO NASCIMENTO", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "449.***.***-15", "matricula": "62782", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62782", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "05/05/1951", "salarioLiquido": 80, "situacaoFuncional": ""}
54	2	ANA GELMA FERREIRA SANTOS	84154594320	807290	ESTATUTARIO	ATIVO	ativo	1977-02-01 00:00:00	0.00	2026-07-16 14:16:22.466487-03	{"cpf": "84154594320", "nome": "ANA GELMA FERREIRA SANTOS", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "841.***.***-20", "matricula": "807290", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807290", "dataAdmissao": "01/04/2008", "prefeituraId": 2, "dataNascimento": "02/01/1977", "salarioLiquido": 0, "situacaoFuncional": ""}
294	2	ISAQUE DAMASCENO DE SOUZA	60551614358	62136	ESTATUTARIO	ATIVO	ativo	1997-10-12 00:00:00	0.00	2026-07-16 14:22:00.423634-03	{"cpf": "60551614358", "nome": "ISAQUE DAMASCENO DE SOUZA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "605.***.***-58", "matricula": "62136", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62136", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "10/12/1997", "salarioLiquido": 0, "situacaoFuncional": ""}
300	2	JANIA CELIA BEZERRA DO NASCIMENTO	89535464353	60469	ESTATUTARIO	ATIVO	ativo	1983-09-05 00:00:00	0.00	2026-07-16 14:22:07.225946-03	{"cpf": "89535464353", "nome": "JANIA CELIA BEZERRA DO NASCIMENTO", "cargo": "PENSIONISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "895.***.***-53", "matricula": "60469", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-60469", "dataAdmissao": "01/01/2025", "prefeituraId": 2, "dataNascimento": "09/05/1983", "salarioLiquido": 0, "situacaoFuncional": ""}
305	2	JOANA DARC DE AGUIAR COSME	67108504391	62568	ESTATUTARIO	ATIVO	ativo	1981-04-02 00:00:00	0.00	2026-07-16 14:22:12.580133-03	{"cpf": "67108504391", "nome": "JOANA DARC DE AGUIAR COSME", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "671.***.***-91", "matricula": "62568", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62568", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "04/02/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
311	2	JOAO EUDES MARTINS	64386171304	1213490	ESTATUTARIO	ATIVO	ativo	1980-11-08 00:00:00	0.00	2026-07-16 14:22:17.973635-03	{"cpf": "64386171304", "nome": "JOAO EUDES MARTINS", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "643.***.***-04", "matricula": "1213490", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213490", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "11/08/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
367	2	KLEITON BEZERRA SOUZA ROCHA	67152716315	1227556	ESTATUTARIO	ATIVO	ativo	1986-08-02 00:00:00	0.00	2026-07-16 14:23:24.512844-03	{"cpf": "67152716315", "nome": "KLEITON BEZERRA SOUZA ROCHA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "671.***.***-15", "matricula": "1227556", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1227556", "dataAdmissao": "01/07/2016", "prefeituraId": 2, "dataNascimento": "08/02/1986", "salarioLiquido": 0, "situacaoFuncional": ""}
400	2	MADALENA DE OLIVEIRA SOUZA	90205391320	912980	ESTATUTARIO	ATIVO	ativo	1979-02-08 00:00:00	0.00	2026-07-16 14:24:10.250359-03	{"cpf": "90205391320", "nome": "MADALENA DE OLIVEIRA SOUZA", "cargo": "AGENTE DE SAUDE", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-20", "matricula": "912980", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-912980", "dataAdmissao": "01/09/2009", "prefeituraId": 2, "dataNascimento": "02/08/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
408	2	MARCEL FRANCELINO GOMES	95131205387	62129	ESTATUTARIO	ATIVO	ativo	1983-03-09 00:00:00	0.00	2026-07-16 14:24:20.506028-03	{"cpf": "95131205387", "nome": "MARCEL FRANCELINO GOMES", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "951.***.***-87", "matricula": "62129", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62129", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "03/09/1983", "salarioLiquido": 0, "situacaoFuncional": ""}
481	2	MARIA ERIDAN DA CUNHA MAGALHAES	90231449372	62985	ESTATUTARIO	ATIVO	ativo	1966-06-09 00:00:00	80.00	2026-07-16 14:25:37.063872-03	{"cpf": "90231449372", "nome": "MARIA ERIDAN DA CUNHA MAGALHAES", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-72", "matricula": "62985", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62985", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "06/09/1966", "salarioLiquido": 80, "situacaoFuncional": ""}
483	2	MARIA FRANCILENE CONSTANTINO ANDRADE	80639151353	61093	ESTATUTARIO	ATIVO	ativo	1976-07-09 00:00:00	0.00	2026-07-16 14:25:41.135728-03	{"cpf": "80639151353", "nome": "MARIA FRANCILENE CONSTANTINO ANDRADE", "cargo": "COORD UNIDADE ESCOLAR - FGE2", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "806.***.***-53", "matricula": "61093", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61093", "dataAdmissao": "03/02/2025", "prefeituraId": 2, "dataNascimento": "07/09/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
494	2	MARIA JOSE CAETANO DA SILVA	90238117391	62918	ESTATUTARIO	ATIVO	ativo	1956-06-10 00:00:00	80.00	2026-07-16 14:25:54.292775-03	{"cpf": "90238117391", "nome": "MARIA JOSE CAETANO DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-91", "matricula": "62918", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62918", "dataAdmissao": "02/04/2026", "prefeituraId": 2, "dataNascimento": "06/10/1956", "salarioLiquido": 80, "situacaoFuncional": ""}
518	2	MARIA PAULO DE OLIVEIRA	50047418320	62770	ESTATUTARIO	ATIVO	ativo	1936-01-10 00:00:00	80.00	2026-07-16 14:26:25.066702-03	{"cpf": "50047418320", "nome": "MARIA PAULO DE OLIVEIRA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "500.***.***-20", "matricula": "62770", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62770", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "01/10/1936", "salarioLiquido": 80, "situacaoFuncional": ""}
557	2	NATALIA AGUIAR GOMES	90260600334	62631	ESTATUTARIO	ATIVO	ativo	1981-12-11 00:00:00	0.00	2026-07-16 14:26:57.925261-03	{"cpf": "90260600334", "nome": "NATALIA AGUIAR GOMES", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-34", "matricula": "62631", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62631", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "12/11/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
45	2	ALBERTO MAGNO TAVORA LIMA	83277579387	800333	ESTATUTARIO	ATIVO	ativo	1971-08-11 00:00:00	0.00	2026-07-16 14:16:07.361608-03	{"cpf": "83277579387", "nome": "ALBERTO MAGNO TAVORA LIMA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "832.***.***-87", "matricula": "800333", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800333", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "08/11/1971", "salarioLiquido": 0, "situacaoFuncional": ""}
57	2	ANA LIMA PEREIRA DA COSTA	83124845315	62817	ESTATUTARIO	ATIVO	ativo	1972-12-05 00:00:00	80.00	2026-07-16 14:16:31.087821-03	{"cpf": "83124845315", "nome": "ANA LIMA PEREIRA DA COSTA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "831.***.***-15", "matricula": "62817", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62817", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "12/05/1972", "salarioLiquido": 80, "situacaoFuncional": ""}
59	2	ANA LUIZA DA SILVA DE SOUZA	10186759304	62893	ESTATUTARIO	ATIVO	ativo	2003-05-07 00:00:00	0.00	2026-07-16 14:16:35.089558-03	{"cpf": "10186759304", "nome": "ANA LUIZA DA SILVA DE SOUZA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "101.***.***-04", "matricula": "62893", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62893", "dataAdmissao": "01/04/2026", "prefeituraId": 2, "dataNascimento": "05/07/2003", "salarioLiquido": 0, "situacaoFuncional": ""}
60	2	ANA MEIRE CASTRO AGUIAR	66673437391	62866	ESTATUTARIO	ATIVO	ativo	1974-02-10 00:00:00	80.00	2026-07-16 14:16:38.063681-03	{"cpf": "66673437391", "nome": "ANA MEIRE CASTRO AGUIAR", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "666.***.***-91", "matricula": "62866", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62866", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "02/10/1974", "salarioLiquido": 80, "situacaoFuncional": ""}
61	2	ANA PAULA NASCIMENTO DE OLIVEIRA	90086562304	61251	ESTATUTARIO	ATIVO	ativo	1978-01-08 00:00:00	0.00	2026-07-16 14:16:40.544522-03	{"cpf": "90086562304", "nome": "ANA PAULA NASCIMENTO DE OLIVEIRA", "cargo": "SUP PEDAGOGICO EJA (DAS-5)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-04", "matricula": "61251", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61251", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "01/08/1978", "salarioLiquido": 0, "situacaoFuncional": ""}
64	2	ANA THAINNA CAZUZA DA SILVA	61117270360	62555	ESTATUTARIO	ATIVO	ativo	1997-01-07 00:00:00	0.00	2026-07-16 14:16:42.561767-03	{"cpf": "61117270360", "nome": "ANA THAINNA CAZUZA DA SILVA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "611.***.***-60", "matricula": "62555", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62555", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/07/1997", "salarioLiquido": 0, "situacaoFuncional": ""}
65	2	ANDRE ALVES PEREIRA	95203460582	806200	ESTATUTARIO	ATIVO	ativo	1979-07-12 00:00:00	0.00	2026-07-16 14:16:44.242288-03	{"cpf": "95203460582", "nome": "ANDRE ALVES PEREIRA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "952.***.***-82", "matricula": "806200", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806200", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "07/12/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
72	2	ANTONIA DANIELE TELES LIMA	10462726320	62649	ESTATUTARIO	ATIVO	ativo	2007-03-12 00:00:00	700.00	2026-07-16 14:16:55.460978-03	{"cpf": "10462726320", "nome": "ANTONIA DANIELE TELES LIMA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "104.***.***-20", "matricula": "62649", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62649", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "03/12/2007", "salarioLiquido": 700, "situacaoFuncional": ""}
74	2	ANTONIA DE FATIMA NOGUEIRA DA COSTA	87070847300	62822	ESTATUTARIO	ATIVO	ativo	1973-07-09 00:00:00	80.00	2026-07-16 14:16:57.77672-03	{"cpf": "87070847300", "nome": "ANTONIA DE FATIMA NOGUEIRA DA COSTA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "870.***.***-00", "matricula": "62822", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62822", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "07/09/1973", "salarioLiquido": 80, "situacaoFuncional": ""}
81	2	ANTONIA IRISLANIA NASCIMENTO DA SILVA	90092350330	61242	ESTATUTARIO	ATIVO	ativo	1982-11-09 00:00:00	0.00	2026-07-16 14:17:05.95166-03	{"cpf": "90092350330", "nome": "ANTONIA IRISLANIA NASCIMENTO DA SILVA", "cargo": "COORDENADOR ADMINISTRATIVO (DAS-6)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-30", "matricula": "61242", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61242", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "11/09/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
84	2	ANTONIA RAQUEL DA SILVA DE SOUSA	60785299351	62410	ESTATUTARIO	ATIVO	ativo	1995-07-10 00:00:00	0.00	2026-07-16 14:17:12.373707-03	{"cpf": "60785299351", "nome": "ANTONIA RAQUEL DA SILVA DE SOUSA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "607.***.***-51", "matricula": "62410", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62410", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/10/1995", "salarioLiquido": 0, "situacaoFuncional": ""}
86	2	ANTONIA ROSILENE LIMA DUARTE	79561896320	62460	ESTATUTARIO	ATIVO	ativo	1975-08-07 00:00:00	0.00	2026-07-16 14:17:15.235361-03	{"cpf": "79561896320", "nome": "ANTONIA ROSILENE LIMA DUARTE", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "795.***.***-20", "matricula": "62460", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62460", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/07/1975", "salarioLiquido": 0, "situacaoFuncional": ""}
310	2	JOAO BATISTA SILVA	56828314387	62021	ESTATUTARIO	ATIVO	ativo	1974-02-11 00:00:00	0.00	2026-07-16 14:22:15.289735-03	{"cpf": "56828314387", "nome": "JOAO BATISTA SILVA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "568.***.***-87", "matricula": "62021", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62021", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "02/11/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
93	2	ANTONIO DO NASCIMENTO DA SILVA	90099532387	62860	ESTATUTARIO	ATIVO	ativo	1974-04-04 00:00:00	80.00	2026-07-16 14:17:29.869014-03	{"cpf": "90099532387", "nome": "ANTONIO DO NASCIMENTO DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "900.***.***-87", "matricula": "62860", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62860", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "04/04/1974", "salarioLiquido": 80, "situacaoFuncional": ""}
97	2	ANTONIO GOMES DO NASCIMENTO	50991396391	804134	ESTATUTARIO	ATIVO	ativo	1970-07-12 00:00:00	0.00	2026-07-16 14:17:34.750908-03	{"cpf": "50991396391", "nome": "ANTONIO GOMES DO NASCIMENTO", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "509.***.***-91", "matricula": "804134", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804134", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "07/12/1970", "salarioLiquido": 0, "situacaoFuncional": ""}
100	2	ANTONIO JAIME FRANCO MARTINS	31763022315	802948	ESTATUTARIO	ATIVO	ativo	1964-01-07 00:00:00	0.00	2026-07-16 14:17:36.239112-03	{"cpf": "31763022315", "nome": "ANTONIO JAIME FRANCO MARTINS", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "317.***.***-15", "matricula": "802948", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802948", "dataAdmissao": "01/06/1986", "prefeituraId": 2, "dataNascimento": "01/07/1964", "salarioLiquido": 0, "situacaoFuncional": ""}
101	2	ANTONIO JEFERSON NOGUEIRA DA COSTA	10901869325	62132	ESTATUTARIO	ATIVO	ativo	2004-11-08 00:00:00	0.00	2026-07-16 14:17:36.928803-03	{"cpf": "10901869325", "nome": "ANTONIO JEFERSON NOGUEIRA DA COSTA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "109.***.***-25", "matricula": "62132", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62132", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "11/08/2004", "salarioLiquido": 0, "situacaoFuncional": ""}
103	2	ANTONIO LEANDRO DO CARMO VINHAS	11923228358	62450	ESTATUTARIO	ATIVO	ativo	2005-06-11 00:00:00	700.00	2026-07-16 14:17:38.805568-03	{"cpf": "11923228358", "nome": "ANTONIO LEANDRO DO CARMO VINHAS", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "119.***.***-58", "matricula": "62450", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62450", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "06/11/2005", "salarioLiquido": 700, "situacaoFuncional": ""}
107	2	ANTONIO PLACIDO SILVEIRA JUNIOR	28603710368	800244	ESTATUTARIO	ATIVO	ativo	1967-05-07 00:00:00	0.00	2026-07-16 14:17:43.092598-03	{"cpf": "28603710368", "nome": "ANTONIO PLACIDO SILVEIRA JUNIOR", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "286.***.***-68", "matricula": "800244", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800244", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "05/07/1967", "salarioLiquido": 0, "situacaoFuncional": ""}
108	2	ANTONIO RIBEIRO DE OLIVEIRA	42675855391	62761	ESTATUTARIO	ATIVO	ativo	1962-10-06 00:00:00	80.00	2026-07-16 14:17:43.708004-03	{"cpf": "42675855391", "nome": "ANTONIO RIBEIRO DE OLIVEIRA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "426.***.***-91", "matricula": "62761", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62761", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "10/06/1962", "salarioLiquido": 80, "situacaoFuncional": ""}
110	2	ANTONIO SOARES SARAIVA JUNIOR	61491373334	1220403	ESTATUTARIO	ATIVO	ativo	1977-07-01 00:00:00	0.00	2026-07-16 14:17:45.37483-03	{"cpf": "61491373334", "nome": "ANTONIO SOARES SARAIVA JUNIOR", "cargo": "AGENTE ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "614.***.***-34", "matricula": "1220403", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1220403", "dataAdmissao": "01/09/2014", "prefeituraId": 2, "dataNascimento": "07/01/1977", "salarioLiquido": 0, "situacaoFuncional": ""}
111	2	ARMANDO MARTINS DA SILVA	63652203321	62464	ESTATUTARIO	ATIVO	ativo	2002-08-02 00:00:00	0.00	2026-07-16 14:17:47.2673-03	{"cpf": "63652203321", "nome": "ARMANDO MARTINS DA SILVA", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "636.***.***-21", "matricula": "62464", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62464", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/02/2002", "salarioLiquido": 0, "situacaoFuncional": ""}
112	2	AURISTELA DA CRUZ ARAUJO	88314014320	61993	ESTATUTARIO	ATIVO	ativo	1979-03-04 00:00:00	0.00	2026-07-16 14:17:48.599696-03	{"cpf": "88314014320", "nome": "AURISTELA DA CRUZ ARAUJO", "cargo": "ORIENTADOR SOCIAL", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "883.***.***-20", "matricula": "61993", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61993", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "03/04/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
113	2	AZARIAS MARTINS DA COSTA	90108701387	62029	ESTATUTARIO	ATIVO	ativo	1980-02-04 00:00:00	0.00	2026-07-16 14:17:49.539845-03	{"cpf": "90108701387", "nome": "AZARIAS MARTINS DA COSTA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-87", "matricula": "62029", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62029", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "02/04/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
115	2	BERNADETE LIMA COSTA CARNEIRO	89058887391	807303	ESTATUTARIO	ATIVO	ativo	1972-01-10 00:00:00	0.00	2026-07-16 14:17:51.980005-03	{"cpf": "89058887391", "nome": "BERNADETE LIMA COSTA CARNEIRO", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "890.***.***-91", "matricula": "807303", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807303", "dataAdmissao": "01/04/2008", "prefeituraId": 2, "dataNascimento": "01/10/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
135	2	CINTIA ALVES BARBOSA	11553886313	62105	ESTATUTARIO	ATIVO	ativo	2005-02-08 00:00:00	0.00	2026-07-16 14:18:13.495703-03	{"cpf": "11553886313", "nome": "CINTIA ALVES BARBOSA", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "115.***.***-13", "matricula": "62105", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62105", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "02/08/2005", "salarioLiquido": 0, "situacaoFuncional": ""}
116	2	BERNARDO RODRIGUES DE ALBUQUERQUE	56828632320	804843	ESTATUTARIO	ATIVO	ativo	1974-03-03 00:00:00	0.00	2026-07-16 14:17:53.319862-03	{"cpf": "56828632320", "nome": "BERNARDO RODRIGUES DE ALBUQUERQUE", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "568.***.***-20", "matricula": "804843", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804843", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "03/03/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
119	2	BONIFACIO SILVA DE SOUZA	50993313353	803707	ESTATUTARIO	ATIVO	ativo	1973-12-04 00:00:00	0.00	2026-07-16 14:17:54.554444-03	{"cpf": "50993313353", "nome": "BONIFACIO SILVA DE SOUZA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "509.***.***-53", "matricula": "803707", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803707", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "12/04/1973", "salarioLiquido": 0, "situacaoFuncional": ""}
134	2	CIBELLY PINHEIRO DE LIMA	63412610399	62712	ESTATUTARIO	ATIVO	ativo	2005-01-10 00:00:00	0.00	2026-07-16 14:18:11.051326-03	{"cpf": "63412610399", "nome": "CIBELLY PINHEIRO DE LIMA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "634.***.***-99", "matricula": "62712", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62712", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/10/2005", "salarioLiquido": 0, "situacaoFuncional": ""}
304	2	JEOVANNE MARCIEL DA SILVA	71794921320	62942	ESTATUTARIO	ATIVO	ativo	1963-11-09 00:00:00	80.00	2026-07-16 14:22:11.44714-03	{"cpf": "71794921320", "nome": "JEOVANNE MARCIEL DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "717.***.***-20", "matricula": "62942", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62942", "dataAdmissao": "04/05/2026", "prefeituraId": 2, "dataNascimento": "11/09/1963", "salarioLiquido": 80, "situacaoFuncional": ""}
315	2	JOAO PAULO COELHO MENDOCA	11984959360	62383	ESTATUTARIO	ATIVO	ativo	2007-10-02 00:00:00	350.00	2026-07-16 14:22:25.135863-03	{"cpf": "11984959360", "nome": "JOAO PAULO COELHO MENDOCA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "119.***.***-60", "matricula": "62383", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62383", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "10/02/2007", "salarioLiquido": 350, "situacaoFuncional": ""}
406	2	MANOEL DE FREITAS VIANA	94886989349	803731	ESTATUTARIO	ATIVO	ativo	1982-02-02 00:00:00	0.00	2026-07-16 14:24:16.495136-03	{"cpf": "94886989349", "nome": "MANOEL DE FREITAS VIANA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "948.***.***-49", "matricula": "803731", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803731", "dataAdmissao": "01/04/2008", "prefeituraId": 2, "dataNascimento": "02/02/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
417	2	MARGARIDA DA SILVA DE LIMA	11005123306	62278	ESTATUTARIO	ATIVO	ativo	2006-01-10 00:00:00	700.00	2026-07-16 14:24:27.860752-03	{"cpf": "11005123306", "nome": "MARGARIDA DA SILVA DE LIMA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "110.***.***-06", "matricula": "62278", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62278", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/10/2006", "salarioLiquido": 700, "situacaoFuncional": ""}
429	2	MARIA CLEBIA FERREIRA DA SILVA	90216741300	806277	ESTATUTARIO	ATIVO	ativo	1982-11-08 00:00:00	0.00	2026-07-16 14:24:42.355849-03	{"cpf": "90216741300", "nome": "MARIA CLEBIA FERREIRA DA SILVA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-00", "matricula": "806277", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806277", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "11/08/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
432	2	MARIA DA COSTA CAVALCANTE	79571468304	62437	ESTATUTARIO	ATIVO	ativo	1976-05-08 00:00:00	0.00	2026-07-16 14:24:44.640734-03	{"cpf": "79571468304", "nome": "MARIA DA COSTA CAVALCANTE", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "795.***.***-04", "matricula": "62437", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62437", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "05/08/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
439	2	MARIA DAS GRACAS DA SILVA	22416625349	803278	ESTATUTARIO	ATIVO	ativo	1964-02-03 00:00:00	0.00	2026-07-16 14:24:53.203034-03	{"cpf": "22416625349", "nome": "MARIA DAS GRACAS DA SILVA", "cargo": "OPERADOR DE COMPUTADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "224.***.***-49", "matricula": "803278", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803278", "dataAdmissao": "15/03/1984", "prefeituraId": 2, "dataNascimento": "02/03/1964", "salarioLiquido": 0, "situacaoFuncional": ""}
452	2	MARIA DO CARMO CAVALCANTE MACIEL	16377486391	805130	ESTATUTARIO	ATIVO	ativo	1959-03-11 00:00:00	0.00	2026-07-16 14:25:12.114756-03	{"cpf": "16377486391", "nome": "MARIA DO CARMO CAVALCANTE MACIEL", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "163.***.***-91", "matricula": "805130", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805130", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "03/11/1959", "salarioLiquido": 0, "situacaoFuncional": ""}
454	2	MARIA DO CARMO DE AGUIAR DOS SANTOS	72530367353	804665	ESTATUTARIO	ATIVO	ativo	1961-10-12 00:00:00	0.00	2026-07-16 14:25:12.746704-03	{"cpf": "72530367353", "nome": "MARIA DO CARMO DE AGUIAR DOS SANTOS", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "725.***.***-53", "matricula": "804665", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804665", "dataAdmissao": "01/10/1999", "prefeituraId": 2, "dataNascimento": "10/12/1961", "salarioLiquido": 0, "situacaoFuncional": ""}
464	2	MARIA EDINICE F DA SILVA	23567708368	62811	ESTATUTARIO	ATIVO	ativo	1951-09-04 00:00:00	80.00	2026-07-16 14:25:23.395043-03	{"cpf": "23567708368", "nome": "MARIA EDINICE F DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "235.***.***-68", "matricula": "62811", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62811", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "09/04/1951", "salarioLiquido": 80, "situacaoFuncional": ""}
117	2	BONIFACIO PEREIRA DE OLIVEIRA	79405657372	61228	ESTATUTARIO	ATIVO	ativo	1979-03-04 00:00:00	0.00	2026-07-16 14:17:53.769145-03	{"cpf": "79405657372", "nome": "BONIFACIO PEREIRA DE OLIVEIRA", "cargo": "GERENTE DE POLITICAS HABITACIONAIS (DAS 6)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "794.***.***-72", "matricula": "61228", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61228", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "03/04/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
121	2	CARLOS ANDRE ARAUJO LEONARDO	10953413322	62277	ESTATUTARIO	ATIVO	ativo	2005-08-01 00:00:00	350.00	2026-07-16 14:18:00.709998-03	{"cpf": "10953413322", "nome": "CARLOS ANDRE ARAUJO LEONARDO", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "109.***.***-22", "matricula": "62277", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62277", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/01/2005", "salarioLiquido": 350, "situacaoFuncional": ""}
158	2	EDINEY CHAGAS DE SOUSA	10027794300	62671	ESTATUTARIO	ATIVO	ativo	2003-10-08 00:00:00	0.00	2026-07-16 14:18:46.177183-03	{"cpf": "10027794300", "nome": "EDINEY CHAGAS DE SOUSA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "100.***.***-00", "matricula": "62671", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62671", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "10/08/2003", "salarioLiquido": 0, "situacaoFuncional": ""}
161	2	EDUARDO SIMAO NOGUEIRA	42670403387	802824	ESTATUTARIO	ATIVO	ativo	1959-07-11 00:00:00	0.00	2026-07-16 14:18:50.893171-03	{"cpf": "42670403387", "nome": "EDUARDO SIMAO NOGUEIRA", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "426.***.***-87", "matricula": "802824", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802824", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "07/11/1959", "salarioLiquido": 0, "situacaoFuncional": ""}
176	2	EMILIO VIANA DO NASCIMENTO	54554446387	1229508	ESTATUTARIO	ATIVO	ativo	1972-08-04 00:00:00	0.00	2026-07-16 14:19:09.354878-03	{"cpf": "54554446387", "nome": "EMILIO VIANA DO NASCIMENTO", "cargo": "GARI", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "545.***.***-87", "matricula": "1229508", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1229508", "dataAdmissao": "07/12/2016", "prefeituraId": 2, "dataNascimento": "08/04/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
306	2	JOANA DARC DE LIMA SILVA	60548849307	62847	ESTATUTARIO	ATIVO	ativo	1992-09-05 00:00:00	80.00	2026-07-16 14:22:13.026436-03	{"cpf": "60548849307", "nome": "JOANA DARC DE LIMA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "605.***.***-07", "matricula": "62847", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62847", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "09/05/1992", "salarioLiquido": 80, "situacaoFuncional": ""}
411	2	MARCELO DOS SANTOS VIANA	76215261300	804002	ESTATUTARIO	ATIVO	ativo	1977-06-09 00:00:00	0.00	2026-07-16 14:24:23.774612-03	{"cpf": "76215261300", "nome": "MARCELO DOS SANTOS VIANA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "762.***.***-00", "matricula": "804002", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804002", "dataAdmissao": "03/03/2008", "prefeituraId": 2, "dataNascimento": "06/09/1977", "salarioLiquido": 0, "situacaoFuncional": ""}
486	2	MARIA HELENA DE LIMA DA SILVA	90234901349	1234943	ESTATUTARIO	ATIVO	ativo	1974-12-10 00:00:00	0.00	2026-07-16 14:25:47.857454-03	{"cpf": "90234901349", "nome": "MARIA HELENA DE LIMA DA SILVA", "cargo": "AGENTE DE SAUDE", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-49", "matricula": "1234943", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1234943", "dataAdmissao": "11/09/2017", "prefeituraId": 2, "dataNascimento": "12/10/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
490	2	MARIA IRINEIDE DA SILVA DOS SANTOS COSTA	66716179372	62393	ESTATUTARIO	ATIVO	ativo	1982-11-02 00:00:00	0.00	2026-07-16 14:25:51.943712-03	{"cpf": "66716179372", "nome": "MARIA IRINEIDE DA SILVA DOS SANTOS COSTA", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "667.***.***-72", "matricula": "62393", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62393", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "11/02/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
492	2	MARIA IZABELA MARTINS DE LIMA	60101478321	807974	ESTATUTARIO	ATIVO	ativo	1988-05-12 00:00:00	0.00	2026-07-16 14:25:52.839124-03	{"cpf": "60101478321", "nome": "MARIA IZABELA MARTINS DE LIMA", "cargo": "ATENDENTE", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "601.***.***-21", "matricula": "807974", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807974", "dataAdmissao": "01/10/2008", "prefeituraId": 2, "dataNascimento": "05/12/1988", "salarioLiquido": 0, "situacaoFuncional": ""}
536	2	MARIA ZENILDA DA SILVA AGUIAR	90255372353	62796	ESTATUTARIO	ATIVO	ativo	1951-11-08 00:00:00	80.00	2026-07-16 14:26:37.486315-03	{"cpf": "90255372353", "nome": "MARIA ZENILDA DA SILVA AGUIAR", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-53", "matricula": "62796", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62796", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "11/08/1951", "salarioLiquido": 80, "situacaoFuncional": ""}
555	2	NAIANE DA SILVA PEREIRA	62204632341	62617	ESTATUTARIO	ATIVO	ativo	2001-04-08 00:00:00	700.00	2026-07-16 14:26:55.029201-03	{"cpf": "62204632341", "nome": "NAIANE DA SILVA PEREIRA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-41", "matricula": "62617", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62617", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "04/08/2001", "salarioLiquido": 700, "situacaoFuncional": ""}
569	2	PEDRO ALVES DO NASCIMENTO	43088929372	62955	ESTATUTARIO	ATIVO	ativo	1965-08-03 00:00:00	80.00	2026-07-16 14:27:12.15433-03	{"cpf": "43088929372", "nome": "PEDRO ALVES DO NASCIMENTO", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "430.***.***-72", "matricula": "62955", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62955", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "08/03/1965", "salarioLiquido": 80, "situacaoFuncional": ""}
75	2	ANTONIA ERIVANDA PEREIRA DA SILVA	48409278391	62778	ESTATUTARIO	ATIVO	ativo	1967-08-09 00:00:00	80.00	2026-07-16 14:16:59.093419-03	{"cpf": "48409278391", "nome": "ANTONIA ERIVANDA PEREIRA DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "484.***.***-91", "matricula": "62778", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62778", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "08/09/1967", "salarioLiquido": 80, "situacaoFuncional": ""}
83	2	ANTONIA ISABELI FERREIRA FREITAS	62204569399	62600	ESTATUTARIO	ATIVO	ativo	2000-07-09 00:00:00	350.00	2026-07-16 14:17:06.814636-03	{"cpf": "62204569399", "nome": "ANTONIA ISABELI FERREIRA FREITAS", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-99", "matricula": "62600", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62600", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/09/2000", "salarioLiquido": 350, "situacaoFuncional": ""}
123	2	CARLOS HENRIQUE FRANCELINO	38804638320	912824	ESTATUTARIO	ATIVO	ativo	1967-03-06 00:00:00	0.00	2026-07-16 14:18:02.422052-03	{"cpf": "38804638320", "nome": "CARLOS HENRIQUE FRANCELINO", "cargo": "TECNICO EM AGROPECUARIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "388.***.***-20", "matricula": "912824", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-912824", "dataAdmissao": "01/06/2009", "prefeituraId": 2, "dataNascimento": "03/06/1967", "salarioLiquido": 0, "situacaoFuncional": ""}
126	2	CAROL DE FREITAS DA SILVA	10581710380	62925	ESTATUTARIO	ATIVO	ativo	2005-11-08 00:00:00	700.00	2026-07-16 14:18:04.786057-03	{"cpf": "10581710380", "nome": "CAROL DE FREITAS DA SILVA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "105.***.***-80", "matricula": "62925", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62925", "dataAdmissao": "04/05/2026", "prefeituraId": 2, "dataNascimento": "11/08/2005", "salarioLiquido": 700, "situacaoFuncional": ""}
129	2	CELIA MARIA SILVA UCHOA	53925068368	803227	ESTATUTARIO	ATIVO	ativo	1966-08-11 00:00:00	0.00	2026-07-16 14:18:08.909087-03	{"cpf": "53925068368", "nome": "CELIA MARIA SILVA UCHOA", "cargo": "ATENDENTE", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "539.***.***-68", "matricula": "803227", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803227", "dataAdmissao": "03/08/1998", "prefeituraId": 2, "dataNascimento": "08/11/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
132	2	CHRISTEANE ALVES DOS SANTOS NASCIMENTO	61643750372	61292	ESTATUTARIO	ATIVO	ativo	1979-11-03 00:00:00	0.00	2026-07-16 14:18:10.503698-03	{"cpf": "61643750372", "nome": "CHRISTEANE ALVES DOS SANTOS NASCIMENTO", "cargo": "DIR DE GESTAO DO PATRIMONIO IMOBILIARIO", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "616.***.***-72", "matricula": "61292", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61292", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "11/03/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
137	2	CLAUDIA APARECIDA SILVA	68885199372	1227602	ESTATUTARIO	ATIVO	ativo	1972-03-04 00:00:00	0.00	2026-07-16 14:18:15.958684-03	{"cpf": "68885199372", "nome": "CLAUDIA APARECIDA SILVA", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "688.***.***-72", "matricula": "1227602", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1227602", "dataAdmissao": "01/07/2016", "prefeituraId": 2, "dataNascimento": "03/04/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
140	2	CLAUDIO DE OLIVEIRA LIMA	85267589349	62873	ESTATUTARIO	ATIVO	ativo	1967-08-07 00:00:00	80.00	2026-07-16 14:18:20.453675-03	{"cpf": "85267589349", "nome": "CLAUDIO DE OLIVEIRA LIMA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "852.***.***-49", "matricula": "62873", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62873", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "08/07/1967", "salarioLiquido": 80, "situacaoFuncional": ""}
141	2	CLEANIA MARTINS DE OLIVEIRA	88355500334	806633	ESTATUTARIO	ATIVO	ativo	1981-03-02 00:00:00	0.00	2026-07-16 14:18:23.835388-03	{"cpf": "88355500334", "nome": "CLEANIA MARTINS DE OLIVEIRA", "cargo": "PROF EDUC BASICA PEB III-MESTRE (100H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "883.***.***-34", "matricula": "806633", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806633", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "03/02/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
142	2	CLEIDIANE ALVES MATOS	40403649889	62964	ESTATUTARIO	ATIVO	ativo	1985-08-07 00:00:00	80.00	2026-07-16 14:18:24.283931-03	{"cpf": "40403649889", "nome": "CLEIDIANE ALVES MATOS", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "404.***.***-89", "matricula": "62964", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62964", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "08/07/1985", "salarioLiquido": 80, "situacaoFuncional": ""}
143	2	COSMO FERREIRA ALVES	43525318391	1234960	ESTATUTARIO	ATIVO	ativo	1973-05-09 00:00:00	0.00	2026-07-16 14:18:28.392994-03	{"cpf": "43525318391", "nome": "COSMO FERREIRA ALVES", "cargo": "AGENTE DE SAUDE", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "435.***.***-91", "matricula": "1234960", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1234960", "dataAdmissao": "11/09/2017", "prefeituraId": 2, "dataNascimento": "05/09/1973", "salarioLiquido": 0, "situacaoFuncional": ""}
144	2	CRISTIANA GOMES DE OLIVEIRA	79563597320	61071	ESTATUTARIO	ATIVO	ativo	1973-07-07 00:00:00	0.00	2026-07-16 14:18:29.225505-03	{"cpf": "79563597320", "nome": "CRISTIANA GOMES DE OLIVEIRA", "cargo": "DIR UNIDADE ESCOLAR FGE-1", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "795.***.***-20", "matricula": "61071", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61071", "dataAdmissao": "03/02/2025", "prefeituraId": 2, "dataNascimento": "07/07/1973", "salarioLiquido": 0, "situacaoFuncional": ""}
146	2	CRISTIANO DE LIMA CAVALCANTE	45745188391	61052	ESTATUTARIO	ATIVO	ativo	1969-06-05 00:00:00	0.00	2026-07-16 14:18:31.631494-03	{"cpf": "45745188391", "nome": "CRISTIANO DE LIMA CAVALCANTE", "cargo": "AVALIADOR PATRIMONIAL", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "457.***.***-91", "matricula": "61052", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61052", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "06/05/1969", "salarioLiquido": 0, "situacaoFuncional": ""}
96	2	ANTONIO FERNANDO TAVORA ARAUJO	31059562391	800449	ESTATUTARIO	ATIVO	ativo	1961-06-12 00:00:00	0.00	2026-07-16 14:17:33.867112-03	{"cpf": "31059562391", "nome": "ANTONIO FERNANDO TAVORA ARAUJO", "cargo": "AGENTE ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "310.***.***-91", "matricula": "800449", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800449", "dataAdmissao": "15/04/1986", "prefeituraId": 2, "dataNascimento": "06/12/1961", "salarioLiquido": 0, "situacaoFuncional": ""}
147	2	CRISTIANO SEVERIANO DA COSTA	60102006369	62742	ESTATUTARIO	ATIVO	ativo	1974-10-04 00:00:00	80.00	2026-07-16 14:18:32.484155-03	{"cpf": "60102006369", "nome": "CRISTIANO SEVERIANO DA COSTA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "601.***.***-69", "matricula": "62742", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62742", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "10/04/1974", "salarioLiquido": 80, "situacaoFuncional": ""}
152	2	DANIEL LIMA DOS SANTOS	84620579300	1229460	ESTATUTARIO	ATIVO	ativo	1978-10-12 00:00:00	0.00	2026-07-16 14:18:38.392766-03	{"cpf": "84620579300", "nome": "DANIEL LIMA DOS SANTOS", "cargo": "GARI", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "846.***.***-00", "matricula": "1229460", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1229460", "dataAdmissao": "07/12/2016", "prefeituraId": 2, "dataNascimento": "10/12/1978", "salarioLiquido": 0, "situacaoFuncional": ""}
170	2	ELIZABETH DA COSTA QUEIROZ BARROSO	90125649304	61103	ESTATUTARIO	ATIVO	ativo	1981-12-11 00:00:00	0.00	2026-07-16 14:19:03.117437-03	{"cpf": "90125649304", "nome": "ELIZABETH DA COSTA QUEIROZ BARROSO", "cargo": "COORD UNIDADE ESCOLAR - FGE2", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-04", "matricula": "61103", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61103", "dataAdmissao": "03/02/2025", "prefeituraId": 2, "dataNascimento": "12/11/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
275	2	GABRIEL NICOLLAS DE AGUIAR FERREIRA	11253850305	62228	ESTATUTARIO	ATIVO	ativo	2005-09-07 00:00:00	0.00	2026-07-16 14:21:32.59099-03	{"cpf": "11253850305", "nome": "GABRIEL NICOLLAS DE AGUIAR FERREIRA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "112.***.***-05", "matricula": "62228", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62228", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "09/07/2005", "salarioLiquido": 0, "situacaoFuncional": ""}
302	2	JATAINA DE SOUSA SILVA	60101530340	1229591	ESTATUTARIO	ATIVO	ativo	1987-09-11 00:00:00	0.00	2026-07-16 14:22:08.810073-03	{"cpf": "60101530340", "nome": "JATAINA DE SOUSA SILVA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "601.***.***-40", "matricula": "1229591", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1229591", "dataAdmissao": "19/12/2016", "prefeituraId": 2, "dataNascimento": "09/11/1987", "salarioLiquido": 0, "situacaoFuncional": ""}
323	2	JOSE AROLDO DIAS DO NASCIMENTO	45526893391	1213245	ESTATUTARIO	ATIVO	ativo	1969-10-11 00:00:00	0.00	2026-07-16 14:22:37.773521-03	{"cpf": "45526893391", "nome": "JOSE AROLDO DIAS DO NASCIMENTO", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "455.***.***-91", "matricula": "1213245", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213245", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "10/11/1969", "salarioLiquido": 0, "situacaoFuncional": ""}
350	2	JOSIANO TAVARES BRITO	61494933349	807176	ESTATUTARIO	ATIVO	ativo	1979-02-03 00:00:00	0.00	2026-07-16 14:23:09.942685-03	{"cpf": "61494933349", "nome": "JOSIANO TAVARES BRITO", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "614.***.***-49", "matricula": "807176", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807176", "dataAdmissao": "03/03/2008", "prefeituraId": 2, "dataNascimento": "02/03/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
370	2	LASARO LIMA CAVALCANTE	85553549353	62931	ESTATUTARIO	ATIVO	ativo	1978-07-04 00:00:00	700.00	2026-07-16 14:23:27.642167-03	{"cpf": "85553549353", "nome": "LASARO LIMA CAVALCANTE", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "855.***.***-53", "matricula": "62931", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62931", "dataAdmissao": "04/05/2026", "prefeituraId": 2, "dataNascimento": "07/04/1978", "salarioLiquido": 700, "situacaoFuncional": ""}
372	2	LEDE ISABEL SARAIVA LIMA	69591008368	807966	ESTATUTARIO	ATIVO	ativo	1974-10-09 00:00:00	0.00	2026-07-16 14:23:28.526569-03	{"cpf": "69591008368", "nome": "LEDE ISABEL SARAIVA LIMA", "cargo": "GARI", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "695.***.***-68", "matricula": "807966", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807966", "dataAdmissao": "01/10/2008", "prefeituraId": 2, "dataNascimento": "10/09/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
440	2	MARIA DAS GRACAS DA SILVA	22416625349	61271	ESTATUTARIO	ATIVO	ativo	1964-02-03 00:00:00	0.00	2026-07-16 14:24:54.045259-03	{"cpf": "22416625349", "nome": "MARIA DAS GRACAS DA SILVA", "cargo": "SEC MUNICIPAL DE GOVERNO", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "224.***.***-49", "matricula": "61271", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61271", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "02/03/1964", "salarioLiquido": 0, "situacaoFuncional": ""}
443	2	MARIA DE FATIMA CARDOSO AGUIAR	16192060304	62779	ESTATUTARIO	ATIVO	ativo	1954-06-02 00:00:00	80.00	2026-07-16 14:24:58.257179-03	{"cpf": "16192060304", "nome": "MARIA DE FATIMA CARDOSO AGUIAR", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "161.***.***-04", "matricula": "62779", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62779", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "06/02/1954", "salarioLiquido": 80, "situacaoFuncional": ""}
149	2	CRISTINA ANDRADE MARQUES	57472505315	802735	ESTATUTARIO	ATIVO	ativo	1970-05-08 00:00:00	0.00	2026-07-16 14:18:33.631638-03	{"cpf": "57472505315", "nome": "CRISTINA ANDRADE MARQUES", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "574.***.***-15", "matricula": "802735", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802735", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "05/08/1970", "salarioLiquido": 0, "situacaoFuncional": ""}
154	2	DAVI DA SILVA DE FREITAS	10976693356	62262	ESTATUTARIO	ATIVO	ativo	2004-04-08 00:00:00	0.00	2026-07-16 14:18:40.050297-03	{"cpf": "10976693356", "nome": "DAVI DA SILVA DE FREITAS", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "109.***.***-56", "matricula": "62262", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62262", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "04/08/2004", "salarioLiquido": 0, "situacaoFuncional": ""}
297	2	ITAMAR DA CRUZ FRANCELINO	73027553291	804436	ESTATUTARIO	ATIVO	ativo	1979-04-04 00:00:00	0.00	2026-07-16 14:22:03.192939-03	{"cpf": "73027553291", "nome": "ITAMAR DA CRUZ FRANCELINO", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "730.***.***-91", "matricula": "804436", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804436", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "04/04/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
328	2	JOSE DUARTE DE OLIVEIRA	54921546304	804401	ESTATUTARIO	ATIVO	ativo	1969-02-08 00:00:00	0.00	2026-07-16 14:22:43.365975-03	{"cpf": "54921546304", "nome": "JOSE DUARTE DE OLIVEIRA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "549.***.***-04", "matricula": "804401", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804401", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "02/08/1969", "salarioLiquido": 0, "situacaoFuncional": ""}
425	2	MARIA CELIA DE ARAUJO DO NASCIMENTO	90215826353	60443	ESTATUTARIO	ATIVO	ativo	1966-12-04 00:00:00	0.00	2026-07-16 14:24:41.484471-03	{"cpf": "90215826353", "nome": "MARIA CELIA DE ARAUJO DO NASCIMENTO", "cargo": "PENSIONISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-53", "matricula": "60443", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-60443", "dataAdmissao": "01/01/2025", "prefeituraId": 2, "dataNascimento": "12/04/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
489	2	MARIA IRINEIDE DA SILVA DOS SANTOS COSTA	66716179372	62394	ESTATUTARIO	ATIVO	ativo	1982-11-02 00:00:00	0.00	2026-07-16 14:25:51.492206-03	{"cpf": "66716179372", "nome": "MARIA IRINEIDE DA SILVA DOS SANTOS COSTA", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "667.***.***-72", "matricula": "62394", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62394", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "11/02/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
496	2	MARIA JOSE DO NASCIMENTO DE FREITAS	44212658372	805270	ESTATUTARIO	ATIVO	ativo	1963-03-04 00:00:00	0.00	2026-07-16 14:25:59.612385-03	{"cpf": "44212658372", "nome": "MARIA JOSE DO NASCIMENTO DE FREITAS", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-72", "matricula": "805270", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805270", "dataAdmissao": "03/08/1998", "prefeituraId": 2, "dataNascimento": "03/04/1963", "salarioLiquido": 0, "situacaoFuncional": ""}
497	2	MARIA JOSE GERMANO VIEIRA FERREIRA	83618287372	807036	ESTATUTARIO	ATIVO	ativo	1977-03-11 00:00:00	0.00	2026-07-16 14:26:00.038658-03	{"cpf": "83618287372", "nome": "MARIA JOSE GERMANO VIEIRA FERREIRA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "836.***.***-72", "matricula": "807036", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807036", "dataAdmissao": "03/03/2008", "prefeituraId": 2, "dataNascimento": "03/11/1977", "salarioLiquido": 0, "situacaoFuncional": ""}
509	2	MARIANA LIMA PINHEIRO	60551264357	62442	ESTATUTARIO	ATIVO	ativo	1995-12-07 00:00:00	0.00	2026-07-16 14:26:15.758775-03	{"cpf": "60551264357", "nome": "MARIANA LIMA PINHEIRO", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "605.***.***-57", "matricula": "62442", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62442", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "12/07/1995", "salarioLiquido": 0, "situacaoFuncional": ""}
540	2	MARLIETE DE MOURA RODRIGUES	51827204320	62820	ESTATUTARIO	ATIVO	ativo	1959-05-01 00:00:00	80.00	2026-07-16 14:26:43.246693-03	{"cpf": "51827204320", "nome": "MARLIETE DE MOURA RODRIGUES", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "518.***.***-20", "matricula": "62820", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62820", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "05/01/1959", "salarioLiquido": 80, "situacaoFuncional": ""}
543	2	MARTA IRENE NASCIMENTO DA COSTA	74196596304	804304	ESTATUTARIO	ATIVO	ativo	1961-12-09 00:00:00	0.00	2026-07-16 14:26:45.078796-03	{"cpf": "74196596304", "nome": "MARTA IRENE NASCIMENTO DA COSTA", "cargo": "AGENTE ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "741.***.***-04", "matricula": "804304", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804304", "dataAdmissao": "18/02/1999", "prefeituraId": 2, "dataNascimento": "12/09/1961", "salarioLiquido": 0, "situacaoFuncional": ""}
547	2	MICHELE MATOS PRUDENCIO	88920097372	806080	ESTATUTARIO	ATIVO	ativo	1983-08-06 00:00:00	0.00	2026-07-16 14:26:48.18778-03	{"cpf": "88920097372", "nome": "MICHELE MATOS PRUDENCIO", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "889.***.***-72", "matricula": "806080", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806080", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "08/06/1983", "salarioLiquido": 0, "situacaoFuncional": ""}
122	2	CARLOS DA SILVA CAVALCANTE	85462497334	61552	ESTATUTARIO	ATIVO	ativo	1978-07-07 00:00:00	0.00	2026-07-16 14:18:01.982181-03	{"cpf": "85462497334", "nome": "CARLOS DA SILVA CAVALCANTE", "cargo": "DIRETOR DO SETOR DE MATERIAL E PATRIMONIO", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "854.***.***-34", "matricula": "61552", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61552", "dataAdmissao": "01/07/2025", "prefeituraId": 2, "dataNascimento": "07/07/1978", "salarioLiquido": 0, "situacaoFuncional": ""}
163	2	EDYR LINCON CAVALCANTE DIAS	82052182349	1215329	ESTATUTARIO	ATIVO	ativo	1979-06-07 00:00:00	0.00	2026-07-16 14:18:51.753394-03	{"cpf": "82052182349", "nome": "EDYR LINCON CAVALCANTE DIAS", "cargo": "MEDICO HOSPITAL (PLANTONISTA)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "820.***.***-49", "matricula": "1215329", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1215329", "dataAdmissao": "02/09/2013", "prefeituraId": 2, "dataNascimento": "06/07/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
164	2	ELAINE DE SOUZA FREITAS	11012767388	62238	ESTATUTARIO	ATIVO	ativo	2005-12-04 00:00:00	700.00	2026-07-16 14:18:52.185091-03	{"cpf": "11012767388", "nome": "ELAINE DE SOUZA FREITAS", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "110.***.***-88", "matricula": "62238", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62238", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "12/04/2005", "salarioLiquido": 700, "situacaoFuncional": ""}
187	2	FABIANA DE SOUSA CRUZ	81516940334	62146	ESTATUTARIO	ATIVO	ativo	1975-01-10 00:00:00	0.00	2026-07-16 14:19:25.402995-03	{"cpf": "81516940334", "nome": "FABIANA DE SOUSA CRUZ", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "815.***.***-34", "matricula": "62146", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62146", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/10/1975", "salarioLiquido": 0, "situacaoFuncional": ""}
290	2	ISABEL DA SILVA FELIPE	86598430372	807982	ESTATUTARIO	ATIVO	ativo	1977-02-10 00:00:00	0.00	2026-07-16 14:21:57.617891-03	{"cpf": "86598430372", "nome": "ISABEL DA SILVA FELIPE", "cargo": "GARI", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "865.***.***-72", "matricula": "807982", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807982", "dataAdmissao": "01/10/2008", "prefeituraId": 2, "dataNascimento": "02/10/1977", "salarioLiquido": 0, "situacaoFuncional": ""}
346	2	JOSE WILAME DE ARAUJO PEREIRA	61919144315	1229265	ESTATUTARIO	ATIVO	ativo	1980-08-07 00:00:00	150.00	2026-07-16 14:23:07.75942-03	{"cpf": "61919144315", "nome": "JOSE WILAME DE ARAUJO PEREIRA", "cargo": "APRENDIZ DE MUSICA/BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "619.***.***-15", "matricula": "1229265", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1229265", "dataAdmissao": "01/09/2016", "prefeituraId": 2, "dataNascimento": "08/07/1980", "salarioLiquido": 150, "situacaoFuncional": ""}
363	2	KARLA DE MENEZES COSTA	63318989304	1213970	ESTATUTARIO	ATIVO	ativo	1980-05-02 00:00:00	0.00	2026-07-16 14:23:20.702871-03	{"cpf": "63318989304", "nome": "KARLA DE MENEZES COSTA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "633.***.***-04", "matricula": "1213970", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213970", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "05/02/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
442	2	MARIA DAS GRACAS MARTINS DA SILVA	97943410378	62787	ESTATUTARIO	ATIVO	ativo	1954-10-02 00:00:00	80.00	2026-07-16 14:24:56.945418-03	{"cpf": "97943410378", "nome": "MARIA DAS GRACAS MARTINS DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "979.***.***-78", "matricula": "62787", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62787", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "10/02/1954", "salarioLiquido": 80, "situacaoFuncional": ""}
466	2	MARIA EDNA DE SOUSA QUEIROZ	85441104368	805246	ESTATUTARIO	ATIVO	ativo	1981-02-03 00:00:00	0.00	2026-07-16 14:25:24.242467-03	{"cpf": "85441104368", "nome": "MARIA EDNA DE SOUSA QUEIROZ", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "854.***.***-68", "matricula": "805246", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805246", "dataAdmissao": "03/08/1998", "prefeituraId": 2, "dataNascimento": "02/03/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
495	2	MARIA JOSE DA SILVA REIS	31056245387	802760	ESTATUTARIO	ATIVO	ativo	1966-11-02 00:00:00	0.00	2026-07-16 14:25:59.188178-03	{"cpf": "31056245387", "nome": "MARIA JOSE DA SILVA REIS", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "310.***.***-87", "matricula": "802760", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802760", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "11/02/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
173	2	ELIZANGELA FREIRE GOMES	71760075353	806285	ESTATUTARIO	ATIVO	ativo	1976-12-08 00:00:00	0.00	2026-07-16 14:19:04.835033-03	{"cpf": "71760075353", "nome": "ELIZANGELA FREIRE GOMES", "cargo": "AGENTE ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "717.***.***-53", "matricula": "806285", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806285", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "12/08/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
181	2	ESTANISLAU DE LIMA ROCHA	90128095334	61291	ESTATUTARIO	ATIVO	ativo	1981-01-10 00:00:00	0.00	2026-07-16 14:19:14.937652-03	{"cpf": "90128095334", "nome": "ESTANISLAU DE LIMA ROCHA", "cargo": "SEC OBRAS SERV PUBLICOS CC-1", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-34", "matricula": "61291", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61291", "dataAdmissao": "03/02/2025", "prefeituraId": 2, "dataNascimento": "01/10/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
185	2	EVILEN PEREIRA LIMA	62206465337	62602	ESTATUTARIO	ATIVO	ativo	2007-01-03 00:00:00	700.00	2026-07-16 14:19:23.198196-03	{"cpf": "62206465337", "nome": "EVILEN PEREIRA LIMA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-37", "matricula": "62602", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62602", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/03/2007", "salarioLiquido": 700, "situacaoFuncional": ""}
343	2	JOSE ROCHA DE LIMA CAVALCANTE	31873944349	801194	ESTATUTARIO	ATIVO	ativo	1968-09-01 00:00:00	0.00	2026-07-16 14:23:05.203026-03	{"cpf": "31873944349", "nome": "JOSE ROCHA DE LIMA CAVALCANTE", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "318.***.***-49", "matricula": "801194", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-801194", "dataAdmissao": "01/04/1987", "prefeituraId": 2, "dataNascimento": "09/01/1968", "salarioLiquido": 0, "situacaoFuncional": ""}
459	2	MARIA DO SOCORRO ALVES SOARES	74944045387	804460	ESTATUTARIO	ATIVO	ativo	1973-07-05 00:00:00	0.00	2026-07-16 14:25:17.149293-03	{"cpf": "74944045387", "nome": "MARIA DO SOCORRO ALVES SOARES", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "749.***.***-87", "matricula": "804460", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804460", "dataAdmissao": "01/06/1999", "prefeituraId": 2, "dataNascimento": "07/05/1973", "salarioLiquido": 0, "situacaoFuncional": ""}
461	2	MARIA DO SOCORRO LIMA DE ARAUJO	44263945387	62776	ESTATUTARIO	ATIVO	ativo	1958-09-08 00:00:00	80.00	2026-07-16 14:25:18.498726-03	{"cpf": "44263945387", "nome": "MARIA DO SOCORRO LIMA DE ARAUJO", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-87", "matricula": "62776", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62776", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "09/08/1958", "salarioLiquido": 80, "situacaoFuncional": ""}
500	2	MARIA LENITA RIBEIRO CARVALHO	28987560325	803715	ESTATUTARIO	ATIVO	ativo	1966-05-05 00:00:00	0.00	2026-07-16 14:26:01.815599-03	{"cpf": "28987560325", "nome": "MARIA LENITA RIBEIRO CARVALHO", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "289.***.***-25", "matricula": "803715", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803715", "dataAdmissao": "31/03/2008", "prefeituraId": 2, "dataNascimento": "05/05/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
505	2	MARIA LUCIMAR DUARTE MACIEL	44211015320	801682	ESTATUTARIO	ATIVO	ativo	1960-06-10 00:00:00	0.00	2026-07-16 14:26:08.63093-03	{"cpf": "44211015320", "nome": "MARIA LUCIMAR DUARTE MACIEL", "cargo": "ZELADOR - AG1", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-20", "matricula": "801682", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-801682", "dataAdmissao": "08/04/1991", "prefeituraId": 2, "dataNascimento": "06/10/1960", "salarioLiquido": 0, "situacaoFuncional": ""}
516	2	MARIA PAULINO	20362471304	62750	ESTATUTARIO	ATIVO	ativo	1956-07-06 00:00:00	80.00	2026-07-16 14:26:23.602415-03	{"cpf": "20362471304", "nome": "MARIA PAULINO", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "203.***.***-04", "matricula": "62750", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62750", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "07/06/1956", "salarioLiquido": 80, "situacaoFuncional": ""}
521	2	MARIA RANIELE DA SILVA DOS SANTOS	63412553301	62622	ESTATUTARIO	ATIVO	ativo	2007-02-11 00:00:00	700.00	2026-07-16 14:26:25.928746-03	{"cpf": "63412553301", "nome": "MARIA RANIELE DA SILVA DOS SANTOS", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "634.***.***-01", "matricula": "62622", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62622", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "02/11/2007", "salarioLiquido": 700, "situacaoFuncional": ""}
549	2	MIGUEL WILIAM DA SILVA SANTOS	62203714379	62946	ESTATUTARIO	ATIVO	ativo	2008-12-01 00:00:00	0.00	2026-07-16 14:26:49.157568-03	{"cpf": "62203714379", "nome": "MIGUEL WILIAM DA SILVA SANTOS", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-79", "matricula": "62946", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62946", "dataAdmissao": "04/05/2026", "prefeituraId": 2, "dataNascimento": "12/01/2008", "salarioLiquido": 0, "situacaoFuncional": ""}
177	2	ERICA DA SILVA SOUSA VIEIRA	11876447303	62454	ESTATUTARIO	ATIVO	ativo	2007-07-06 00:00:00	700.00	2026-07-16 14:19:11.024672-03	{"cpf": "11876447303", "nome": "ERICA DA SILVA SOUSA VIEIRA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "118.***.***-03", "matricula": "62454", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62454", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/06/2007", "salarioLiquido": 700, "situacaoFuncional": ""}
362	2	KARINE VIANA BARROSO	90195523334	804320	ESTATUTARIO	ATIVO	ativo	1982-10-03 00:00:00	0.00	2026-07-16 14:23:19.82851-03	{"cpf": "90195523334", "nome": "KARINE VIANA BARROSO", "cargo": "OPERADOR DE COMPUTADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-34", "matricula": "804320", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804320", "dataAdmissao": "03/03/2008", "prefeituraId": 2, "dataNascimento": "10/03/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
462	2	MARIA EDIANA FERREIRA LOPES	90228804353	61247	ESTATUTARIO	ATIVO	ativo	1979-10-09 00:00:00	0.00	2026-07-16 14:25:22.516108-03	{"cpf": "90228804353", "nome": "MARIA EDIANA FERREIRA LOPES", "cargo": "SUP PEDAGOGICO DO ENSINO FUNDAMENTAL (DAS-5)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-53", "matricula": "61247", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61247", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "10/09/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
467	2	MARIA EDUARDA QUEIROS DIAS	63412711314	62178	ESTATUTARIO	ATIVO	ativo	2005-08-10 00:00:00	350.00	2026-07-16 14:25:25.866333-03	{"cpf": "63412711314", "nome": "MARIA EDUARDA QUEIROS DIAS", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "634.***.***-14", "matricula": "62178", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62178", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/10/2005", "salarioLiquido": 350, "situacaoFuncional": ""}
506	2	MARIA LUCIMAR DUARTE MACIEL	44211015320	62963	ESTATUTARIO	ATIVO	ativo	1960-06-10 00:00:00	80.00	2026-07-16 14:26:09.197146-03	{"cpf": "44211015320", "nome": "MARIA LUCIMAR DUARTE MACIEL", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-20", "matricula": "62963", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62963", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "06/10/1960", "salarioLiquido": 80, "situacaoFuncional": ""}
512	2	MARIA NECIVANIA DE SOUSA PEREIRA	83100822315	62563	ESTATUTARIO	ATIVO	ativo	1981-08-08 00:00:00	0.00	2026-07-16 14:26:16.899206-03	{"cpf": "83100822315", "nome": "MARIA NECIVANIA DE SOUSA PEREIRA", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "831.***.***-15", "matricula": "62563", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62563", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/08/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
526	2	MARIA ROSELY LIMA DE SOUZA	46994610349	1229923	ESTATUTARIO	ATIVO	ativo	1973-04-04 00:00:00	0.00	2026-07-16 14:26:30.759888-03	{"cpf": "46994610349", "nome": "MARIA ROSELY LIMA DE SOUZA", "cargo": "PEDAGOGO", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "469.***.***-49", "matricula": "1229923", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1229923", "dataAdmissao": "19/12/2016", "prefeituraId": 2, "dataNascimento": "04/04/1973", "salarioLiquido": 0, "situacaoFuncional": ""}
532	2	MARIA VEROTILDE ALVES RIBEIRO	68013329372	806196	ESTATUTARIO	ATIVO	ativo	1971-12-07 00:00:00	0.00	2026-07-16 14:26:34.937038-03	{"cpf": "68013329372", "nome": "MARIA VEROTILDE ALVES RIBEIRO", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "680.***.***-72", "matricula": "806196", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806196", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "12/07/1971", "salarioLiquido": 0, "situacaoFuncional": ""}
542	2	MARLUCIA FERREIRA DA COSTA	48739642100	62748	ESTATUTARIO	ATIVO	ativo	1966-07-01 00:00:00	80.00	2026-07-16 14:26:43.680933-03	{"cpf": "48739642100", "nome": "MARLUCIA FERREIRA DA COSTA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "487.***.***-00", "matricula": "62748", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62748", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "07/01/1966", "salarioLiquido": 80, "situacaoFuncional": ""}
545	2	MICAEL NASCIMENTO PEREIRA	62203098392	62153	ESTATUTARIO	ATIVO	ativo	2002-06-06 00:00:00	0.00	2026-07-16 14:26:47.758561-03	{"cpf": "62203098392", "nome": "MICAEL NASCIMENTO PEREIRA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-92", "matricula": "62153", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62153", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "06/06/2002", "salarioLiquido": 0, "situacaoFuncional": ""}
548	2	MICHELLY TAVEIRA CORREIA	66187044304	1214012	ESTATUTARIO	ATIVO	ativo	1981-12-08 00:00:00	0.00	2026-07-16 14:26:48.716237-03	{"cpf": "66187044304", "nome": "MICHELLY TAVEIRA CORREIA", "cargo": "PROF EDUC BASICA PEB III-1 (100H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "661.***.***-04", "matricula": "1214012", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1214012", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "12/08/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
572	2	PEDRO OTHON NOGUEIRA NETO	44090013372	807001	ESTATUTARIO	ATIVO	ativo	1972-03-07 00:00:00	0.00	2026-07-16 14:27:13.453798-03	{"cpf": "44090013372", "nome": "PEDRO OTHON NOGUEIRA NETO", "cargo": "BIOQUIMICO", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "440.***.***-72", "matricula": "807001", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807001", "dataAdmissao": "02/05/2008", "prefeituraId": 2, "dataNascimento": "03/07/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
579	2	RACHEL JUCA MADRUGA	64966941334	1218247	ESTATUTARIO	ATIVO	ativo	1981-01-08 00:00:00	0.00	2026-07-16 14:27:20.534362-03	{"cpf": "64966941334", "nome": "RACHEL JUCA MADRUGA", "cargo": "DENTISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "649.***.***-34", "matricula": "1218247", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1218247", "dataAdmissao": "10/03/2014", "prefeituraId": 2, "dataNascimento": "01/08/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
130	2	CELIA MOREIRA DE SOUSA	25872591349	804053	ESTATUTARIO	ATIVO	ativo	1963-08-04 00:00:00	0.00	2026-07-16 14:18:09.339201-03	{"cpf": "25872591349", "nome": "CELIA MOREIRA DE SOUSA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "258.***.***-49", "matricula": "804053", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804053", "dataAdmissao": "05/02/1985", "prefeituraId": 2, "dataNascimento": "08/04/1963", "salarioLiquido": 0, "situacaoFuncional": ""}
191	2	FABRICIA ESTEVAO MENEZES	12099251339	62972	ESTATUTARIO	ATIVO	ativo	2007-06-06 00:00:00	0.00	2026-07-16 14:19:30.828139-03	{"cpf": "12099251339", "nome": "FABRICIA ESTEVAO MENEZES", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "120.***.***-39", "matricula": "62972", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62972", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "06/06/2007", "salarioLiquido": 0, "situacaoFuncional": ""}
196	2	FLAVIANA DA SILVA EVANGELISTA SAMPAIO	90131150391	807150	ESTATUTARIO	ATIVO	ativo	1982-09-04 00:00:00	0.00	2026-07-16 14:19:36.938173-03	{"cpf": "90131150391", "nome": "FLAVIANA DA SILVA EVANGELISTA SAMPAIO", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-91", "matricula": "807150", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807150", "dataAdmissao": "01/04/2008", "prefeituraId": 2, "dataNascimento": "09/04/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
198	2	FRANCI FILHO GONCALVES DE FREITAS	40827062320	804584	ESTATUTARIO	ATIVO	ativo	1966-08-06 00:00:00	0.00	2026-07-16 14:19:38.226812-03	{"cpf": "40827062320", "nome": "FRANCI FILHO GONCALVES DE FREITAS", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "408.***.***-20", "matricula": "804584", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804584", "dataAdmissao": "02/01/2001", "prefeituraId": 2, "dataNascimento": "08/06/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
200	2	FRANCILENE QUEIROS LOPES	90131827391	1218174	ESTATUTARIO	ATIVO	ativo	1973-07-11 00:00:00	0.00	2026-07-16 14:19:40.062384-03	{"cpf": "90131827391", "nome": "FRANCILENE QUEIROS LOPES", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-91", "matricula": "1218174", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1218174", "dataAdmissao": "10/03/2014", "prefeituraId": 2, "dataNascimento": "07/11/1973", "salarioLiquido": 0, "situacaoFuncional": ""}
201	2	FRANCINEUDA SANTOS DO NASCIMENTO	77119177320	804916	ESTATUTARIO	ATIVO	ativo	1968-11-11 00:00:00	0.00	2026-07-16 14:19:41.283132-03	{"cpf": "77119177320", "nome": "FRANCINEUDA SANTOS DO NASCIMENTO", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "771.***.***-20", "matricula": "804916", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804916", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "11/11/1968", "salarioLiquido": 0, "situacaoFuncional": ""}
202	2	FRANCINILDO MONTEIRO VIANA	64462374304	1218255	ESTATUTARIO	ATIVO	ativo	1981-04-01 00:00:00	0.00	2026-07-16 14:19:42.473968-03	{"cpf": "64462374304", "nome": "FRANCINILDO MONTEIRO VIANA", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "644.***.***-04", "matricula": "1218255", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1218255", "dataAdmissao": "10/03/2014", "prefeituraId": 2, "dataNascimento": "04/01/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
203	2	FRANCISCA ALESSANDRA ESTEVAO SOBRINHO	61117266338	62674	ESTATUTARIO	ATIVO	ativo	1997-02-08 00:00:00	700.00	2026-07-16 14:19:42.906417-03	{"cpf": "61117266338", "nome": "FRANCISCA ALESSANDRA ESTEVAO SOBRINHO", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "611.***.***-38", "matricula": "62674", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62674", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "02/08/1997", "salarioLiquido": 700, "situacaoFuncional": ""}
206	2	FRANCISCA COSTA DE FREITAS	90134834372	62270	ESTATUTARIO	ATIVO	ativo	1982-07-09 00:00:00	640.00	2026-07-16 14:19:48.563991-03	{"cpf": "90134834372", "nome": "FRANCISCA COSTA DE FREITAS", "cargo": "MONITOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-72", "matricula": "62270", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62270", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/09/1982", "salarioLiquido": 640, "situacaoFuncional": ""}
207	2	FRANCISCA DA CUNHA TAVORA	85401102372	60468	ESTATUTARIO	ATIVO	ativo	1978-04-10 00:00:00	0.00	2026-07-16 14:19:50.538626-03	{"cpf": "85401102372", "nome": "FRANCISCA DA CUNHA TAVORA", "cargo": "PENSIONISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "854.***.***-72", "matricula": "60468", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-60468", "dataAdmissao": "01/01/2024", "prefeituraId": 2, "dataNascimento": "04/10/1978", "salarioLiquido": 0, "situacaoFuncional": ""}
208	2	FRANCISCA DA SILVA EZEQUIEL	90134940300	62230	ESTATUTARIO	ATIVO	ativo	1979-04-11 00:00:00	0.00	2026-07-16 14:19:53.154955-03	{"cpf": "90134940300", "nome": "FRANCISCA DA SILVA EZEQUIEL", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-00", "matricula": "62230", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62230", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "04/11/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
210	2	FRANCISCA EDNA PINHEIRO ROMANO DOS REIS	94077290368	1213881	ESTATUTARIO	ATIVO	ativo	1982-08-10 00:00:00	0.00	2026-07-16 14:19:56.904977-03	{"cpf": "94077290368", "nome": "FRANCISCA EDNA PINHEIRO ROMANO DOS REIS", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "940.***.***-68", "matricula": "1213881", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213881", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "08/10/1982", "salarioLiquido": 0, "situacaoFuncional": ""}
219	2	FRANCISCA NERES DA COSTA	66671256349	62697	ESTATUTARIO	ATIVO	ativo	1981-02-11 00:00:00	700.00	2026-07-16 14:20:09.073305-03	{"cpf": "66671256349", "nome": "FRANCISCA NERES DA COSTA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "666.***.***-49", "matricula": "62697", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62697", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "02/11/1981", "salarioLiquido": 700, "situacaoFuncional": ""}
190	2	FABIO ARAUJO SERGIO	80698174372	806013	ESTATUTARIO	ATIVO	ativo	1980-02-03 00:00:00	0.00	2026-07-16 14:19:29.613994-03	{"cpf": "80698174372", "nome": "FABIO ARAUJO SERGIO", "cargo": "OPERADOR DE COMPUTADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "806.***.***-72", "matricula": "806013", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806013", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "02/03/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
211	2	FRANCISCA ELILDENEIDE DA SILVA AGUIAR	90136489320	62362	ESTATUTARIO	ATIVO	ativo	1981-02-06 00:00:00	350.00	2026-07-16 14:19:57.530765-03	{"cpf": "90136489320", "nome": "FRANCISCA ELILDENEIDE DA SILVA AGUIAR", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-20", "matricula": "62362", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62362", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "02/06/1981", "salarioLiquido": 350, "situacaoFuncional": ""}
214	2	FRANCISCA LEIDIANI ALVES SOARES	11221028367	62891	ESTATUTARIO	ATIVO	ativo	2007-04-10 00:00:00	700.00	2026-07-16 14:20:02.589962-03	{"cpf": "11221028367", "nome": "FRANCISCA LEIDIANI ALVES SOARES", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "112.***.***-67", "matricula": "62891", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62891", "dataAdmissao": "01/04/2026", "prefeituraId": 2, "dataNascimento": "04/10/2007", "salarioLiquido": 700, "situacaoFuncional": ""}
218	2	FRANCISCA NATECIA DOS SANTOS QUEIROZ	62205848305	62665	ESTATUTARIO	ATIVO	ativo	2002-10-09 00:00:00	0.00	2026-07-16 14:20:08.209126-03	{"cpf": "62205848305", "nome": "FRANCISCA NATECIA DOS SANTOS QUEIROZ", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-05", "matricula": "62665", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62665", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "10/09/2002", "salarioLiquido": 0, "situacaoFuncional": ""}
373	2	LETICIA FARIAS ALVES	60862668328	62215	ESTATUTARIO	ATIVO	ativo	1999-03-03 00:00:00	700.00	2026-07-16 14:23:32.864237-03	{"cpf": "60862668328", "nome": "LETICIA FARIAS ALVES", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-28", "matricula": "62215", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62215", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "03/03/1999", "salarioLiquido": 700, "situacaoFuncional": ""}
469	2	MARIA ELENILDA DA SILVA AGUIAR	79572251368	62588	ESTATUTARIO	ATIVO	ativo	1973-03-07 00:00:00	0.00	2026-07-16 14:25:27.239249-03	{"cpf": "79572251368", "nome": "MARIA ELENILDA DA SILVA AGUIAR", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "795.***.***-68", "matricula": "62588", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62588", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "03/07/1973", "salarioLiquido": 0, "situacaoFuncional": ""}
508	2	MARIA MILENA BARROSO DE FREITAS	60862736340	62564	ESTATUTARIO	ATIVO	ativo	1994-06-07 00:00:00	0.00	2026-07-16 14:26:15.32408-03	{"cpf": "60862736340", "nome": "MARIA MILENA BARROSO DE FREITAS", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-40", "matricula": "62564", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62564", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "06/07/1994", "salarioLiquido": 0, "situacaoFuncional": ""}
551	2	MIRELA DA SILVA SOARES	63413763326	62453	ESTATUTARIO	ATIVO	ativo	2006-06-07 00:00:00	350.00	2026-07-16 14:26:51.035527-03	{"cpf": "63413763326", "nome": "MIRELA DA SILVA SOARES", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "634.***.***-26", "matricula": "62453", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62453", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "06/07/2006", "salarioLiquido": 350, "situacaoFuncional": ""}
552	2	MIRIAN MATEUS DE SOUZA	94903760359	1213431	ESTATUTARIO	ATIVO	ativo	1976-10-08 00:00:00	0.00	2026-07-16 14:26:51.515373-03	{"cpf": "94903760359", "nome": "MIRIAN MATEUS DE SOUZA", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "949.***.***-59", "matricula": "1213431", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213431", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "10/08/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
564	2	PATRICIA DA SILVA SARAIVA	87850133315	800430	ESTATUTARIO	ATIVO	ativo	1981-10-02 00:00:00	0.00	2026-07-16 14:27:04.42614-03	{"cpf": "87850133315", "nome": "PATRICIA DA SILVA SARAIVA", "cargo": "ENFERMEIRO - PSF", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "878.***.***-15", "matricula": "800430", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800430", "dataAdmissao": "01/08/2006", "prefeituraId": 2, "dataNascimento": "10/02/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
571	2	PEDRO KLEBER OLIVEIRA COSTA	62202242309	62546	ESTATUTARIO	ATIVO	ativo	2005-07-05 00:00:00	640.00	2026-07-16 14:27:12.572197-03	{"cpf": "62202242309", "nome": "PEDRO KLEBER OLIVEIRA COSTA", "cargo": "MONITOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-09", "matricula": "62546", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62546", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/05/2005", "salarioLiquido": 640, "situacaoFuncional": ""}
573	2	PEDRO ROMULO QUEIROZ RIBEIRO	62203677317	62529	ESTATUTARIO	ATIVO	ativo	2007-03-07 00:00:00	640.00	2026-07-16 14:27:14.473265-03	{"cpf": "62203677317", "nome": "PEDRO ROMULO QUEIROZ RIBEIRO", "cargo": "MONITOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-17", "matricula": "62529", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62529", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "03/07/2007", "salarioLiquido": 640, "situacaoFuncional": ""}
577	2	QUECIA DE FREITAS DO NASCIMENTO	12045685373	62520	ESTATUTARIO	ATIVO	ativo	2007-07-04 00:00:00	640.00	2026-07-16 14:27:17.527539-03	{"cpf": "12045685373", "nome": "QUECIA DE FREITAS DO NASCIMENTO", "cargo": "MONITOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "120.***.***-73", "matricula": "62520", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62520", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/04/2007", "salarioLiquido": 640, "situacaoFuncional": ""}
216	2	FRANCISCA LEONILDA ARAUJO DE OLIVEIRA	87633191368	805149	ESTATUTARIO	ATIVO	ativo	1980-04-01 00:00:00	0.00	2026-07-16 14:20:03.77971-03	{"cpf": "87633191368", "nome": "FRANCISCA LEONILDA ARAUJO DE OLIVEIRA", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "876.***.***-68", "matricula": "805149", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805149", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "04/01/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
223	2	FRANCISCA VITORIA DE MELO DE SOUSA	11016151330	62469	ESTATUTARIO	ATIVO	ativo	2004-05-05 00:00:00	0.00	2026-07-16 14:20:13.605103-03	{"cpf": "11016151330", "nome": "FRANCISCA VITORIA DE MELO DE SOUSA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "110.***.***-30", "matricula": "62469", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62469", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "05/05/2004", "salarioLiquido": 0, "situacaoFuncional": ""}
224	2	FRANCISCO ANISIO DE OLIVEIRA FERREIRA	48094315334	62775	ESTATUTARIO	ATIVO	ativo	1964-02-07 00:00:00	80.00	2026-07-16 14:20:18.680723-03	{"cpf": "48094315334", "nome": "FRANCISCO ANISIO DE OLIVEIRA FERREIRA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "480.***.***-34", "matricula": "62775", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62775", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "02/07/1964", "salarioLiquido": 80, "situacaoFuncional": ""}
229	2	FRANCISCO DE ASSIS PINHEIRO FILHO	36087327304	61046	ESTATUTARIO	ATIVO	ativo	1969-07-12 00:00:00	0.00	2026-07-16 14:20:24.496296-03	{"cpf": "36087327304", "nome": "FRANCISCO DE ASSIS PINHEIRO FILHO", "cargo": "CHEFE DE GABINETE", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "360.***.***-04", "matricula": "61046", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61046", "dataAdmissao": "10/02/2025", "prefeituraId": 2, "dataNascimento": "07/12/1969", "salarioLiquido": 0, "situacaoFuncional": ""}
374	2	LETICIA FREITAS DE ANDRADE	62204581330	62246	ESTATUTARIO	ATIVO	ativo	2001-12-05 00:00:00	0.00	2026-07-16 14:23:33.313334-03	{"cpf": "62204581330", "nome": "LETICIA FREITAS DE ANDRADE", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-30", "matricula": "62246", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62246", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "12/05/2001", "salarioLiquido": 0, "situacaoFuncional": ""}
382	2	LIVIA DA SILVA BEZERRA	10048137324	62315	ESTATUTARIO	ATIVO	ativo	2003-09-08 00:00:00	0.00	2026-07-16 14:23:42.017969-03	{"cpf": "10048137324", "nome": "LIVIA DA SILVA BEZERRA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "100.***.***-24", "matricula": "62315", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62315", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "09/08/2003", "salarioLiquido": 0, "situacaoFuncional": ""}
387	2	LUCIA DE FATIMA FACUNDES DE ALMEIDA	44211791320	803464	ESTATUTARIO	ATIVO	ativo	1963-09-07 00:00:00	0.00	2026-07-16 14:23:50.130504-03	{"cpf": "44211791320", "nome": "LUCIA DE FATIMA FACUNDES DE ALMEIDA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-20", "matricula": "803464", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803464", "dataAdmissao": "01/03/1991", "prefeituraId": 2, "dataNascimento": "09/07/1963", "salarioLiquido": 0, "situacaoFuncional": ""}
391	2	LUCIANA GOMES DOS SANTOS CUNHA	75363852349	802751	ESTATUTARIO	ATIVO	ativo	1975-07-10 00:00:00	0.00	2026-07-16 14:23:53.199149-03	{"cpf": "75363852349", "nome": "LUCIANA GOMES DOS SANTOS CUNHA", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "753.***.***-49", "matricula": "802751", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802751", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "07/10/1975", "salarioLiquido": 0, "situacaoFuncional": ""}
472	2	MARIA ELIANE OLIVEIRA DE MORAIS	82029083372	60470	ESTATUTARIO	ATIVO	ativo	1974-03-02 00:00:00	0.00	2026-07-16 14:25:29.186965-03	{"cpf": "82029083372", "nome": "MARIA ELIANE OLIVEIRA DE MORAIS", "cargo": "PENSIONISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "820.***.***-72", "matricula": "60470", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-60470", "dataAdmissao": "01/01/2025", "prefeituraId": 2, "dataNascimento": "03/02/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
217	2	FRANCISCA LIDUINA FERREIRA	44212003368	802662	ESTATUTARIO	ATIVO	ativo	1970-02-04 00:00:00	0.00	2026-07-16 14:20:04.221469-03	{"cpf": "44212003368", "nome": "FRANCISCA LIDUINA FERREIRA", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-68", "matricula": "802662", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802662", "dataAdmissao": "17/04/1991", "prefeituraId": 2, "dataNascimento": "02/04/1970", "salarioLiquido": 0, "situacaoFuncional": ""}
221	2	FRANCISCA ROSEANE VIANA LIMA	83771719372	806439	ESTATUTARIO	ATIVO	ativo	1979-02-05 00:00:00	0.00	2026-07-16 14:20:11.520999-03	{"cpf": "83771719372", "nome": "FRANCISCA ROSEANE VIANA LIMA", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "837.***.***-72", "matricula": "806439", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806439", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "02/05/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
226	2	FRANCISCO ANTONIO DOS SANTOS DA SILVA	62099761310	62883	ESTATUTARIO	ATIVO	ativo	1986-04-02 00:00:00	80.00	2026-07-16 14:20:19.600201-03	{"cpf": "62099761310", "nome": "FRANCISCO ANTONIO DOS SANTOS DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "620.***.***-10", "matricula": "62883", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62883", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "04/02/1986", "salarioLiquido": 80, "situacaoFuncional": ""}
250	2	FRANCISCO LUCILANE FERNANDES DE SOUZA	90157729320	62746	ESTATUTARIO	ATIVO	ativo	1966-10-09 00:00:00	80.00	2026-07-16 14:20:55.785033-03	{"cpf": "90157729320", "nome": "FRANCISCO LUCILANE FERNANDES DE SOUZA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-20", "matricula": "62746", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62746", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "10/09/1966", "salarioLiquido": 80, "situacaoFuncional": ""}
375	2	LETICIA FREITAS DE ANDRADE	62204581330	62247	ESTATUTARIO	ATIVO	ativo	2001-12-05 00:00:00	0.00	2026-07-16 14:23:33.76232-03	{"cpf": "62204581330", "nome": "LETICIA FREITAS DE ANDRADE", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-30", "matricula": "62247", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62247", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "12/05/2001", "salarioLiquido": 0, "situacaoFuncional": ""}
378	2	LIBIA MARIA BARBOSA CORREIA LIMA	20902310330	805912	ESTATUTARIO	ATIVO	ativo	1952-06-09 00:00:00	0.00	2026-07-16 14:23:36.863471-03	{"cpf": "20902310330", "nome": "LIBIA MARIA BARBOSA CORREIA LIMA", "cargo": "PROF EDUC BASICA PEB III-1 (100H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "209.***.***-30", "matricula": "805912", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805912", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "06/09/1952", "salarioLiquido": 0, "situacaoFuncional": ""}
410	2	MARCELO ANDRADE MENDES	90208013334	1213563	ESTATUTARIO	ATIVO	ativo	1981-04-11 00:00:00	0.00	2026-07-16 14:24:21.347839-03	{"cpf": "90208013334", "nome": "MARCELO ANDRADE MENDES", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-34", "matricula": "1213563", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213563", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "04/11/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
414	2	MARCILIO XAVIER LIMA MARINHO	60101716362	62044	ESTATUTARIO	ATIVO	ativo	1986-12-09 00:00:00	0.00	2026-07-16 14:24:25.090803-03	{"cpf": "60101716362", "nome": "MARCILIO XAVIER LIMA MARINHO", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "601.***.***-62", "matricula": "62044", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62044", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "12/09/1986", "salarioLiquido": 0, "situacaoFuncional": ""}
421	2	MARIA ANGELMA DOS SANTOS DA SILVA	60863111378	62222	ESTATUTARIO	ATIVO	ativo	1998-03-06 00:00:00	0.00	2026-07-16 14:24:33.028347-03	{"cpf": "60863111378", "nome": "MARIA ANGELMA DOS SANTOS DA SILVA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-78", "matricula": "62222", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62222", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "03/06/1998", "salarioLiquido": 0, "situacaoFuncional": ""}
434	2	MARIA DA COSTA CAVALCANTE	79571468304	62508	ESTATUTARIO	ATIVO	ativo	1976-05-08 00:00:00	0.00	2026-07-16 14:24:46.251555-03	{"cpf": "79571468304", "nome": "MARIA DA COSTA CAVALCANTE", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "795.***.***-04", "matricula": "62508", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62508", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "05/08/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
456	2	MARIA DO CARMO LIMA FREITAS ALVES	97379034391	62948	ESTATUTARIO	ATIVO	ativo	1976-10-12 00:00:00	80.00	2026-07-16 14:25:15.425061-03	{"cpf": "97379034391", "nome": "MARIA DO CARMO LIMA FREITAS ALVES", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "973.***.***-91", "matricula": "62948", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62948", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "10/12/1976", "salarioLiquido": 80, "situacaoFuncional": ""}
228	2	FRANCISCO ANTONIO MENDES DE FREITAS	90145631320	62258	ESTATUTARIO	ATIVO	ativo	1975-08-12 00:00:00	0.00	2026-07-16 14:20:21.228585-03	{"cpf": "90145631320", "nome": "FRANCISCO ANTONIO MENDES DE FREITAS", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-20", "matricula": "62258", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62258", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/12/1975", "salarioLiquido": 0, "situacaoFuncional": ""}
234	2	FRANCISCO ERISMILDO SOARES DA COSTA	84308753368	62418	ESTATUTARIO	ATIVO	ativo	1975-06-03 00:00:00	0.00	2026-07-16 14:20:32.448121-03	{"cpf": "84308753368", "nome": "FRANCISCO ERISMILDO SOARES DA COSTA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "843.***.***-68", "matricula": "62418", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62418", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "06/03/1975", "salarioLiquido": 0, "situacaoFuncional": ""}
236	2	FRANCISCO ERIVELTON COSTA SAMPAIO	51090392320	62059	ESTATUTARIO	ATIVO	ativo	1974-05-01 00:00:00	0.00	2026-07-16 14:20:35.190125-03	{"cpf": "51090392320", "nome": "FRANCISCO ERIVELTON COSTA SAMPAIO", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "510.***.***-20", "matricula": "62059", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62059", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "05/01/1974", "salarioLiquido": 0, "situacaoFuncional": ""}
272	2	FRANCISCO WESLEY FREIRE DE OLIVEIRA	10507860330	62937	ESTATUTARIO	ATIVO	ativo	2008-11-05 00:00:00	700.00	2026-07-16 14:21:23.015888-03	{"cpf": "10507860330", "nome": "FRANCISCO WESLEY FREIRE DE OLIVEIRA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "105.***.***-30", "matricula": "62937", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62937", "dataAdmissao": "12/05/2026", "prefeituraId": 2, "dataNascimento": "11/05/2008", "salarioLiquido": 700, "situacaoFuncional": ""}
377	2	LEVY ITHALO ALVES DE PAULA	10362117381	62906	ESTATUTARIO	ATIVO	ativo	2007-01-12 00:00:00	0.00	2026-07-16 14:23:35.433969-03	{"cpf": "10362117381", "nome": "LEVY ITHALO ALVES DE PAULA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "103.***.***-81", "matricula": "62906", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62906", "dataAdmissao": "01/04/2026", "prefeituraId": 2, "dataNascimento": "01/12/2007", "salarioLiquido": 0, "situacaoFuncional": ""}
379	2	LIDIANE BATISTA PINTO	90197690300	62296	ESTATUTARIO	ATIVO	ativo	1983-02-09 00:00:00	0.00	2026-07-16 14:23:38.551422-03	{"cpf": "90197690300", "nome": "LIDIANE BATISTA PINTO", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-00", "matricula": "62296", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62296", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "02/09/1983", "salarioLiquido": 0, "situacaoFuncional": ""}
471	2	MARIA ELIANA MARTINS DA SILVA	76270556368	803758	ESTATUTARIO	ATIVO	ativo	1975-10-08 00:00:00	0.00	2026-07-16 14:25:28.746884-03	{"cpf": "76270556368", "nome": "MARIA ELIANA MARTINS DA SILVA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "762.***.***-68", "matricula": "803758", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803758", "dataAdmissao": "01/04/2008", "prefeituraId": 2, "dataNascimento": "10/08/1975", "salarioLiquido": 0, "situacaoFuncional": ""}
473	2	MARIA ELIANE OLIVEIRA DE MORAIS	82029083372	62716	ESTATUTARIO	ATIVO	ativo	1974-03-02 00:00:00	700.00	2026-07-16 14:25:29.636133-03	{"cpf": "82029083372", "nome": "MARIA ELIANE OLIVEIRA DE MORAIS", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "820.***.***-72", "matricula": "62716", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62716", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "03/02/1974", "salarioLiquido": 700, "situacaoFuncional": ""}
544	2	MICAEL NASCIMENTO PEREIRA	62203098392	62152	ESTATUTARIO	ATIVO	ativo	2002-06-06 00:00:00	0.00	2026-07-16 14:26:45.934247-03	{"cpf": "62203098392", "nome": "MICAEL NASCIMENTO PEREIRA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-92", "matricula": "62152", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62152", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "06/06/2002", "salarioLiquido": 0, "situacaoFuncional": ""}
550	2	MIGUEL WILIAM DA SILVA SANTOS	62203714379	1995928	ESTATUTARIO	ATIVO	ativo	2008-12-01 00:00:00	150.00	2026-07-16 14:26:50.595728-03	{"cpf": "62203714379", "nome": "MIGUEL WILIAM DA SILVA SANTOS", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-79", "matricula": "1995928", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1995928", "dataAdmissao": "01/03/2023", "prefeituraId": 2, "dataNascimento": "12/01/2008", "salarioLiquido": 150, "situacaoFuncional": ""}
553	2	MONICA PINTO DE ABREU	78413648300	62084	ESTATUTARIO	ATIVO	ativo	1977-11-06 00:00:00	0.00	2026-07-16 14:26:53.228889-03	{"cpf": "78413648300", "nome": "MONICA PINTO DE ABREU", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "784.***.***-00", "matricula": "62084", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62084", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "11/06/1977", "salarioLiquido": 0, "situacaoFuncional": ""}
567	2	PAULINO DE MENEZES RODRIGUES	36087424334	805041	ESTATUTARIO	ATIVO	ativo	1968-12-05 00:00:00	0.00	2026-07-16 14:27:07.361411-03	{"cpf": "36087424334", "nome": "PAULINO DE MENEZES RODRIGUES", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "360.***.***-34", "matricula": "805041", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805041", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "12/05/1968", "salarioLiquido": 0, "situacaoFuncional": ""}
574	2	PRISCILA FERREIRA VASCONCELOS	95124497300	1214055	ESTATUTARIO	ATIVO	ativo	1984-01-08 00:00:00	0.00	2026-07-16 14:27:15.705489-03	{"cpf": "95124497300", "nome": "PRISCILA FERREIRA VASCONCELOS", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "951.***.***-00", "matricula": "1214055", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1214055", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "01/08/1984", "salarioLiquido": 0, "situacaoFuncional": ""}
192	2	FAGNER MARTINS DOS SANTOS	64350045368	62720	ESTATUTARIO	ATIVO	ativo	1980-04-11 00:00:00	0.00	2026-07-16 14:19:31.562188-03	{"cpf": "64350045368", "nome": "FAGNER MARTINS DOS SANTOS", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "643.***.***-68", "matricula": "62720", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62720", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "04/11/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
239	2	FRANCISCO JERONIMO DE FREITAS	82004374349	804258	ESTATUTARIO	ATIVO	ativo	1967-08-02 00:00:00	0.00	2026-07-16 14:20:44.968048-03	{"cpf": "82004374349", "nome": "FRANCISCO JERONIMO DE FREITAS", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "820.***.***-49", "matricula": "804258", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804258", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "08/02/1967", "salarioLiquido": 0, "situacaoFuncional": ""}
241	2	FRANCISCO JOSE ALMEIDA FERNANDES	46995552334	804142	ESTATUTARIO	ATIVO	ativo	1970-08-10 00:00:00	0.00	2026-07-16 14:20:46.838852-03	{"cpf": "46995552334", "nome": "FRANCISCO JOSE ALMEIDA FERNANDES", "cargo": "PROF EDUC BASICA PEB III-MESTRE (100H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "469.***.***-34", "matricula": "804142", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804142", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "08/10/1970", "salarioLiquido": 0, "situacaoFuncional": ""}
244	2	FRANCISCO JUNIOR ANDRADE	44211414372	803529	ESTATUTARIO	ATIVO	ativo	1972-07-12 00:00:00	0.00	2026-07-16 14:20:49.53303-03	{"cpf": "44211414372", "nome": "FRANCISCO JUNIOR ANDRADE", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-72", "matricula": "803529", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803529", "dataAdmissao": "18/02/1999", "prefeituraId": 2, "dataNascimento": "07/12/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
247	2	FRANCISCO KAYK MARTINS DA SILVA	10957513364	62527	ESTATUTARIO	ATIVO	ativo	2007-08-11 00:00:00	700.00	2026-07-16 14:20:50.397427-03	{"cpf": "10957513364", "nome": "FRANCISCO KAYK MARTINS DA SILVA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "109.***.***-64", "matricula": "62527", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62527", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/11/2007", "salarioLiquido": 700, "situacaoFuncional": ""}
258	2	FRANCISCO ROBERVAN CORDEIRO SILVEIRA	62838848305	62108	ESTATUTARIO	ATIVO	ativo	1996-07-02 00:00:00	0.00	2026-07-16 14:21:06.945196-03	{"cpf": "62838848305", "nome": "FRANCISCO ROBERVAN CORDEIRO SILVEIRA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "628.***.***-05", "matricula": "62108", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62108", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "07/02/1996", "salarioLiquido": 0, "situacaoFuncional": ""}
262	2	FRANCISCO UEUDES DE ARAUJO PEREIRA	58490868387	805580	ESTATUTARIO	ATIVO	ativo	1976-12-02 00:00:00	0.00	2026-07-16 14:21:12.976757-03	{"cpf": "58490868387", "nome": "FRANCISCO UEUDES DE ARAUJO PEREIRA", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "584.***.***-87", "matricula": "805580", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805580", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "12/02/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
263	2	FRANCISCO VALDIZIO PEREIRA LEANDRO	77123344391	804428	ESTATUTARIO	ATIVO	ativo	1977-03-06 00:00:00	0.00	2026-07-16 14:21:13.898947-03	{"cpf": "77123344391", "nome": "FRANCISCO VALDIZIO PEREIRA LEANDRO", "cargo": "OPERADOR DE COMPUTADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "771.***.***-91", "matricula": "804428", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804428", "dataAdmissao": "01/04/2008", "prefeituraId": 2, "dataNascimento": "03/06/1977", "salarioLiquido": 0, "situacaoFuncional": ""}
268	2	FRANCISCO WELLINGTON DE LIMA ALVES	90162749368	805572	ESTATUTARIO	ATIVO	ativo	1982-10-07 00:00:00	150.00	2026-07-16 14:21:19.55418-03	{"cpf": "90162749368", "nome": "FRANCISCO WELLINGTON DE LIMA ALVES", "cargo": "APRENDIZ DE MUSICA/BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "901.***.***-68", "matricula": "805572", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805572", "dataAdmissao": "01/09/2005", "prefeituraId": 2, "dataNascimento": "10/07/1982", "salarioLiquido": 150, "situacaoFuncional": ""}
322	2	JOSE ARNOLDO SILVEIRA LIMA	18662170382	802794	ESTATUTARIO	ATIVO	ativo	1954-06-08 00:00:00	0.00	2026-07-16 14:22:36.406795-03	{"cpf": "18662170382", "nome": "JOSE ARNOLDO SILVEIRA LIMA", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "186.***.***-82", "matricula": "802794", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802794", "dataAdmissao": "25/08/1992", "prefeituraId": 2, "dataNascimento": "06/08/1954", "salarioLiquido": 0, "situacaoFuncional": ""}
380	2	LIDIANE NASCIMENTO GOMES	79569854391	804100	ESTATUTARIO	ATIVO	ativo	1979-08-10 00:00:00	0.00	2026-07-16 14:23:38.996714-03	{"cpf": "79569854391", "nome": "LIDIANE NASCIMENTO GOMES", "cargo": "PROF EDUC BASICA PEB III-1 (100H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "795.***.***-91", "matricula": "804100", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804100", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "08/10/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
243	2	FRANCISCO JOSE HONORATO DE ABREU	48238392187	802328	ESTATUTARIO	ATIVO	ativo	1966-06-10 00:00:00	0.00	2026-07-16 14:20:49.090387-03	{"cpf": "48238392187", "nome": "FRANCISCO JOSE HONORATO DE ABREU", "cargo": "GARI", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "482.***.***-87", "matricula": "802328", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802328", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "06/10/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
249	2	FRANCISCO LIMA DA SILVA	60861669355	62020	ESTATUTARIO	ATIVO	ativo	1996-01-06 00:00:00	0.00	2026-07-16 14:20:52.037125-03	{"cpf": "60861669355", "nome": "FRANCISCO LIMA DA SILVA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-55", "matricula": "62020", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62020", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "01/06/1996", "salarioLiquido": 0, "situacaoFuncional": ""}
256	2	FRANCISCO RENATO SOUSA CAVALCANTE	64010554304	800392	ESTATUTARIO	ATIVO	ativo	1981-01-12 00:00:00	0.00	2026-07-16 14:21:05.132114-03	{"cpf": "64010554304", "nome": "FRANCISCO RENATO SOUSA CAVALCANTE", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "640.***.***-04", "matricula": "800392", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800392", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "01/12/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
257	2	FRANCISCO ROBERTO MARTINS MENEZES	72003677372	62661	ESTATUTARIO	ATIVO	ativo	1967-05-10 00:00:00	0.00	2026-07-16 14:21:06.502406-03	{"cpf": "72003677372", "nome": "FRANCISCO ROBERTO MARTINS MENEZES", "cargo": "SEC MUNICIPAL DE GOVERNO", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "720.***.***-72", "matricula": "62661", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62661", "dataAdmissao": "11/02/2026", "prefeituraId": 2, "dataNascimento": "05/10/1967", "salarioLiquido": 0, "situacaoFuncional": ""}
269	2	FRANCISCO WELLINGTON SOARES DUARTE	98960970387	62915	ESTATUTARIO	ATIVO	ativo	1975-11-11 00:00:00	80.00	2026-07-16 14:21:20.269171-03	{"cpf": "98960970387", "nome": "FRANCISCO WELLINGTON SOARES DUARTE", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "989.***.***-87", "matricula": "62915", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62915", "dataAdmissao": "02/04/2026", "prefeituraId": 2, "dataNascimento": "11/11/1975", "salarioLiquido": 80, "situacaoFuncional": ""}
385	2	LOURDINHA ARAUJO	81029560382	800325	ESTATUTARIO	ATIVO	ativo	1979-01-07 00:00:00	0.00	2026-07-16 14:23:45.911897-03	{"cpf": "81029560382", "nome": "LOURDINHA ARAUJO", "cargo": "AGENTE ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "810.***.***-82", "matricula": "800325", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800325", "dataAdmissao": "01/02/2000", "prefeituraId": 2, "dataNascimento": "01/07/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
398	2	LUZIA ALVES DA SILVA	66548896300	61068	ESTATUTARIO	ATIVO	ativo	1981-11-05 00:00:00	0.00	2026-07-16 14:24:06.546211-03	{"cpf": "66548896300", "nome": "LUZIA ALVES DA SILVA", "cargo": "DIR UNIDADE ESCOLAR FGE-1", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "665.***.***-00", "matricula": "61068", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61068", "dataAdmissao": "03/02/2025", "prefeituraId": 2, "dataNascimento": "11/05/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
416	2	MARDENIR MARIA DOS SANTOS FARIAS	44211759353	800139	ESTATUTARIO	ATIVO	ativo	1967-10-11 00:00:00	0.00	2026-07-16 14:24:26.384825-03	{"cpf": "44211759353", "nome": "MARDENIR MARIA DOS SANTOS FARIAS", "cargo": "AUX ESCRITURARIO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-53", "matricula": "800139", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800139", "dataAdmissao": "01/03/1991", "prefeituraId": 2, "dataNascimento": "10/11/1967", "salarioLiquido": 0, "situacaoFuncional": ""}
426	2	MARIA CLARA DA SILVA DOS SANTOS	11902158377	62181	ESTATUTARIO	ATIVO	ativo	2006-11-08 00:00:00	0.00	2026-07-16 14:24:41.913668-03	{"cpf": "11902158377", "nome": "MARIA CLARA DA SILVA DOS SANTOS", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "119.***.***-77", "matricula": "62181", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62181", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "11/08/2006", "salarioLiquido": 0, "situacaoFuncional": ""}
444	2	MARIA DE FATIMA DE SOUSA DUTRA	91994527315	62969	ESTATUTARIO	ATIVO	ativo	1969-06-10 00:00:00	80.00	2026-07-16 14:24:58.69307-03	{"cpf": "91994527315", "nome": "MARIA DE FATIMA DE SOUSA DUTRA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "919.***.***-15", "matricula": "62969", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62969", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "06/10/1969", "salarioLiquido": 80, "situacaoFuncional": ""}
458	2	MARIA DO SOCORRO ALMEIDA DE LIMA	75023610306	803642	ESTATUTARIO	ATIVO	ativo	1972-04-11 00:00:00	0.00	2026-07-16 14:25:16.714015-03	{"cpf": "75023610306", "nome": "MARIA DO SOCORRO ALMEIDA DE LIMA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "750.***.***-06", "matricula": "803642", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803642", "dataAdmissao": "02/08/1999", "prefeituraId": 2, "dataNascimento": "04/11/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
476	2	MARIA ELINETE SARAIVA FERNANDES	96997540368	62195	ESTATUTARIO	ATIVO	ativo	1981-07-09 00:00:00	0.00	2026-07-16 14:25:32.403367-03	{"cpf": "96997540368", "nome": "MARIA ELINETE SARAIVA FERNANDES", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "969.***.***-68", "matricula": "62195", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62195", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "07/09/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
514	2	MARIA OZIANI COELHO MATIAS	54921716315	805173	ESTATUTARIO	ATIVO	ativo	1972-01-09 00:00:00	0.00	2026-07-16 14:26:21.810384-03	{"cpf": "54921716315", "nome": "MARIA OZIANI COELHO MATIAS", "cargo": "AUX DE ENFERMAGEM AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "549.***.***-15", "matricula": "805173", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805173", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "01/09/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
523	2	MARIA RAQUEL SOUSA BRITO	60862077397	62934	ESTATUTARIO	ATIVO	ativo	1997-12-03 00:00:00	0.00	2026-07-16 14:26:28.352957-03	{"cpf": "60862077397", "nome": "MARIA RAQUEL SOUSA BRITO", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "608.***.***-97", "matricula": "62934", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62934", "dataAdmissao": "11/05/2026", "prefeituraId": 2, "dataNascimento": "12/03/1997", "salarioLiquido": 0, "situacaoFuncional": ""}
525	2	MARIA ROSANGELA DE FRANCA LIMA	44212461315	1227629	ESTATUTARIO	ATIVO	ativo	1972-02-02 00:00:00	0.00	2026-07-16 14:26:30.167255-03	{"cpf": "44212461315", "nome": "MARIA ROSANGELA DE FRANCA LIMA", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-15", "matricula": "1227629", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1227629", "dataAdmissao": "01/07/2016", "prefeituraId": 2, "dataNascimento": "02/02/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
529	2	MARIA SALETE PEREIRA TAVORA	42674832304	801704	ESTATUTARIO	ATIVO	ativo	1952-11-05 00:00:00	0.00	2026-07-16 14:26:32.509042-03	{"cpf": "42674832304", "nome": "MARIA SALETE PEREIRA TAVORA", "cargo": "ZELADOR - AG1", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "426.***.***-04", "matricula": "801704", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-801704", "dataAdmissao": "29/11/1990", "prefeituraId": 2, "dataNascimento": "11/05/1952", "salarioLiquido": 0, "situacaoFuncional": ""}
586	2	RAIMUNDO BARROSO DE OLIVEIRA	23579447300	62862	ESTATUTARIO	ATIVO	ativo	1965-04-03 00:00:00	80.00	2026-07-16 14:27:24.776247-03	{"cpf": "23579447300", "nome": "RAIMUNDO BARROSO DE OLIVEIRA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "235.***.***-00", "matricula": "62862", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62862", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "04/03/1965", "salarioLiquido": 80, "situacaoFuncional": ""}
590	2	RAIMUNDO MOREIRA FILHO	45218650110	805050	ESTATUTARIO	ATIVO	ativo	1966-02-02 00:00:00	0.00	2026-07-16 14:27:37.217383-03	{"cpf": "45218650110", "nome": "RAIMUNDO MOREIRA FILHO", "cargo": "OPER MAQUINA PESADA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "452.***.***-10", "matricula": "805050", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805050", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "02/02/1966", "salarioLiquido": 0, "situacaoFuncional": ""}
593	2	RAIMUNDO NONATO NUNES ALVES	44212186349	806269	ESTATUTARIO	ATIVO	ativo	1963-04-04 00:00:00	0.00	2026-07-16 14:27:43.920284-03	{"cpf": "44212186349", "nome": "RAIMUNDO NONATO NUNES ALVES", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "442.***.***-49", "matricula": "806269", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806269", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "04/04/1963", "salarioLiquido": 0, "situacaoFuncional": ""}
594	2	RAIMUNDO NONATO SARAIVA FARIAS JUNIOR	87928558300	806994	ESTATUTARIO	ATIVO	ativo	1979-03-08 00:00:00	0.00	2026-07-16 14:27:44.908354-03	{"cpf": "87928558300", "nome": "RAIMUNDO NONATO SARAIVA FARIAS JUNIOR", "cargo": "OPERADOR DE COMPUTADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "879.***.***-00", "matricula": "806994", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806994", "dataAdmissao": "03/03/2008", "prefeituraId": 2, "dataNascimento": "03/08/1979", "salarioLiquido": 0, "situacaoFuncional": ""}
596	2	RAINARA DOS SANTOS NOGUEIRA	10266009360	62236	ESTATUTARIO	ATIVO	ativo	2002-11-05 00:00:00	350.00	2026-07-16 14:27:48.385615-03	{"cpf": "10266009360", "nome": "RAINARA DOS SANTOS NOGUEIRA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "102.***.***-60", "matricula": "62236", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62236", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "11/05/2002", "salarioLiquido": 350, "situacaoFuncional": ""}
597	2	RAYANE DOS SANTOS SILVA	63470347352	62101	ESTATUTARIO	ATIVO	ativo	2004-06-06 00:00:00	0.00	2026-07-16 14:27:49.10292-03	{"cpf": "63470347352", "nome": "RAYANE DOS SANTOS SILVA", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "634.***.***-52", "matricula": "62101", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62101", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "06/06/2004", "salarioLiquido": 0, "situacaoFuncional": ""}
598	2	RAYANNE DE ARAUJO DA SILVA	62203539356	62625	ESTATUTARIO	ATIVO	ativo	2007-10-09 00:00:00	350.00	2026-07-16 14:27:49.546133-03	{"cpf": "62203539356", "nome": "RAYANNE DE ARAUJO DA SILVA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "622.***.***-56", "matricula": "62625", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62625", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "10/09/2007", "salarioLiquido": 350, "situacaoFuncional": ""}
599	2	RAYSSA LARA SOUSA CORREIA	63413352377	62632	ESTATUTARIO	ATIVO	ativo	2006-02-03 00:00:00	0.00	2026-07-16 14:27:50.259412-03	{"cpf": "63413352377", "nome": "RAYSSA LARA SOUSA CORREIA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "634.***.***-77", "matricula": "62632", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62632", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "02/03/2006", "salarioLiquido": 0, "situacaoFuncional": ""}
600	2	RAYSSA VITORIA FERREIRA ROMANO	10231631367	62611	ESTATUTARIO	ATIVO	ativo	2005-04-06 00:00:00	700.00	2026-07-16 14:27:51.699634-03	{"cpf": "10231631367", "nome": "RAYSSA VITORIA FERREIRA ROMANO", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "102.***.***-67", "matricula": "62611", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62611", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "04/06/2005", "salarioLiquido": 700, "situacaoFuncional": ""}
603	2	REGINALDO REGES PEREIRA LIMA	50992368391	800236	ESTATUTARIO	ATIVO	ativo	1963-04-04 00:00:00	0.00	2026-07-16 14:27:54.435822-03	{"cpf": "50992368391", "nome": "REGINALDO REGES PEREIRA LIMA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "509.***.***-91", "matricula": "800236", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-800236", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "04/04/1963", "salarioLiquido": 0, "situacaoFuncional": ""}
635	2	SANDRA MARIA DOS SANTOS	88704300300	62425	ESTATUTARIO	ATIVO	ativo	1974-06-12 00:00:00	640.00	2026-07-16 14:28:29.718617-03	{"cpf": "88704300300", "nome": "SANDRA MARIA DOS SANTOS", "cargo": "MONITOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "887.***.***-00", "matricula": "62425", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62425", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "06/12/1974", "salarioLiquido": 640, "situacaoFuncional": ""}
650	2	TALVANIO MEDEIROS DOS SANTOS	76072258387	62401	ESTATUTARIO	ATIVO	ativo	1976-11-08 00:00:00	0.00	2026-07-16 14:28:48.970663-03	{"cpf": "76072258387", "nome": "TALVANIO MEDEIROS DOS SANTOS", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "760.***.***-87", "matricula": "62401", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62401", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "11/08/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
589	2	RAIMUNDO MARQUES NOGUEIRA MARCOLINO	26303540325	801798	ESTATUTARIO	ATIVO	ativo	1964-06-09 00:00:00	0.00	2026-07-16 14:27:36.771844-03	{"cpf": "26303540325", "nome": "RAIMUNDO MARQUES NOGUEIRA MARCOLINO", "cargo": "COORD SUP PEDAGOGICO", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "263.***.***-25", "matricula": "801798", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-801798", "dataAdmissao": "15/04/1986", "prefeituraId": 2, "dataNascimento": "06/09/1964", "salarioLiquido": 0, "situacaoFuncional": ""}
605	2	REGINALDO SILVA COSTA	89081919334	912930	ESTATUTARIO	ATIVO	ativo	1980-04-01 00:00:00	0.00	2026-07-16 14:27:54.879377-03	{"cpf": "89081919334", "nome": "REGINALDO SILVA COSTA", "cargo": "PROF EDUC BASICA PEB III-1 (200H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "890.***.***-34", "matricula": "912930", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-912930", "dataAdmissao": "03/08/2009", "prefeituraId": 2, "dataNascimento": "04/01/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
614	2	RITA HELENA FERREIRA LOPES	90274067315	62968	ESTATUTARIO	ATIVO	ativo	1967-06-12 00:00:00	80.00	2026-07-16 14:28:02.653677-03	{"cpf": "90274067315", "nome": "RITA HELENA FERREIRA LOPES", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-15", "matricula": "62968", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62968", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "06/12/1967", "salarioLiquido": 80, "situacaoFuncional": ""}
622	2	ROBSON VIANA BATISTA	11231255382	62326	ESTATUTARIO	ATIVO	ativo	2005-05-09 00:00:00	0.00	2026-07-16 14:28:13.043232-03	{"cpf": "11231255382", "nome": "ROBSON VIANA BATISTA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "112.***.***-82", "matricula": "62326", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62326", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "05/09/2005", "salarioLiquido": 0, "situacaoFuncional": ""}
652	2	TAYNA OLIVEIRA DA SILVA	10305074300	62970	ESTATUTARIO	ATIVO	ativo	2008-05-03 00:00:00	700.00	2026-07-16 14:28:51.182581-03	{"cpf": "10305074300", "nome": "TAYNA OLIVEIRA DA SILVA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "103.***.***-00", "matricula": "62970", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62970", "dataAdmissao": "01/06/2026", "prefeituraId": 2, "dataNascimento": "05/03/2008", "salarioLiquido": 700, "situacaoFuncional": ""}
663	2	VIRGILIO BEZERRA DA CUNHA	31873324391	804479	ESTATUTARIO	ATIVO	ativo	1962-05-10 00:00:00	0.00	2026-07-16 14:29:01.826898-03	{"cpf": "31873324391", "nome": "VIRGILIO BEZERRA DA CUNHA", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "318.***.***-91", "matricula": "804479", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804479", "dataAdmissao": "04/05/1998", "prefeituraId": 2, "dataNascimento": "05/10/1962", "salarioLiquido": 0, "situacaoFuncional": ""}
669	2	WEUVIS VIANA MATEUS	44537286890	62727	ESTATUTARIO	ATIVO	ativo	1991-10-09 00:00:00	0.00	2026-07-16 14:29:07.73419-03	{"cpf": "44537286890", "nome": "WEUVIS VIANA MATEUS", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "445.***.***-90", "matricula": "62727", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62727", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "10/09/1991", "salarioLiquido": 0, "situacaoFuncional": ""}
611	2	RICARDO MARTINS DA SILVA	90273010344	62882	ESTATUTARIO	ATIVO	ativo	1979-09-11 00:00:00	80.00	2026-07-16 14:28:01.633226-03	{"cpf": "90273010344", "nome": "RICARDO MARTINS DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-44", "matricula": "62882", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62882", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "09/11/1979", "salarioLiquido": 80, "situacaoFuncional": ""}
616	2	RITA LUCAS DA SILVA	90274180391	62850	ESTATUTARIO	ATIVO	ativo	1970-04-03 00:00:00	80.00	2026-07-16 14:28:03.940102-03	{"cpf": "90274180391", "nome": "RITA LUCAS DA SILVA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-91", "matricula": "62850", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62850", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "04/03/1970", "salarioLiquido": 80, "situacaoFuncional": ""}
620	2	ROBERIO BATISTA DA COSTA	11996824384	62532	ESTATUTARIO	ATIVO	ativo	2008-01-01 00:00:00	700.00	2026-07-16 14:28:08.454865-03	{"cpf": "11996824384", "nome": "ROBERIO BATISTA DA COSTA", "cargo": "CUIDADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "119.***.***-84", "matricula": "62532", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62532", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "01/01/2008", "salarioLiquido": 700, "situacaoFuncional": ""}
621	2	ROBERTO SARAIVA ARAUJO	90275632334	806625	ESTATUTARIO	ATIVO	ativo	1983-03-06 00:00:00	0.00	2026-07-16 14:28:11.352853-03	{"cpf": "90275632334", "nome": "ROBERTO SARAIVA ARAUJO", "cargo": "PROF EDUC BASICA PEB III-MESTRE (100H)", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-34", "matricula": "806625", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-806625", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "03/06/1983", "salarioLiquido": 0, "situacaoFuncional": ""}
639	2	SEBASTIANA DE LIMA	38926946304	802719	ESTATUTARIO	ATIVO	ativo	1963-03-01 00:00:00	0.00	2026-07-16 14:28:34.839131-03	{"cpf": "38926946304", "nome": "SEBASTIANA DE LIMA", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "389.***.***-04", "matricula": "802719", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-802719", "dataAdmissao": "01/07/1989", "prefeituraId": 2, "dataNascimento": "03/01/1963", "salarioLiquido": 0, "situacaoFuncional": ""}
654	2	TEREZA ALVES FREIRE	25839144304	803286	ESTATUTARIO	ATIVO	ativo	1965-02-06 00:00:00	0.00	2026-07-16 14:28:51.62316-03	{"cpf": "25839144304", "nome": "TEREZA ALVES FREIRE", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "258.***.***-04", "matricula": "803286", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-803286", "dataAdmissao": "01/10/1999", "prefeituraId": 2, "dataNascimento": "02/06/1965", "salarioLiquido": 0, "situacaoFuncional": ""}
657	2	VANUSA QUEIROZ CASSEMIRO	90287177300	61986	ESTATUTARIO	ATIVO	ativo	1981-03-07 00:00:00	0.00	2026-07-16 14:28:57.336241-03	{"cpf": "90287177300", "nome": "VANUSA QUEIROZ CASSEMIRO", "cargo": "ORIENTADOR SOCIAL", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-00", "matricula": "61986", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61986", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "03/07/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
659	2	VERIDIANA PAULO DA SILVA ALVES	41589165349	62537	ESTATUTARIO	ATIVO	ativo	1971-04-09 00:00:00	0.00	2026-07-16 14:28:58.27787-03	{"cpf": "41589165349", "nome": "VERIDIANA PAULO DA SILVA ALVES", "cargo": "PROFESSOR EDUC BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "415.***.***-49", "matricula": "62537", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62537", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "04/09/1971", "salarioLiquido": 0, "situacaoFuncional": ""}
667	2	WANDENBERG LIMA DA SILVA	88716007387	1213270	ESTATUTARIO	ATIVO	ativo	1980-08-08 00:00:00	0.00	2026-07-16 14:29:04.14266-03	{"cpf": "88716007387", "nome": "WANDENBERG LIMA DA SILVA", "cargo": "MOTORISTA AA-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "887.***.***-87", "matricula": "1213270", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-1213270", "dataAdmissao": "14/08/2013", "prefeituraId": 2, "dataNascimento": "08/08/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
562	2	OSMILDA FRANCELINO BEZERRA	68242115320	804045	ESTATUTARIO	ATIVO	ativo	1972-12-12 00:00:00	0.00	2026-07-16 14:27:03.231634-03	{"cpf": "68242115320", "nome": "OSMILDA FRANCELINO BEZERRA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "682.***.***-20", "matricula": "804045", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-804045", "dataAdmissao": "03/08/1998", "prefeituraId": 2, "dataNascimento": "12/12/1972", "salarioLiquido": 0, "situacaoFuncional": ""}
656	2	UBIRAJARA NETO SERGIO ARAUJO	90284747300	805947	ESTATUTARIO	ATIVO	ativo	1981-01-10 00:00:00	0.00	2026-07-16 14:28:53.371762-03	{"cpf": "90284747300", "nome": "UBIRAJARA NETO SERGIO ARAUJO", "cargo": "OPERADOR DE COMPUTADOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-00", "matricula": "805947", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-805947", "dataAdmissao": "03/12/2007", "prefeituraId": 2, "dataNascimento": "01/10/1981", "salarioLiquido": 0, "situacaoFuncional": ""}
580	2	RAIMUNDA DE SOUZA DAMIAO	90266188320	807397	ESTATUTARIO	ATIVO	ativo	1980-04-12 00:00:00	0.00	2026-07-16 14:27:22.46887-03	{"cpf": "90266188320", "nome": "RAIMUNDA DE SOUZA DAMIAO", "cargo": "TECNICO DE ENFERMAGEM", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "902.***.***-20", "matricula": "807397", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-807397", "dataAdmissao": "02/05/2008", "prefeituraId": 2, "dataNascimento": "04/12/1980", "salarioLiquido": 0, "situacaoFuncional": ""}
625	2	ROMARIO MARTINS DA SILVA	60740705393	62050	ESTATUTARIO	ATIVO	ativo	1993-03-09 00:00:00	0.00	2026-07-16 14:28:14.436432-03	{"cpf": "60740705393", "nome": "ROMARIO MARTINS DA SILVA", "cargo": "AUX ADMINISTRATIVO AD-I", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "607.***.***-93", "matricula": "62050", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62050", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "03/09/1993", "salarioLiquido": 0, "situacaoFuncional": ""}
634	2	SANDRA DE CASTRO LIMA	82692300149	62736	ESTATUTARIO	ATIVO	ativo	1970-05-05 00:00:00	80.00	2026-07-16 14:28:29.06176-03	{"cpf": "82692300149", "nome": "SANDRA DE CASTRO LIMA", "cargo": "BOLSISTA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "826.***.***-49", "matricula": "62736", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62736", "dataAdmissao": "02/03/2026", "prefeituraId": 2, "dataNascimento": "05/05/1970", "salarioLiquido": 80, "situacaoFuncional": ""}
643	2	SOLANGE EDUARDO DA SILVA	81500769304	62630	ESTATUTARIO	ATIVO	ativo	1978-04-07 00:00:00	0.00	2026-07-16 14:28:44.543615-03	{"cpf": "81500769304", "nome": "SOLANGE EDUARDO DA SILVA", "cargo": "MERENDEIRA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "815.***.***-04", "matricula": "62630", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62630", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "04/07/1978", "salarioLiquido": 0, "situacaoFuncional": ""}
648	2	TALIA DO NASCIMENTO DA SILVA	12015276351	62724	ESTATUTARIO	ATIVO	ativo	2008-05-03 00:00:00	350.00	2026-07-16 14:28:48.529712-03	{"cpf": "12015276351", "nome": "TALIA DO NASCIMENTO DA SILVA", "cargo": "MONITOR", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "120.***.***-51", "matricula": "62724", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62724", "dataAdmissao": "06/03/2026", "prefeituraId": 2, "dataNascimento": "05/03/2008", "salarioLiquido": 350, "situacaoFuncional": ""}
651	2	TAMIRES DO NASCIMENTO RODRIGUES	61146438362	60936	ESTATUTARIO	ATIVO	ativo	1996-07-04 00:00:00	0.00	2026-07-16 14:28:50.350074-03	{"cpf": "61146438362", "nome": "TAMIRES DO NASCIMENTO RODRIGUES", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "611.***.***-62", "matricula": "60936", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-60936", "dataAdmissao": "03/02/2025", "prefeituraId": 2, "dataNascimento": "07/04/1996", "salarioLiquido": 0, "situacaoFuncional": ""}
660	2	VERONICA DE SOUSA SANTOS	76233600359	61980	ESTATUTARIO	ATIVO	ativo	1976-11-04 00:00:00	0.00	2026-07-16 14:28:58.705382-03	{"cpf": "76233600359", "nome": "VERONICA DE SOUSA SANTOS", "cargo": "AGENTE DE SAUDE", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "762.***.***-59", "matricula": "61980", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-61980", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "11/04/1976", "salarioLiquido": 0, "situacaoFuncional": ""}
664	2	VIVIAN KESSIA FAUSTO DE SOUZA	62087963347	62489	ESTATUTARIO	ATIVO	ativo	1998-06-03 00:00:00	0.00	2026-07-16 14:29:03.278059-03	{"cpf": "62087963347", "nome": "VIVIAN KESSIA FAUSTO DE SOUZA", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "620.***.***-47", "matricula": "62489", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62489", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "06/03/1998", "salarioLiquido": 0, "situacaoFuncional": ""}
665	2	WALISON FELIX DO NASCIMENTO	61567773346	62053	ESTATUTARIO	ATIVO	ativo	1996-09-02 00:00:00	0.00	2026-07-16 14:29:03.715224-03	{"cpf": "61567773346", "nome": "WALISON FELIX DO NASCIMENTO", "cargo": "VIGIA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "615.***.***-46", "matricula": "62053", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62053", "dataAdmissao": "05/01/2026", "prefeituraId": 2, "dataNascimento": "09/02/1996", "salarioLiquido": 0, "situacaoFuncional": ""}
668	2	WENDEL RAULINO NOGUEIRA	63256112331	62548	ESTATUTARIO	ATIVO	ativo	2005-08-08 00:00:00	0.00	2026-07-16 14:29:05.863533-03	{"cpf": "63256112331", "nome": "WENDEL RAULINO NOGUEIRA", "cargo": "AUX.SERVICOS GERAIS", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "632.***.***-31", "matricula": "62548", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62548", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "08/08/2005", "salarioLiquido": 0, "situacaoFuncional": ""}
672	2	YASMIN SOUZA DUARTE	10531487393	62556	ESTATUTARIO	ATIVO	ativo	2004-09-07 00:00:00	0.00	2026-07-16 14:29:10.602287-03	{"cpf": "10531487393", "nome": "YASMIN SOUZA DUARTE", "cargo": "PROF.EDUC.BASICA", "origem": "Florianopolis", "vinculo": "", "cpfMasked": "105.***.***-93", "matricula": "62556", "codigoIbge": 0, "idConvenio": "CONV-002", "idMatricula": "MAT-62556", "dataAdmissao": "02/02/2026", "prefeituraId": 2, "dataNascimento": "09/07/2004", "salarioLiquido": 0, "situacaoFuncional": ""}
\.


--
-- Data for Name: termos_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.termos_templates (id, data, updated_at) FROM stdin;
termos_uso	{"id": "termos_uso", "ativo": true, "corpo": "Colocar Texto do **Termos de Uso**.", "titulo": "Termos de Uso", "versao": "1.0", "criadoEm": "2026-07-16T00:00:00.000Z", "descricao": "Exibido no app/web em Conta → Termos de Uso. Editavel pela averbadora.", "variaveis": [], "atualizadoEm": "2026-07-16T15:28:45.669Z"}	2026-07-16 12:28:47.459946-03
lgpd_servidor	{"id": "lgpd_servidor", "ativo": true, "corpo": "Colocar Texto do **Termo LGPD**.", "titulo": "Termo LGPD — Servidor (primeiro acesso)", "versao": "1.0", "criadoEm": "2026-07-14T00:00:00.000Z", "descricao": "Exibido no primeiro acesso do servidor, junto do formulario de senha/email.", "variaveis": [], "atualizadoEm": "2026-07-16T15:29:00.204Z"}	2026-07-16 12:29:00.569701-03
refinanciamento	{"id": "refinanciamento", "ativo": true, "corpo": "Colocar Texto do **Termo de autorização**.", "titulo": "Termo de autorização — Refinanciamento", "versao": "1.0", "criadoEm": "2026-07-14T00:00:00.000Z", "descricao": "Exibido antes do servidor refinanciar contrato existente com o mesmo banco.", "variaveis": ["banco", "valor", "parcelas", "parcela", "prazo"], "atualizadoEm": "2026-07-16T15:29:17.253Z"}	2026-07-16 12:29:17.603439-03
portabilidade	{"id": "portabilidade", "ativo": true, "corpo": "Colocar Texto do **Termo de autorização**.", "titulo": "Termo de autorização — Portabilidade", "versao": "1.0", "criadoEm": "2026-07-14T00:00:00.000Z", "descricao": "Exibido antes do servidor consolidar contratos em outro banco.", "variaveis": ["banco", "valor", "parcelas", "parcela", "prazo"], "atualizadoEm": "2026-07-16T15:29:33.327Z"}	2026-07-16 12:29:33.693111-03
emprestimo	{"id": "emprestimo", "ativo": true, "corpo": "Colocar Texto do **Termo de autorização**.", "titulo": "Termo de autorização — Empréstimo Consignado", "versao": "1.0", "criadoEm": "2026-07-14T00:00:00.000Z", "descricao": "Exibido antes do servidor confirmar uma proposta de emprestimo consignado.", "variaveis": ["tipoLabel", "valor", "parcelas", "parcela", "banco", "prazo"], "atualizadoEm": "2026-07-16T15:29:39.773Z"}	2026-07-16 12:29:40.139561-03
cartao_consignado	{"id": "cartao_consignado", "ativo": true, "corpo": "Colocar Texto do **Termo de autorização**.", "titulo": "Termo de autorização — Cartão de Crédito Consignado", "versao": "1.0", "criadoEm": "2026-07-14T00:00:00.000Z", "descricao": "Exibido antes do servidor solicitar cartão consignado.", "variaveis": ["banco", "limite", "produto"], "atualizadoEm": "2026-07-16T15:29:44.889Z"}	2026-07-16 12:29:45.254819-03
cartao_beneficio	{"id": "cartao_beneficio", "ativo": true, "corpo": "Colocar Texto do **Termo de autorização**.", "titulo": "Termo de autorização — Cartão Benefício Consignado", "versao": "1.0", "criadoEm": "2026-07-15T00:00:00.000Z", "descricao": "Exibido antes do servidor solicitar cartão benefício (farmácia, mercado, saúde).", "variaveis": ["banco", "limite", "produto"], "atualizadoEm": "2026-07-16T15:29:49.473Z"}	2026-07-16 12:29:49.832817-03
telemedicina	{"id": "telemedicina", "ativo": true, "corpo": "Colocar Texto do **Termo de adesão**.", "titulo": "Termo de adesão — Telemedicina Atlas", "versao": "1.0", "criadoEm": "2026-07-14T00:00:00.000Z", "descricao": "Exibido antes do servidor aderir a telemedicina (compromisso minimo de 12 meses).", "variaveis": ["parceiro"], "atualizadoEm": "2026-07-16T15:29:59.580Z"}	2026-07-16 12:29:59.940812-03
beneficio_generico	{"id": "beneficio_generico", "ativo": true, "corpo": "Colocar Texto do **Termo de adesão**.", "titulo": "Termo de adesão — Benefício", "versao": "1.0", "criadoEm": "2026-07-14T00:00:00.000Z", "descricao": "Exibido antes do servidor aderir a um beneficio negociado pela Atlas.", "variaveis": ["parceiro", "duracaoMinima"], "atualizadoEm": "2026-07-16T15:30:04.447Z"}	2026-07-16 12:30:04.800694-03
politica_privacidade	{"id": "politica_privacidade", "ativo": true, "corpo": "Colocar Texto de **Política de Privacidade**.", "titulo": "Política de Privacidade", "versao": "1.0", "criadoEm": "2026-07-16T00:00:00.000Z", "descricao": "Exibida no app/web em Conta → Política de Privacidade. Editavel pela averbadora.", "variaveis": [], "atualizadoEm": "2026-07-16T15:30:18.952Z"}	2026-07-16 12:30:19.315549-03
anuencia_prefeitura	{"id": "anuencia_prefeitura", "ativo": true, "corpo": "Colocar Texto de **Anuência LGPD**.", "titulo": "Anuência LGPD — Prefeitura", "versao": "1.0", "criadoEm": "2026-07-14T00:00:00.000Z", "descricao": "Aceite obrigatorio pra prefeitura importar/manter base de servidores no Atlas.", "variaveis": [], "atualizadoEm": "2026-07-16T15:30:29.265Z"}	2026-07-16 12:30:29.827705-03
\.


--
-- Data for Name: tombamento_lotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tombamento_lotes (id, data, updated_at) FROM stdin;
TB-1-202605	{"lote": {"id": "TB-1-202605", "status": "conciliado", "inseridos": 8, "observacao": "8 divergencias para revisao.", "recebidoEm": "2026-06-05T08:30:00.000Z", "atualizados": 296, "competencia": "202605", "recebidoPor": "averbadora:admin", "totalLinhas": 312, "divergencias": 8, "prefeituraId": 1, "processadoEm": "2026-06-05T08:42:00.000Z", "prefeituraNome": "Palhoca"}, "linhas": [{"loteId": "TB-1-202605", "idUnico": "PLH-000004", "adfBanco": "9000123", "bancoNome": "SCred Financeira", "cpfMasked": "000.***.***-33", "matricula": "M-9001", "saldoDevedor": 22435, "valorParcela": 320.5, "reconciliacao": "ok", "parcelasRestantes": 70}, {"loteId": "TB-1-202605", "idUnico": "PLH-000004", "adfBanco": "9000124", "bancoNome": "Banco Y", "cpfMasked": "000.***.***-44", "matricula": "M-9002", "saldoDevedor": 10440, "valorParcela": 180, "reconciliacao": "divergente", "parcelasRestantes": 58, "detalheReconciliacao": "valorParcela difere: prefeitura=180,00 / atlas=185,40"}, {"loteId": "TB-1-202605", "idUnico": "PLH-000004", "adfBanco": "9000125", "bancoNome": "SCred Financeira", "cpfMasked": "000.***.***-55", "matricula": "M-9003", "saldoDevedor": 35280, "valorParcela": 420, "reconciliacao": "novo", "parcelasRestantes": 84, "detalheReconciliacao": "Contrato nao existia no Atlas — tombado."}]}	2026-07-02 16:43:32.323844-03
TB-2-202605	{"lote": {"id": "TB-2-202605", "status": "divergente", "inseridos": 4, "observacao": "23 divergencias — bancos Y e BMG.", "recebidoEm": "2026-06-05T08:30:00.000Z", "atualizados": 161, "competencia": "202605", "recebidoPor": "averbadora:admin", "totalLinhas": 188, "divergencias": 23, "prefeituraId": 2, "processadoEm": "2026-06-05T08:42:00.000Z", "prefeituraNome": "Florianopolis"}, "linhas": []}	2026-07-02 16:43:32.718725-03
TB-3-202605	{"lote": {"id": "TB-3-202605", "status": "conciliado", "inseridos": 1, "recebidoEm": "2026-06-05T08:30:00.000Z", "atualizados": 91, "competencia": "202605", "recebidoPor": "averbadora:admin", "totalLinhas": 96, "divergencias": 4, "prefeituraId": 3, "processadoEm": "2026-06-05T08:42:00.000Z", "prefeituraNome": "Joinville"}, "linhas": []}	2026-07-02 16:43:33.118265-03
TB-1-209912-mr3wwx3h	{"lote": {"id": "TB-1-209912-mr3wwx3h", "status": "divergente", "inseridos": 0, "recebidoEm": "2026-07-02T19:43:35.309Z", "atualizados": 1, "competencia": "209912", "recebidoPor": "averbadora:200", "totalLinhas": 1, "divergencias": 1, "prefeituraId": 1, "processadoEm": "2026-07-02T19:43:35.309Z", "prefeituraNome": "Palhoca"}, "linhas": [{"nome": "MARKER PERSIST", "loteId": "TB-1-209912-mr3wwx3h", "idUnico": "PLH-000004", "adfBanco": "MK-1", "bancoNome": "Banco Atlas", "cpfMasked": "000.***.***-33", "matricula": "852029100", "saldoDevedor": 0, "valorParcela": 111, "reconciliacao": "divergente", "parcelasRestantes": 22, "detalheReconciliacao": "parcela difere do banco: remessa=111 / banco=15.48"}]}	2026-07-02 16:43:35.425286-03
TB-5-202607-mr9ko74q	{"lote": {"id": "TB-5-202607-mr9ko74q", "status": "divergente", "inseridos": 0, "recebidoEm": "2026-07-06T18:47:30.074Z", "atualizados": 1, "competencia": "202607", "recebidoPor": "prefeitura:5", "totalLinhas": 1, "divergencias": 1, "prefeituraId": 5, "processadoEm": "2026-07-06T18:47:30.074Z", "prefeituraNome": "Teste321"}, "linhas": [{"loteId": "TB-5-202607-mr9ko74q", "idUnico": "—", "adfBanco": "9000123", "bancoNome": "SCred Financeira", "cpfMasked": "000.***.***-33", "matricula": "852029100", "saldoDevedor": 18000, "valorParcela": 520, "reconciliacao": "divergente", "parcelasRestantes": 44, "detalheReconciliacao": "servidor não consta na base da prefeitura; parcela difere do banco: remessa=520 / banco=15.48"}]}	2026-07-06 15:47:30.233755-03
TB-1-202607-mrnqxvd0	{"lote": {"id": "TB-1-202607-mrnqxvd0", "status": "conciliado", "inseridos": 0, "recebidoEm": "2026-07-16T16:51:45.540Z", "atualizados": 0, "competencia": "202607", "recebidoPor": "averbadora:200", "totalLinhas": 1, "divergencias": 0, "prefeituraId": 1, "processadoEm": "2026-07-16T16:51:45.540Z", "prefeituraNome": "Palhoca"}, "linhas": []}	2026-07-16 13:51:45.703302-03
TB-1-202607-mrnr2qlb	{"lote": {"id": "TB-1-202607-mrnr2qlb", "status": "divergente", "inseridos": 0, "recebidoEm": "2026-07-16T16:55:32.639Z", "atualizados": 1, "competencia": "202607", "recebidoPor": "averbadora:200", "totalLinhas": 1, "divergencias": 1, "prefeituraId": 1, "processadoEm": "2026-07-16T16:55:32.639Z", "prefeituraNome": "Palhoca"}, "linhas": [{"nome": "CARLOS EDUARDO SOUZA", "tipo": "Empréstimo", "loteId": "TB-1-202607-mrnr2qlb", "idUnico": "PLH-000014", "adfBanco": "BRA-0070010001", "bancoNome": "237-Bradesco", "cpfMasked": "000.***.***-08", "matricula": "700100001", "saldoDevedor": 29640, "valorParcela": 780, "reconciliacao": "divergente", "totalParcelas": 60, "valorEmprestimo": 35000, "parcelasRestantes": 38, "detalheReconciliacao": "servidor não consta na base da prefeitura; contrato não consta na base do banco"}]}	2026-07-16 13:55:32.783893-03
TB-2-202607-mrnr2re3	{"lote": {"id": "TB-2-202607-mrnr2re3", "status": "divergente", "inseridos": 0, "recebidoEm": "2026-07-16T16:55:33.675Z", "atualizados": 1, "competencia": "202607", "recebidoPor": "averbadora:200", "totalLinhas": 1, "divergencias": 1, "prefeituraId": 2, "processadoEm": "2026-07-16T16:55:33.675Z", "prefeituraNome": "Florianopolis"}, "linhas": [{"nome": "MARIA APARECIDA LIMA", "tipo": "Empréstimo", "loteId": "TB-2-202607-mrnr2re3", "idUnico": "FLN-202607-00002", "adfBanco": "CEF-0070010002", "bancoNome": "104-Caixa Economica Federal", "cpfMasked": "000.***.***-50", "matricula": "700100002", "saldoDevedor": 50400, "valorParcela": 1120, "reconciliacao": "divergente", "totalParcelas": 72, "valorEmprestimo": 60000, "parcelasRestantes": 45, "detalheReconciliacao": "servidor não consta na base da prefeitura; contrato não consta na base do banco"}]}	2026-07-16 13:55:33.836364-03
TB-1-202607-mrnr3ahc	{"lote": {"id": "TB-1-202607-mrnr3ahc", "status": "divergente", "inseridos": 0, "recebidoEm": "2026-07-16T16:55:58.416Z", "atualizados": 1, "competencia": "202607", "recebidoPor": "averbadora:200", "totalLinhas": 1, "divergencias": 1, "prefeituraId": 1, "processadoEm": "2026-07-16T16:55:58.416Z", "prefeituraNome": "Palhoca"}, "linhas": [{"nome": "CARLOS EDUARDO SOUZA", "tipo": "Empréstimo", "loteId": "TB-1-202607-mrnr3ahc", "idUnico": "PLH-000014", "adfBanco": "BRA-0070010001", "bancoNome": "237-Bradesco", "cpfMasked": "000.***.***-08", "matricula": "700100001", "saldoDevedor": 29640, "valorParcela": 780, "reconciliacao": "divergente", "totalParcelas": 60, "valorEmprestimo": 35000, "parcelasRestantes": 38, "detalheReconciliacao": "servidor não consta na base da prefeitura; contrato não consta na base do banco"}]}	2026-07-16 13:55:58.560885-03
TB-1-202607-mrnspwe7	{"lote": {"id": "TB-1-202607-mrnspwe7", "status": "divergente", "inseridos": 0, "recebidoEm": "2026-07-16T17:41:32.863Z", "atualizados": 1, "competencia": "202607", "recebidoPor": "prefeitura:1", "totalLinhas": 1, "divergencias": 1, "prefeituraId": 1, "processadoEm": "2026-07-16T17:41:32.863Z", "prefeituraNome": "Palhoca"}, "linhas": [{"nome": "MARIA DO SOCORRO LOPES FARIAS", "tipo": "Novo", "loteId": "TB-1-202607-mrnspwe7", "motivo": "Dívidas", "idUnico": "PLH-000004", "adfBanco": "10994802", "bancoNome": "104-Caixa Economica Federal", "cpfMasked": "733.***.***-04", "matricula": "00000230", "saldoDevedor": 0, "valorParcela": 164, "reconciliacao": "divergente", "totalParcelas": 120, "statusContrato": "Averbação Confirmada", "valorEmprestimo": 7944.97, "parcelasRestantes": 120, "detalheReconciliacao": "servidor não consta na base da prefeitura; contrato não consta na base do banco"}]}	2026-07-16 14:41:33.012556-03
TB-1-202607-mrnt2s9k	{"lote": {"id": "TB-1-202607-mrnt2s9k", "status": "divergente", "inseridos": 0, "recebidoEm": "2026-07-16T17:51:34.040Z", "atualizados": 1, "competencia": "202607", "recebidoPor": "prefeitura:1", "totalLinhas": 1, "divergencias": 1, "prefeituraId": 1, "processadoEm": "2026-07-16T17:51:34.040Z", "prefeituraNome": "Palhoca"}, "linhas": [{"nome": "MARIA DO SOCORRO LOPES FARIAS", "tipo": "Novo", "loteId": "TB-1-202607-mrnt2s9k", "motivo": "Dívidas", "idUnico": "PLH-000004", "adfBanco": "10994802", "bancoNome": "104-Caixa Economica Federal", "cpfMasked": "733.***.***-04", "matricula": "00000230", "saldoDevedor": 0, "valorParcela": 164, "reconciliacao": "divergente", "totalParcelas": 120, "statusContrato": "Averbação Confirmada", "valorEmprestimo": 7944.97, "parcelasRestantes": 120, "detalheReconciliacao": "servidor não consta na base da prefeitura; contrato não consta na base do banco"}]}	2026-07-16 14:51:34.192438-03
TB-1-202607-mrnt3yf6	{"lote": {"id": "TB-1-202607-mrnt3yf6", "status": "divergente", "inseridos": 0, "recebidoEm": "2026-07-16T17:52:28.674Z", "atualizados": 1, "competencia": "202607", "recebidoPor": "prefeitura:1", "totalLinhas": 1, "divergencias": 1, "prefeituraId": 1, "processadoEm": "2026-07-16T17:52:28.674Z", "prefeituraNome": "Palhoca"}, "linhas": [{"nome": "Diego Perez Ferreira", "tipo": "Novo", "loteId": "TB-1-202607-mrnt3yf6", "motivo": "Dívidas", "idUnico": "PLH-000004", "adfBanco": "150994802", "bancoNome": "104-Caixa Economica Federal", "cpfMasked": "375.***.***-00", "matricula": "5545", "saldoDevedor": 0, "valorParcela": 164, "reconciliacao": "divergente", "totalParcelas": 120, "statusContrato": "Averbação Confirmada", "valorEmprestimo": 7944.97, "parcelasRestantes": 120, "detalheReconciliacao": "servidor não consta na base da prefeitura; contrato não consta na base do banco"}]}	2026-07-16 14:52:28.819159-03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, cpf, password_hash, role, nome, banco_id, servidor_id, created_at, updated_at) FROM stdin;
\.


--
-- Name: adf_pendencias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.adf_pendencias_id_seq', 1, false);


--
-- Name: app_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.app_logs_id_seq', 1585, true);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 8, true);


--
-- Name: banco_usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.banco_usuarios_id_seq', 1, false);


--
-- Name: bancos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bancos_id_seq', 1, true);


--
-- Name: comunicados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comunicados_id_seq', 1, false);


--
-- Name: consentimentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consentimentos_id_seq', 1, false);


--
-- Name: contrato_eventos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contrato_eventos_id_seq', 1, false);


--
-- Name: convenio_tabelas_emprestimo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.convenio_tabelas_emprestimo_id_seq', 1, false);


--
-- Name: convenios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.convenios_id_seq', 1, false);


--
-- Name: folha_movimentacoes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.folha_movimentacoes_id_seq', 1, false);


--
-- Name: folhas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.folhas_id_seq', 1, false);


--
-- Name: notificacoes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notificacoes_id_seq', 1, false);


--
-- Name: prefeituras_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prefeituras_id_seq', 3, true);


--
-- Name: proposta_eventos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proposta_eventos_id_seq', 1, false);


--
-- Name: servidores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.servidores_id_seq', 693, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: adf_pendencias adf_pendencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adf_pendencias
    ADD CONSTRAINT adf_pendencias_pkey PRIMARY KEY (id);


--
-- Name: admin_beneficio_cliques admin_beneficio_cliques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_beneficio_cliques
    ADD CONSTRAINT admin_beneficio_cliques_pkey PRIMARY KEY (id);


--
-- Name: admin_beneficios admin_beneficios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_beneficios
    ADD CONSTRAINT admin_beneficios_pkey PRIMARY KEY (id);


--
-- Name: admin_comunicados admin_comunicados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_comunicados
    ADD CONSTRAINT admin_comunicados_pkey PRIMARY KEY (id);


--
-- Name: admin_convenios admin_convenios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_convenios
    ADD CONSTRAINT admin_convenios_pkey PRIMARY KEY (id);


--
-- Name: admin_folhas admin_folhas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_folhas
    ADD CONSTRAINT admin_folhas_pkey PRIMARY KEY (id);


--
-- Name: admin_ofertas admin_ofertas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_ofertas
    ADD CONSTRAINT admin_ofertas_pkey PRIMARY KEY (id);


--
-- Name: admin_perfis admin_perfis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_perfis
    ADD CONSTRAINT admin_perfis_pkey PRIMARY KEY (id);


--
-- Name: admin_servidor_status admin_servidor_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_servidor_status
    ADD CONSTRAINT admin_servidor_status_pkey PRIMARY KEY (id);


--
-- Name: admin_telemedicina_cotacoes admin_telemedicina_cotacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_telemedicina_cotacoes
    ADD CONSTRAINT admin_telemedicina_cotacoes_pkey PRIMARY KEY (id);


--
-- Name: admin_vitrine admin_vitrine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_vitrine
    ADD CONSTRAINT admin_vitrine_pkey PRIMARY KEY (id);


--
-- Name: app_logs app_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_logs
    ADD CONSTRAINT app_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: banco_usuarios banco_usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco_usuarios
    ADD CONSTRAINT banco_usuarios_pkey PRIMARY KEY (id);


--
-- Name: bancos bancos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bancos
    ADD CONSTRAINT bancos_pkey PRIMARY KEY (id);


--
-- Name: comunicados comunicados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados
    ADD CONSTRAINT comunicados_pkey PRIMARY KEY (id);


--
-- Name: consentimentos consentimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimentos
    ADD CONSTRAINT consentimentos_pkey PRIMARY KEY (id);


--
-- Name: contrato_eventos contrato_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_eventos
    ADD CONSTRAINT contrato_eventos_pkey PRIMARY KEY (id);


--
-- Name: contratos contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_pkey PRIMARY KEY (id);


--
-- Name: convenio_tabelas_emprestimo convenio_tabelas_emprestimo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenio_tabelas_emprestimo
    ADD CONSTRAINT convenio_tabelas_emprestimo_pkey PRIMARY KEY (id);


--
-- Name: convenios convenios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios
    ADD CONSTRAINT convenios_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: folha_movimentacoes folha_movimentacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folha_movimentacoes
    ADD CONSTRAINT folha_movimentacoes_pkey PRIMARY KEY (id);


--
-- Name: folhas folhas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folhas
    ADD CONSTRAINT folhas_pkey PRIMARY KEY (id);


--
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);


--
-- Name: portabilidade_intencoes portabilidade_intencoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portabilidade_intencoes
    ADD CONSTRAINT portabilidade_intencoes_pkey PRIMARY KEY (id);


--
-- Name: portal_banco_contratos portal_banco_contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_banco_contratos
    ADD CONSTRAINT portal_banco_contratos_pkey PRIMARY KEY (adf);


--
-- Name: portal_banco_tabelas portal_banco_tabelas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_banco_tabelas
    ADD CONSTRAINT portal_banco_tabelas_pkey PRIMARY KEY (id);


--
-- Name: pre_reservas pre_reservas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_reservas
    ADD CONSTRAINT pre_reservas_pkey PRIMARY KEY (id);


--
-- Name: prefeituras prefeituras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prefeituras
    ADD CONSTRAINT prefeituras_pkey PRIMARY KEY (id);


--
-- Name: proposta_eventos proposta_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposta_eventos
    ADD CONSTRAINT proposta_eventos_pkey PRIMARY KEY (id);


--
-- Name: propostas propostas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_pkey PRIMARY KEY (id);


--
-- Name: servidores servidores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servidores
    ADD CONSTRAINT servidores_pkey PRIMARY KEY (id);


--
-- Name: termos_templates termos_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.termos_templates
    ADD CONSTRAINT termos_templates_pkey PRIMARY KEY (id);


--
-- Name: tombamento_lotes tombamento_lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tombamento_lotes
    ADD CONSTRAINT tombamento_lotes_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: adf_pendencias_adf_comp_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX adf_pendencias_adf_comp_uq ON public.adf_pendencias USING btree (adf, competencia);


--
-- Name: adf_pendencias_banco_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX adf_pendencias_banco_idx ON public.adf_pendencias USING btree (banco_id);


--
-- Name: adf_pendencias_pref_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX adf_pendencias_pref_status_idx ON public.adf_pendencias USING btree (prefeitura_id, status);


--
-- Name: app_logs_ts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_logs_ts_idx ON public.app_logs USING btree (ts DESC);


--
-- Name: audit_categoria_ts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_categoria_ts_idx ON public.audit_log USING btree (categoria, ts DESC);


--
-- Name: audit_cpf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_cpf_idx ON public.audit_log USING btree (cpf);


--
-- Name: audit_matricula_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_matricula_idx ON public.audit_log USING btree (matricula);


--
-- Name: audit_proposta_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_proposta_idx ON public.audit_log USING btree (proposta_id);


--
-- Name: banco_usuarios_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX banco_usuarios_uq ON public.banco_usuarios USING btree (banco_id, user_id);


--
-- Name: contratos_adf_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contratos_adf_uq ON public.contratos USING btree (adf);


--
-- Name: convenios_prefeitura_banco_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX convenios_prefeitura_banco_uq ON public.convenios USING btree (prefeitura_id, banco_id);


--
-- Name: folha_mov_adf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX folha_mov_adf_idx ON public.folha_movimentacoes USING btree (adf);


--
-- Name: folha_mov_banco_comp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX folha_mov_banco_comp_idx ON public.folha_movimentacoes USING btree (banco_id, competencia);


--
-- Name: folha_mov_matricula_comp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX folha_mov_matricula_comp_idx ON public.folha_movimentacoes USING btree (matricula, competencia);


--
-- Name: folhas_pref_comp_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX folhas_pref_comp_uq ON public.folhas USING btree (prefeitura_id, competencia);


--
-- Name: notif_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notif_target_idx ON public.notificacoes USING btree (target_role, target_id, criado_em DESC);


--
-- Name: notif_target_nao_lida_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notif_target_nao_lida_idx ON public.notificacoes USING btree (target_role, target_id) WHERE (lida_em IS NULL);


--
-- Name: pre_reservas_banco_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pre_reservas_banco_status_idx ON public.pre_reservas USING btree (banco_id, status);


--
-- Name: pre_reservas_expira_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pre_reservas_expira_idx ON public.pre_reservas USING btree (status, expira_em);


--
-- Name: pre_reservas_servidor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pre_reservas_servidor_idx ON public.pre_reservas USING btree (servidor_id);


--
-- Name: proposta_eventos_idem_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX proposta_eventos_idem_uq ON public.proposta_eventos USING btree (idempotency_key);


--
-- Name: servidores_cpf_matricula_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX servidores_cpf_matricula_uq ON public.servidores USING btree (cpf, matricula);


--
-- Name: users_cpf_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_cpf_uq ON public.users USING btree (cpf);


--
-- Name: users_email_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_uq ON public.users USING btree (email);


--
-- Name: adf_pendencias adf_pendencias_banco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adf_pendencias
    ADD CONSTRAINT adf_pendencias_banco_id_fkey FOREIGN KEY (banco_id) REFERENCES public.bancos(id);


--
-- Name: adf_pendencias adf_pendencias_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adf_pendencias
    ADD CONSTRAINT adf_pendencias_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id);


--
-- Name: adf_pendencias adf_pendencias_prefeitura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adf_pendencias
    ADD CONSTRAINT adf_pendencias_prefeitura_id_fkey FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: adf_pendencias adf_pendencias_servidor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adf_pendencias
    ADD CONSTRAINT adf_pendencias_servidor_id_fkey FOREIGN KEY (servidor_id) REFERENCES public.servidores(id);


--
-- Name: banco_usuarios banco_usuarios_banco_id_bancos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco_usuarios
    ADD CONSTRAINT banco_usuarios_banco_id_bancos_id_fk FOREIGN KEY (banco_id) REFERENCES public.bancos(id);


--
-- Name: banco_usuarios banco_usuarios_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco_usuarios
    ADD CONSTRAINT banco_usuarios_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: comunicados comunicados_banco_id_bancos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados
    ADD CONSTRAINT comunicados_banco_id_bancos_id_fk FOREIGN KEY (banco_id) REFERENCES public.bancos(id);


--
-- Name: comunicados comunicados_prefeitura_id_prefeituras_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicados
    ADD CONSTRAINT comunicados_prefeitura_id_prefeituras_id_fk FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: consentimentos consentimentos_servidor_id_servidores_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consentimentos
    ADD CONSTRAINT consentimentos_servidor_id_servidores_id_fk FOREIGN KEY (servidor_id) REFERENCES public.servidores(id);


--
-- Name: contrato_eventos contrato_eventos_contrato_id_contratos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_eventos
    ADD CONSTRAINT contrato_eventos_contrato_id_contratos_id_fk FOREIGN KEY (contrato_id) REFERENCES public.contratos(id);


--
-- Name: contratos contratos_banco_id_bancos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_banco_id_bancos_id_fk FOREIGN KEY (banco_id) REFERENCES public.bancos(id);


--
-- Name: contratos contratos_convenio_id_convenios_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_convenio_id_convenios_id_fk FOREIGN KEY (convenio_id) REFERENCES public.convenios(id);


--
-- Name: contratos contratos_prefeitura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_prefeitura_id_fkey FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: contratos contratos_proposta_id_propostas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_proposta_id_propostas_id_fk FOREIGN KEY (proposta_id) REFERENCES public.propostas(id);


--
-- Name: contratos contratos_servidor_id_servidores_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_servidor_id_servidores_id_fk FOREIGN KEY (servidor_id) REFERENCES public.servidores(id);


--
-- Name: convenio_tabelas_emprestimo convenio_tabelas_emprestimo_convenio_id_convenios_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenio_tabelas_emprestimo
    ADD CONSTRAINT convenio_tabelas_emprestimo_convenio_id_convenios_id_fk FOREIGN KEY (convenio_id) REFERENCES public.convenios(id);


--
-- Name: convenios convenios_banco_id_bancos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios
    ADD CONSTRAINT convenios_banco_id_bancos_id_fk FOREIGN KEY (banco_id) REFERENCES public.bancos(id);


--
-- Name: convenios convenios_prefeitura_id_prefeituras_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios
    ADD CONSTRAINT convenios_prefeitura_id_prefeituras_id_fk FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: folha_movimentacoes folha_movimentacoes_banco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folha_movimentacoes
    ADD CONSTRAINT folha_movimentacoes_banco_id_fkey FOREIGN KEY (banco_id) REFERENCES public.bancos(id);


--
-- Name: folha_movimentacoes folha_movimentacoes_folha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folha_movimentacoes
    ADD CONSTRAINT folha_movimentacoes_folha_id_fkey FOREIGN KEY (folha_id) REFERENCES public.folhas(id);


--
-- Name: folha_movimentacoes folha_movimentacoes_prefeitura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folha_movimentacoes
    ADD CONSTRAINT folha_movimentacoes_prefeitura_id_fkey FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: folha_movimentacoes folha_movimentacoes_servidor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folha_movimentacoes
    ADD CONSTRAINT folha_movimentacoes_servidor_id_fkey FOREIGN KEY (servidor_id) REFERENCES public.servidores(id);


--
-- Name: folhas folhas_prefeitura_id_prefeituras_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folhas
    ADD CONSTRAINT folhas_prefeitura_id_prefeituras_id_fk FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: pre_reservas pre_reservas_banco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_reservas
    ADD CONSTRAINT pre_reservas_banco_id_fkey FOREIGN KEY (banco_id) REFERENCES public.bancos(id);


--
-- Name: pre_reservas pre_reservas_convenio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_reservas
    ADD CONSTRAINT pre_reservas_convenio_id_fkey FOREIGN KEY (convenio_id) REFERENCES public.convenios(id);


--
-- Name: pre_reservas pre_reservas_prefeitura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_reservas
    ADD CONSTRAINT pre_reservas_prefeitura_id_fkey FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: pre_reservas pre_reservas_servidor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_reservas
    ADD CONSTRAINT pre_reservas_servidor_id_fkey FOREIGN KEY (servidor_id) REFERENCES public.servidores(id);


--
-- Name: proposta_eventos proposta_eventos_proposta_id_propostas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposta_eventos
    ADD CONSTRAINT proposta_eventos_proposta_id_propostas_id_fk FOREIGN KEY (proposta_id) REFERENCES public.propostas(id);


--
-- Name: propostas propostas_banco_id_bancos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_banco_id_bancos_id_fk FOREIGN KEY (banco_id) REFERENCES public.bancos(id);


--
-- Name: propostas propostas_convenio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_convenio_id_fkey FOREIGN KEY (convenio_id) REFERENCES public.convenios(id);


--
-- Name: propostas propostas_prefeitura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_prefeitura_id_fkey FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: propostas propostas_servidor_id_servidores_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_servidor_id_servidores_id_fk FOREIGN KEY (servidor_id) REFERENCES public.servidores(id);


--
-- Name: servidores servidores_prefeitura_id_prefeituras_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servidores
    ADD CONSTRAINT servidores_prefeitura_id_prefeituras_id_fk FOREIGN KEY (prefeitura_id) REFERENCES public.prefeituras(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT ALL ON SCHEMA public TO atlas_app;


--
-- PostgreSQL database dump complete
--

\unrestrict 9qcYIL7H0JRxb4VkT5bLeJHXhy5WB2D1dQZJbHknRSKXtGpyxUrz5dInUEKbpXH

