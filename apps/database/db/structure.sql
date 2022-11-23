--
-- PostgreSQL database dump
--

-- Dumped from database version 13.8
-- Dumped by pg_dump version 13.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: build_notifications_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.build_notifications_type AS ENUM (
    'diff-rejected',
    'diff-accepted',
    'diff-detected',
    'no-diff-detected',
    'progress',
    'queued'
);


ALTER TYPE public.build_notifications_type OWNER TO postgres;

--
-- Name: job_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.job_status AS ENUM (
    'pending',
    'progress',
    'complete',
    'error',
    'aborted'
);


ALTER TYPE public.job_status OWNER TO postgres;

--
-- Name: service_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.service_type AS ENUM (
    'github'
);


ALTER TYPE public.service_type OWNER TO postgres;

--
-- Name: synchronization_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.synchronization_type AS ENUM (
    'user',
    'installation'
);


ALTER TYPE public.synchronization_type OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" bigint,
    "organizationId" bigint,
    "forcedPlanId" bigint,
    CONSTRAINT accounts_only_one_owner CHECK ((num_nonnulls("userId", "organizationId") = 1))
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.accounts_id_seq OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: build_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.build_notifications (
    id bigint NOT NULL,
    type public.build_notifications_type NOT NULL,
    "jobStatus" public.job_status NOT NULL,
    "buildId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.build_notifications OWNER TO postgres;

--
-- Name: build_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.build_notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.build_notifications_id_seq OWNER TO postgres;

--
-- Name: build_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.build_notifications_id_seq OWNED BY public.build_notifications.id;


--
-- Name: builds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.builds (
    id bigint NOT NULL,
    "baseScreenshotBucketId" bigint,
    "compareScreenshotBucketId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "repositoryId" bigint NOT NULL,
    number integer NOT NULL,
    "jobStatus" public.job_status,
    "externalId" character varying(255),
    "batchCount" integer,
    name character varying(255) DEFAULT 'default'::character varying NOT NULL,
    type text,
    "totalBatch" integer,
    CONSTRAINT builds_type_check CHECK ((type = ANY (ARRAY['reference'::text, 'check'::text, 'orphan'::text])))
);


ALTER TABLE public.builds OWNER TO postgres;

--
-- Name: builds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.builds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.builds_id_seq OWNER TO postgres;

--
-- Name: builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.builds_id_seq OWNED BY public.builds.id;


--
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    key character varying(255) NOT NULL,
    width integer,
    height integer
);


ALTER TABLE public.files OWNER TO postgres;

--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.files_id_seq OWNER TO postgres;

--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: installation_repository_rights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.installation_repository_rights (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "installationId" bigint NOT NULL,
    "repositoryId" bigint NOT NULL
);


ALTER TABLE public.installation_repository_rights OWNER TO postgres;

--
-- Name: installation_repository_rights_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.installation_repository_rights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.installation_repository_rights_id_seq OWNER TO postgres;

--
-- Name: installation_repository_rights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.installation_repository_rights_id_seq OWNED BY public.installation_repository_rights.id;


--
-- Name: installations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.installations (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "githubId" integer NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.installations OWNER TO postgres;

--
-- Name: installations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.installations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.installations_id_seq OWNER TO postgres;

--
-- Name: installations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.installations_id_seq OWNED BY public.installations.id;


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knex_migrations_id_seq OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knex_migrations_lock_index_seq OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    login character varying(255) NOT NULL
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.organizations_id_seq OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(255) NOT NULL,
    "screenshotsLimitPerMonth" integer NOT NULL,
    "githubId" integer NOT NULL
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.plans_id_seq OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchases (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "planId" bigint NOT NULL,
    "accountId" bigint NOT NULL,
    "startDate" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "endDate" timestamp with time zone
);


ALTER TABLE public.purchases OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.purchases_id_seq OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;


--
-- Name: repositories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.repositories (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    token character varying(255),
    "organizationId" bigint,
    "userId" bigint,
    private boolean DEFAULT false NOT NULL,
    "baselineBranch" character varying(255),
    "defaultBranch" character varying(255),
    CONSTRAINT repositories_one_branch_not_null CHECK ((((COALESCE("baselineBranch", ''::character varying))::text <> ''::text) OR ((COALESCE("defaultBranch", ''::character varying))::text <> ''::text)))
);


ALTER TABLE public.repositories OWNER TO postgres;

--
-- Name: repositories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.repositories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.repositories_id_seq OWNER TO postgres;

--
-- Name: repositories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.repositories_id_seq OWNED BY public.repositories.id;


--
-- Name: screenshot_buckets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.screenshot_buckets (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    commit character varying(255) NOT NULL,
    branch character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "repositoryId" bigint NOT NULL,
    complete boolean DEFAULT true
);


ALTER TABLE public.screenshot_buckets OWNER TO postgres;

--
-- Name: screenshot_buckets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.screenshot_buckets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.screenshot_buckets_id_seq OWNER TO postgres;

--
-- Name: screenshot_buckets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.screenshot_buckets_id_seq OWNED BY public.screenshot_buckets.id;


--
-- Name: screenshot_diffs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.screenshot_diffs (
    id bigint NOT NULL,
    "buildId" bigint NOT NULL,
    "baseScreenshotId" bigint,
    "compareScreenshotId" bigint,
    score numeric(10,5),
    "jobStatus" public.job_status,
    "validationStatus" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "s3Id" character varying(255),
    "fileId" bigint
);


ALTER TABLE public.screenshot_diffs OWNER TO postgres;

--
-- Name: screenshot_diffs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.screenshot_diffs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.screenshot_diffs_id_seq OWNER TO postgres;

--
-- Name: screenshot_diffs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.screenshot_diffs_id_seq OWNED BY public.screenshot_diffs.id;


--
-- Name: screenshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.screenshots (
    id bigint NOT NULL,
    "screenshotBucketId" bigint NOT NULL,
    name character varying(255) NOT NULL,
    "s3Id" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "fileId" bigint
);


ALTER TABLE public.screenshots OWNER TO postgres;

--
-- Name: screenshots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.screenshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.screenshots_id_seq OWNER TO postgres;

--
-- Name: screenshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.screenshots_id_seq OWNED BY public.screenshots.id;


--
-- Name: synchronizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.synchronizations (
    id bigint NOT NULL,
    "userId" bigint,
    "jobStatus" public.job_status,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    type public.synchronization_type NOT NULL,
    "installationId" bigint
);


ALTER TABLE public.synchronizations OWNER TO postgres;

--
-- Name: synchronizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.synchronizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.synchronizations_id_seq OWNER TO postgres;

--
-- Name: synchronizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.synchronizations_id_seq OWNED BY public.synchronizations.id;


--
-- Name: user_installation_rights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_installation_rights (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" bigint NOT NULL,
    "installationId" bigint NOT NULL
);


ALTER TABLE public.user_installation_rights OWNER TO postgres;

--
-- Name: user_installation_rights_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_installation_rights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_installation_rights_id_seq OWNER TO postgres;

--
-- Name: user_installation_rights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_installation_rights_id_seq OWNED BY public.user_installation_rights.id;


--
-- Name: user_organization_rights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_organization_rights (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.user_organization_rights OWNER TO postgres;

--
-- Name: user_organization_rights_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_organization_rights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_organization_rights_id_seq OWNER TO postgres;

--
-- Name: user_organization_rights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_organization_rights_id_seq OWNED BY public.user_organization_rights.id;


--
-- Name: user_repository_rights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_repository_rights (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "repositoryId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.user_repository_rights OWNER TO postgres;

--
-- Name: user_repository_rights_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_repository_rights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_repository_rights_id_seq OWNER TO postgres;

--
-- Name: user_repository_rights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_repository_rights_id_seq OWNED BY public.user_repository_rights.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255),
    email character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "accessToken" character varying(255),
    login character varying(255) NOT NULL,
    "privateSync" boolean DEFAULT false NOT NULL,
    "githubScopes" jsonb,
    scopes jsonb
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: build_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_notifications ALTER COLUMN id SET DEFAULT nextval('public.build_notifications_id_seq'::regclass);


--
-- Name: builds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builds ALTER COLUMN id SET DEFAULT nextval('public.builds_id_seq'::regclass);


--
-- Name: files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: installation_repository_rights id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installation_repository_rights ALTER COLUMN id SET DEFAULT nextval('public.installation_repository_rights_id_seq'::regclass);


--
-- Name: installations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installations ALTER COLUMN id SET DEFAULT nextval('public.installations_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: purchases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);


--
-- Name: repositories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repositories ALTER COLUMN id SET DEFAULT nextval('public.repositories_id_seq'::regclass);


--
-- Name: screenshot_buckets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_buckets ALTER COLUMN id SET DEFAULT nextval('public.screenshot_buckets_id_seq'::regclass);


--
-- Name: screenshot_diffs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diffs ALTER COLUMN id SET DEFAULT nextval('public.screenshot_diffs_id_seq'::regclass);


--
-- Name: screenshots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots ALTER COLUMN id SET DEFAULT nextval('public.screenshots_id_seq'::regclass);


--
-- Name: synchronizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.synchronizations ALTER COLUMN id SET DEFAULT nextval('public.synchronizations_id_seq'::regclass);


--
-- Name: user_installation_rights id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_installation_rights ALTER COLUMN id SET DEFAULT nextval('public.user_installation_rights_id_seq'::regclass);


--
-- Name: user_organization_rights id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_organization_rights ALTER COLUMN id SET DEFAULT nextval('public.user_organization_rights_id_seq'::regclass);


--
-- Name: user_repository_rights id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_repository_rights ALTER COLUMN id SET DEFAULT nextval('public.user_repository_rights_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: accounts accounts_organizationid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_organizationid_unique UNIQUE ("organizationId");


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_userid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_userid_unique UNIQUE ("userId");


--
-- Name: build_notifications build_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_notifications
    ADD CONSTRAINT build_notifications_pkey PRIMARY KEY (id);


--
-- Name: builds builds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builds
    ADD CONSTRAINT builds_pkey PRIMARY KEY (id);


--
-- Name: files files_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_key_unique UNIQUE (key);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: installation_repository_rights installation_repository_rights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installation_repository_rights
    ADD CONSTRAINT installation_repository_rights_pkey PRIMARY KEY (id);


--
-- Name: installations installations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installations
    ADD CONSTRAINT installations_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: repositories repositories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_pkey PRIMARY KEY (id);


--
-- Name: screenshot_buckets screenshot_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_buckets
    ADD CONSTRAINT screenshot_buckets_pkey PRIMARY KEY (id);


--
-- Name: screenshot_diffs screenshot_diffs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_pkey PRIMARY KEY (id);


--
-- Name: screenshots screenshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots
    ADD CONSTRAINT screenshots_pkey PRIMARY KEY (id);


--
-- Name: synchronizations synchronizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.synchronizations
    ADD CONSTRAINT synchronizations_pkey PRIMARY KEY (id);


--
-- Name: user_installation_rights user_installation_rights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_installation_rights
    ADD CONSTRAINT user_installation_rights_pkey PRIMARY KEY (id);


--
-- Name: user_organization_rights user_organization_rights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_organization_rights
    ADD CONSTRAINT user_organization_rights_pkey PRIMARY KEY (id);


--
-- Name: user_organization_rights user_organization_rights_userid_organizationid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_organization_rights
    ADD CONSTRAINT user_organization_rights_userid_organizationid_unique UNIQUE ("userId", "organizationId");


--
-- Name: user_repository_rights user_repository_rights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_repository_rights
    ADD CONSTRAINT user_repository_rights_pkey PRIMARY KEY (id);


--
-- Name: user_repository_rights user_repository_rights_userid_repositoryid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_repository_rights
    ADD CONSTRAINT user_repository_rights_userid_repositoryid_unique UNIQUE ("userId", "repositoryId");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accounts_forcedplanid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_forcedplanid_index ON public.accounts USING btree ("forcedPlanId");


--
-- Name: accounts_organizationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_organizationid_index ON public.accounts USING btree ("organizationId");


--
-- Name: accounts_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_userid_index ON public.accounts USING btree ("userId");


--
-- Name: build_notifications_buildid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX build_notifications_buildid_index ON public.build_notifications USING btree ("buildId");


--
-- Name: builds_basescreenshotbucketid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builds_basescreenshotbucketid_index ON public.builds USING btree ("baseScreenshotBucketId");


--
-- Name: builds_comparescreenshotbucketid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builds_comparescreenshotbucketid_index ON public.builds USING btree ("compareScreenshotBucketId");


--
-- Name: builds_externalid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builds_externalid_index ON public.builds USING btree ("externalId");


--
-- Name: builds_number_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builds_number_index ON public.builds USING btree (number);


--
-- Name: installation_repository_rights_installationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX installation_repository_rights_installationid_index ON public.installation_repository_rights USING btree ("installationId");


--
-- Name: installation_repository_rights_repositoryid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX installation_repository_rights_repositoryid_index ON public.installation_repository_rights USING btree ("repositoryId");


--
-- Name: installations_githubid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX installations_githubid_index ON public.installations USING btree ("githubId");


--
-- Name: organizations_githubid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX organizations_githubid_index ON public.organizations USING btree ("githubId");


--
-- Name: plans_githubid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX plans_githubid_index ON public.plans USING btree ("githubId");


--
-- Name: purchases_accountid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX purchases_accountid_index ON public.purchases USING btree ("accountId");


--
-- Name: purchases_planid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX purchases_planid_index ON public.purchases USING btree ("planId");


--
-- Name: repositories_githubid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX repositories_githubid_index ON public.repositories USING btree ("githubId");


--
-- Name: repositories_organizationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX repositories_organizationid_index ON public.repositories USING btree ("organizationId");


--
-- Name: repositories_private; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX repositories_private ON public.repositories USING btree (private);


--
-- Name: repositories_token_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX repositories_token_index ON public.repositories USING btree (token);


--
-- Name: repositories_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX repositories_userid_index ON public.repositories USING btree ("userId");


--
-- Name: screenshot_buckets_commit_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_buckets_commit_index ON public.screenshot_buckets USING btree (commit);


--
-- Name: screenshot_buckets_complete_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_buckets_complete_index ON public.screenshot_buckets USING btree (complete);


--
-- Name: screenshot_buckets_name_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_buckets_name_index ON public.screenshot_buckets USING btree (name);


--
-- Name: screenshot_diffs_basescreenshotid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_diffs_basescreenshotid_index ON public.screenshot_diffs USING btree ("baseScreenshotId");


--
-- Name: screenshot_diffs_buildid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_diffs_buildid_index ON public.screenshot_diffs USING btree ("buildId");


--
-- Name: screenshot_diffs_comparescreenshotid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_diffs_comparescreenshotid_index ON public.screenshot_diffs USING btree ("compareScreenshotId");


--
-- Name: screenshot_diffs_fileid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_diffs_fileid_index ON public.screenshot_diffs USING btree ("fileId");


--
-- Name: screenshots_createdat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_createdat ON public.screenshots USING btree ("createdAt" DESC);


--
-- Name: screenshots_fileid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_fileid_index ON public.screenshots USING btree ("fileId");


--
-- Name: screenshots_name_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_name_index ON public.screenshots USING btree (name);


--
-- Name: screenshots_s3id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_s3id_index ON public.screenshots USING btree ("s3Id");


--
-- Name: screenshots_screenshotbucketid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_screenshotbucketid_index ON public.screenshots USING btree ("screenshotBucketId");


--
-- Name: synchronizations_installationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX synchronizations_installationid_index ON public.synchronizations USING btree ("installationId");


--
-- Name: synchronizations_jobstatus_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX synchronizations_jobstatus_index ON public.synchronizations USING btree ("jobStatus");


--
-- Name: synchronizations_type_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX synchronizations_type_index ON public.synchronizations USING btree (type);


--
-- Name: synchronizations_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX synchronizations_userid_index ON public.synchronizations USING btree ("userId");


--
-- Name: user_installation_rights_installationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_installation_rights_installationid_index ON public.user_installation_rights USING btree ("installationId");


--
-- Name: user_installation_rights_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_installation_rights_userid_index ON public.user_installation_rights USING btree ("userId");


--
-- Name: user_organization_rights_organizationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_organization_rights_organizationid_index ON public.user_organization_rights USING btree ("organizationId");


--
-- Name: user_organization_rights_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_organization_rights_userid_index ON public.user_organization_rights USING btree ("userId");


--
-- Name: user_repository_rights_repositoryid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_repository_rights_repositoryid_index ON public.user_repository_rights USING btree ("repositoryId");


--
-- Name: user_repository_rights_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_repository_rights_userid_index ON public.user_repository_rights USING btree ("userId");


--
-- Name: users_githubid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_githubid_index ON public.users USING btree ("githubId");


--
-- Name: accounts accounts_forcedplanid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_forcedplanid_foreign FOREIGN KEY ("forcedPlanId") REFERENCES public.plans(id);


--
-- Name: accounts accounts_organizationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_organizationid_foreign FOREIGN KEY ("organizationId") REFERENCES public.organizations(id);


--
-- Name: accounts accounts_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: build_notifications build_notifications_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_notifications
    ADD CONSTRAINT build_notifications_buildid_foreign FOREIGN KEY ("buildId") REFERENCES public.builds(id);


--
-- Name: builds builds_basescreenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builds
    ADD CONSTRAINT builds_basescreenshotbucketid_foreign FOREIGN KEY ("baseScreenshotBucketId") REFERENCES public.screenshot_buckets(id);


--
-- Name: builds builds_comparescreenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builds
    ADD CONSTRAINT builds_comparescreenshotbucketid_foreign FOREIGN KEY ("compareScreenshotBucketId") REFERENCES public.screenshot_buckets(id);


--
-- Name: builds builds_repositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builds
    ADD CONSTRAINT builds_repositoryid_foreign FOREIGN KEY ("repositoryId") REFERENCES public.repositories(id);


--
-- Name: installation_repository_rights installation_repository_rights_installationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installation_repository_rights
    ADD CONSTRAINT installation_repository_rights_installationid_foreign FOREIGN KEY ("installationId") REFERENCES public.installations(id);


--
-- Name: installation_repository_rights installation_repository_rights_repositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.installation_repository_rights
    ADD CONSTRAINT installation_repository_rights_repositoryid_foreign FOREIGN KEY ("repositoryId") REFERENCES public.repositories(id);


--
-- Name: purchases purchases_accountid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_accountid_foreign FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: purchases purchases_planid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_planid_foreign FOREIGN KEY ("planId") REFERENCES public.plans(id);


--
-- Name: repositories repositories_organizationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_organizationid_foreign FOREIGN KEY ("organizationId") REFERENCES public.organizations(id);


--
-- Name: repositories repositories_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repositories
    ADD CONSTRAINT repositories_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: screenshot_buckets screenshot_buckets_repositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_buckets
    ADD CONSTRAINT screenshot_buckets_repositoryid_foreign FOREIGN KEY ("repositoryId") REFERENCES public.repositories(id);


--
-- Name: screenshot_diffs screenshot_diffs_basescreenshotid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_basescreenshotid_foreign FOREIGN KEY ("baseScreenshotId") REFERENCES public.screenshots(id);


--
-- Name: screenshot_diffs screenshot_diffs_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_buildid_foreign FOREIGN KEY ("buildId") REFERENCES public.builds(id);


--
-- Name: screenshot_diffs screenshot_diffs_comparescreenshotid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_comparescreenshotid_foreign FOREIGN KEY ("compareScreenshotId") REFERENCES public.screenshots(id);


--
-- Name: screenshot_diffs screenshot_diffs_fileid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_fileid_foreign FOREIGN KEY ("fileId") REFERENCES public.files(id);


--
-- Name: screenshots screenshots_fileid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots
    ADD CONSTRAINT screenshots_fileid_foreign FOREIGN KEY ("fileId") REFERENCES public.files(id);


--
-- Name: screenshots screenshots_screenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots
    ADD CONSTRAINT screenshots_screenshotbucketid_foreign FOREIGN KEY ("screenshotBucketId") REFERENCES public.screenshot_buckets(id);


--
-- Name: synchronizations synchronizations_installationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.synchronizations
    ADD CONSTRAINT synchronizations_installationid_foreign FOREIGN KEY ("installationId") REFERENCES public.installations(id);


--
-- Name: synchronizations synchronizations_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.synchronizations
    ADD CONSTRAINT synchronizations_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: user_installation_rights user_installation_rights_installationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_installation_rights
    ADD CONSTRAINT user_installation_rights_installationid_foreign FOREIGN KEY ("installationId") REFERENCES public.installations(id);


--
-- Name: user_installation_rights user_installation_rights_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_installation_rights
    ADD CONSTRAINT user_installation_rights_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: user_organization_rights user_organization_rights_organizationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_organization_rights
    ADD CONSTRAINT user_organization_rights_organizationid_foreign FOREIGN KEY ("organizationId") REFERENCES public.organizations(id);


--
-- Name: user_organization_rights user_organization_rights_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_organization_rights
    ADD CONSTRAINT user_organization_rights_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: user_repository_rights user_repository_rights_repositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_repository_rights
    ADD CONSTRAINT user_repository_rights_repositoryid_foreign FOREIGN KEY ("repositoryId") REFERENCES public.repositories(id);


--
-- Name: user_repository_rights user_repository_rights_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_repository_rights
    ADD CONSTRAINT user_repository_rights_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

-- Knex migrations

INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20161217154940_init.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170128163909_screenshot_buckets_drop_column_jobStatus.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170128165351_builds_alter_column_baseScreenshotBucketId.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170128165352_screenshot_diffs_alter_column_score.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170128165353_screenshot_diffs_alter_column_score.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170129135917_link_repositories.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170129213906_screenshot_diffs_add_column_s3id.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170205204435_organization-repository.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170211133332_add_table_synchronizations.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170211153730_users_add_column_accessToken.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170211165500_create_table_user_organization_rights.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170211165501_create_table_user_repository_rights.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170212091412_users_email_remove_not_null.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170212092004_add_column_userId_to_repositories.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170212102433_repositories_alter_column_organization_id.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170222000548_users_name_login.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170222000549_builds_number.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170222222346_add_jobStatus_to_builds.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170304184220_add_constraints.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170304184221_remove_constraints.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170305095107_notifications.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170306205356_new-notifications.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170312191852_users_add_private_enabled.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170312202055_repositories_add_column_private.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170312230324_organizations_login.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170319114827_add_github_scopes_to_users.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170329213934_allow_null_baseScreenshotIds.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170402203440_repository_baseline_branch.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20170628232300_add_scopes_to_users.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20180323213911_screenshot_batches.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20181017110213_indexes.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20190919113147_bucket-status.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20190919154131_job_status_aborted.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20200329104003_github-app.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20200329194617_build-notifications.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20200616135126_build-name.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220803095315_add_plans.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220809113257_add_purchase_end_date.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220812142703_files.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220814071435_screenshot_diffs_indexes.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220902165449_repository_github_default_branch.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220905174153_remove_use_default_branch.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220909111750_add_build_type.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220912221410_add_build_parallel_total.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220918102241_fix_accounts_only_one_non_null_constraint.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220918153730_add_old_build_type.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220919175105_nullable_compare_screenshot_id.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220921142914_remove.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20220927074934_add_missing_accounts.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20221013113904_add_forced_plan.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20221104162900_add_files_dimensions.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20221123165000_add_indexes.js', 1, NOW());