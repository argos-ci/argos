--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5 (Homebrew)

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
    "forcedPlanId" bigint,
    "stripeCustomerId" character varying(255),
    "teamId" bigint,
    "githubAccountId" bigint,
    name character varying(255),
    slug character varying(255) NOT NULL,
    "gitlabAccessToken" character varying(255),
    "gitlabBaseUrl" character varying(255),
    "slackInstallationId" bigint,
    "githubLightInstallationId" bigint,
    "meteredSpendLimitByPeriod" integer,
    "blockWhenSpendLimitIsReached" boolean DEFAULT false NOT NULL,
    CONSTRAINT accounts_only_one_owner CHECK ((num_nonnulls("userId", "teamId") = 1))
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


ALTER SEQUENCE public.accounts_id_seq OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: audit_trails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_trails (
    id bigint NOT NULL,
    date timestamp with time zone NOT NULL,
    "projectId" bigint NOT NULL,
    "testId" bigint NOT NULL,
    "userId" bigint NOT NULL,
    action character varying(255) NOT NULL
);


ALTER TABLE public.audit_trails OWNER TO postgres;

--
-- Name: COLUMN audit_trails."projectId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_trails."projectId" IS 'Project related to the action';


--
-- Name: COLUMN audit_trails."testId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_trails."testId" IS 'Test related to the action';


--
-- Name: COLUMN audit_trails."userId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_trails."userId" IS 'User who performed the action';


--
-- Name: COLUMN audit_trails.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_trails.action IS 'Action performed, e.g., ''file.ignored'', ''file.unignored''';


--
-- Name: audit_trails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_trails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_trails_id_seq OWNER TO postgres;

--
-- Name: audit_trails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_trails_id_seq OWNED BY public.audit_trails.id;


--
-- Name: automation_action_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_action_runs (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "jobStatus" character varying(255) NOT NULL,
    conclusion character varying(255),
    "failureReason" text,
    "automationRunId" bigint NOT NULL,
    action character varying(255) NOT NULL,
    "actionPayload" jsonb NOT NULL,
    "processedAt" timestamp with time zone,
    "completedAt" timestamp with time zone,
    CONSTRAINT automation_action_runs_conclusion_requires_completed_status CHECK (((conclusion IS NULL) OR (("jobStatus")::text = 'complete'::text)))
);


ALTER TABLE public.automation_action_runs OWNER TO postgres;

--
-- Name: automation_action_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.automation_action_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.automation_action_runs_id_seq OWNER TO postgres;

--
-- Name: automation_action_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.automation_action_runs_id_seq OWNED BY public.automation_action_runs.id;


--
-- Name: automation_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_rules (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    active boolean DEFAULT true NOT NULL,
    name character varying(255) NOT NULL,
    "projectId" bigint NOT NULL,
    "on" jsonb DEFAULT '[]'::jsonb NOT NULL,
    if jsonb NOT NULL,
    "then" jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public.automation_rules OWNER TO postgres;

--
-- Name: automation_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.automation_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.automation_rules_id_seq OWNER TO postgres;

--
-- Name: automation_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.automation_rules_id_seq OWNED BY public.automation_rules.id;


--
-- Name: automation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_runs (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "jobStatus" character varying(255) NOT NULL,
    "automationRuleId" bigint NOT NULL,
    event character varying(255) NOT NULL,
    "buildId" bigint,
    "buildReviewId" bigint
);


ALTER TABLE public.automation_runs OWNER TO postgres;

--
-- Name: automation_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.automation_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.automation_runs_id_seq OWNER TO postgres;

--
-- Name: automation_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.automation_runs_id_seq OWNED BY public.automation_runs.id;


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


ALTER SEQUENCE public.build_notifications_id_seq OWNER TO postgres;

--
-- Name: build_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.build_notifications_id_seq OWNED BY public.build_notifications.id;


--
-- Name: build_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.build_reviews (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" bigint,
    "buildId" bigint NOT NULL,
    state text NOT NULL,
    CONSTRAINT build_reviews_state_check CHECK ((state = ANY (ARRAY['approved'::text, 'rejected'::text])))
);


ALTER TABLE public.build_reviews OWNER TO postgres;

--
-- Name: build_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.build_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.build_reviews_id_seq OWNER TO postgres;

--
-- Name: build_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.build_reviews_id_seq OWNED BY public.build_reviews.id;


--
-- Name: build_shards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.build_shards (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "buildId" bigint NOT NULL,
    index integer,
    metadata jsonb
);


ALTER TABLE public.build_shards OWNER TO postgres;

--
-- Name: build_shards_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.build_shards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.build_shards_id_seq OWNER TO postgres;

--
-- Name: build_shards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.build_shards_id_seq OWNED BY public.build_shards.id;


--
-- Name: builds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.builds (
    id bigint NOT NULL,
    "baseScreenshotBucketId" bigint,
    "compareScreenshotBucketId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    number integer NOT NULL,
    "jobStatus" public.job_status,
    "externalId" character varying(255),
    "batchCount" integer,
    name character varying(255) DEFAULT 'default'::character varying NOT NULL,
    type text,
    "totalBatch" integer,
    "prNumber" integer,
    "projectId" bigint NOT NULL,
    "baseCommit" character varying(255),
    "baseBranch" character varying(255),
    "githubPullRequestId" bigint,
    "prHeadCommit" character varying(255),
    mode text DEFAULT 'ci'::text NOT NULL,
    "ciProvider" character varying(255),
    "argosSdk" character varying(255),
    "runId" character varying(255),
    "runAttempt" integer,
    partial boolean DEFAULT false NOT NULL,
    metadata jsonb,
    "baseBranchResolvedFrom" text,
    "parentCommits" jsonb,
    conclusion text,
    stats jsonb,
    "finalizedAt" timestamp with time zone,
    "concludedAt" timestamp with time zone,
    CONSTRAINT "builds_baseBranchResolvedFrom_check" CHECK (("baseBranchResolvedFrom" = ANY (ARRAY['user'::text, 'pull-request'::text, 'project'::text]))),
    CONSTRAINT builds_conclusion_check CHECK ((conclusion = ANY (ARRAY['no-changes'::text, 'changes-detected'::text]))),
    CONSTRAINT builds_mode_check CHECK ((mode = ANY (ARRAY['ci'::text, 'monitoring'::text]))),
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


ALTER SEQUENCE public.builds_id_seq OWNER TO postgres;

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
    height integer,
    type text NOT NULL,
    CONSTRAINT files_type_check CHECK ((type = ANY (ARRAY['screenshot'::text, 'screenshotDiff'::text, 'playwrightTrace'::text])))
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


ALTER SEQUENCE public.files_id_seq OWNER TO postgres;

--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: github_account_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.github_account_members (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "githubAccountId" bigint NOT NULL,
    "githubMemberId" bigint NOT NULL
);


ALTER TABLE public.github_account_members OWNER TO postgres;

--
-- Name: github_account_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.github_account_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.github_account_members_id_seq OWNER TO postgres;

--
-- Name: github_account_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.github_account_members_id_seq OWNED BY public.github_account_members.id;


--
-- Name: github_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.github_accounts (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(255),
    email character varying(255),
    login character varying(255) NOT NULL,
    "githubId" integer NOT NULL,
    type text NOT NULL,
    "accessToken" character varying(255),
    scope character varying(255),
    "lastLoggedAt" timestamp with time zone,
    CONSTRAINT github_accounts_type_check CHECK ((type = ANY (ARRAY['user'::text, 'organization'::text, 'bot'::text])))
);


ALTER TABLE public.github_accounts OWNER TO postgres;

--
-- Name: github_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.github_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.github_accounts_id_seq OWNER TO postgres;

--
-- Name: github_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.github_accounts_id_seq OWNED BY public.github_accounts.id;


--
-- Name: github_installations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.github_installations (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "githubId" integer NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    "githubToken" character varying(255),
    "githubTokenExpiresAt" timestamp with time zone,
    app text DEFAULT 'main'::text NOT NULL,
    proxy boolean DEFAULT false NOT NULL,
    CONSTRAINT github_installations_app_check CHECK ((app = ANY (ARRAY['main'::text, 'light'::text])))
);


ALTER TABLE public.github_installations OWNER TO postgres;

--
-- Name: github_installations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.github_installations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.github_installations_id_seq OWNER TO postgres;

--
-- Name: github_installations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.github_installations_id_seq OWNED BY public.github_installations.id;


--
-- Name: github_pull_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.github_pull_requests (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "commentDeleted" boolean DEFAULT false NOT NULL,
    "commentId" bigint,
    "githubRepositoryId" bigint NOT NULL,
    number integer NOT NULL,
    "jobStatus" character varying(255) NOT NULL,
    title character varying(255),
    "baseRef" character varying(255),
    "baseSha" character varying(255),
    state text,
    date timestamp with time zone,
    "closedAt" timestamp with time zone,
    "mergedAt" timestamp with time zone,
    "creatorId" bigint,
    merged boolean,
    draft boolean,
    CONSTRAINT github_pull_requests_state_check CHECK ((state = ANY (ARRAY['open'::text, 'closed'::text])))
);


ALTER TABLE public.github_pull_requests OWNER TO postgres;

--
-- Name: github_pull_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.github_pull_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.github_pull_requests_id_seq OWNER TO postgres;

--
-- Name: github_pull_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.github_pull_requests_id_seq OWNED BY public.github_pull_requests.id;


--
-- Name: github_repositories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.github_repositories (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(255) NOT NULL,
    private boolean NOT NULL,
    "defaultBranch" character varying(255) NOT NULL,
    "githubId" integer NOT NULL,
    "githubAccountId" bigint NOT NULL
);


ALTER TABLE public.github_repositories OWNER TO postgres;

--
-- Name: github_repositories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.github_repositories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.github_repositories_id_seq OWNER TO postgres;

--
-- Name: github_repositories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.github_repositories_id_seq OWNED BY public.github_repositories.id;


--
-- Name: github_repository_installations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.github_repository_installations (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "githubRepositoryId" bigint NOT NULL,
    "githubInstallationId" bigint NOT NULL
);


ALTER TABLE public.github_repository_installations OWNER TO postgres;

--
-- Name: github_repository_installations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.github_repository_installations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.github_repository_installations_id_seq OWNER TO postgres;

--
-- Name: github_repository_installations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.github_repository_installations_id_seq OWNED BY public.github_repository_installations.id;


--
-- Name: github_synchronizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.github_synchronizations (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "jobStatus" public.job_status NOT NULL,
    "githubInstallationId" bigint NOT NULL
);


ALTER TABLE public.github_synchronizations OWNER TO postgres;

--
-- Name: github_synchronizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.github_synchronizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.github_synchronizations_id_seq OWNER TO postgres;

--
-- Name: github_synchronizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.github_synchronizations_id_seq OWNED BY public.github_synchronizations.id;


--
-- Name: gitlab_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gitlab_projects (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(255) NOT NULL,
    path character varying(255) NOT NULL,
    "pathWithNamespace" character varying(255) NOT NULL,
    visibility text NOT NULL,
    "defaultBranch" character varying(255) NOT NULL,
    "gitlabId" integer NOT NULL,
    CONSTRAINT gitlab_projects_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'internal'::text, 'private'::text])))
);


ALTER TABLE public.gitlab_projects OWNER TO postgres;

--
-- Name: gitlab_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gitlab_projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gitlab_projects_id_seq OWNER TO postgres;

--
-- Name: gitlab_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gitlab_projects_id_seq OWNED BY public.gitlab_projects.id;


--
-- Name: gitlab_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gitlab_users (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    "gitlabId" integer NOT NULL,
    "accessToken" character varying(255) NOT NULL,
    "accessTokenExpiresAt" timestamp with time zone NOT NULL,
    "refreshToken" character varying(255) NOT NULL,
    "lastLoggedAt" timestamp with time zone
);


ALTER TABLE public.gitlab_users OWNER TO postgres;

--
-- Name: gitlab_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gitlab_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gitlab_users_id_seq OWNER TO postgres;

--
-- Name: gitlab_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gitlab_users_id_seq OWNED BY public.gitlab_users.id;


--
-- Name: google_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.google_users (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "googleId" character varying(255) NOT NULL,
    name character varying(255),
    "primaryEmail" character varying(255),
    emails jsonb,
    "lastLoggedAt" timestamp with time zone
);


ALTER TABLE public.google_users OWNER TO postgres;

--
-- Name: google_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.google_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.google_users_id_seq OWNER TO postgres;

--
-- Name: google_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.google_users_id_seq OWNED BY public.google_users.id;


--
-- Name: ignored_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ignored_files (
    "projectId" bigint NOT NULL,
    "testId" bigint NOT NULL,
    "fileId" bigint NOT NULL
);


ALTER TABLE public.ignored_files OWNER TO postgres;

--
-- Name: COLUMN ignored_files."projectId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ignored_files."projectId" IS 'Project to which the file is ignored in. Files are global, so we need to scope by project';


--
-- Name: COLUMN ignored_files."testId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ignored_files."testId" IS 'Test to which the file is ignored in. Files are global, so we need to scope by test';


--
-- Name: COLUMN ignored_files."fileId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ignored_files."fileId" IS 'File that is ignored';


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


ALTER SEQUENCE public.knex_migrations_id_seq OWNER TO postgres;

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


ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: notification_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_messages (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "jobStatus" public.job_status NOT NULL,
    "userId" bigint NOT NULL,
    "workflowId" bigint NOT NULL,
    channel character varying(255) NOT NULL,
    "sentAt" timestamp with time zone,
    "deliveredAt" timestamp with time zone,
    "linkClickedAt" timestamp with time zone,
    "externalId" character varying(255)
);


ALTER TABLE public.notification_messages OWNER TO postgres;

--
-- Name: notification_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_messages_id_seq OWNER TO postgres;

--
-- Name: notification_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_messages_id_seq OWNED BY public.notification_messages.id;


--
-- Name: notification_workflow_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_workflow_recipients (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" bigint NOT NULL,
    "workflowId" bigint NOT NULL
);


ALTER TABLE public.notification_workflow_recipients OWNER TO postgres;

--
-- Name: notification_workflow_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_workflow_recipients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_workflow_recipients_id_seq OWNER TO postgres;

--
-- Name: notification_workflow_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_workflow_recipients_id_seq OWNED BY public.notification_workflow_recipients.id;


--
-- Name: notification_workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_workflows (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "jobStatus" public.job_status NOT NULL,
    type character varying(255) NOT NULL,
    data jsonb NOT NULL
);


ALTER TABLE public.notification_workflows OWNER TO postgres;

--
-- Name: notification_workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_workflows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_workflows_id_seq OWNER TO postgres;

--
-- Name: notification_workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_workflows_id_seq OWNED BY public.notification_workflows.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(255) NOT NULL,
    "includedScreenshots" integer NOT NULL,
    "githubPlanId" integer,
    "stripeProductId" character varying(255),
    "usageBased" boolean NOT NULL,
    "githubSsoIncluded" boolean DEFAULT false NOT NULL,
    "fineGrainedAccessControlIncluded" boolean DEFAULT false NOT NULL,
    "interval" text DEFAULT 'month'::text NOT NULL,
    CONSTRAINT plans_interval_check CHECK (("interval" = ANY (ARRAY['month'::text, 'year'::text])))
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


ALTER SEQUENCE public.plans_id_seq OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: project_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_users (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" bigint NOT NULL,
    "projectId" bigint NOT NULL,
    "userLevel" text NOT NULL,
    CONSTRAINT "project_users_userLevel_check" CHECK (("userLevel" = ANY (ARRAY['admin'::text, 'reviewer'::text, 'viewer'::text])))
);


ALTER TABLE public.project_users OWNER TO postgres;

--
-- Name: project_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_users_id_seq OWNER TO postgres;

--
-- Name: project_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_users_id_seq OWNED BY public.project_users.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    private boolean,
    "defaultBaseBranch" character varying(255),
    "accountId" bigint NOT NULL,
    "githubRepositoryId" bigint,
    "prCommentEnabled" boolean DEFAULT true NOT NULL,
    "gitlabProjectId" bigint,
    "summaryCheck" text DEFAULT 'auto'::text NOT NULL,
    "autoApprovedBranchGlob" character varying(255),
    "defaultUserLevel" text,
    CONSTRAINT "projects_defaultUserLevel_check" CHECK (("defaultUserLevel" = ANY (ARRAY['admin'::text, 'reviewer'::text, 'viewer'::text]))),
    CONSTRAINT "projects_summaryCheck_check" CHECK (("summaryCheck" = ANY (ARRAY['always'::text, 'auto'::text, 'never'::text])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


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
    complete boolean DEFAULT false NOT NULL,
    "projectId" bigint NOT NULL,
    "screenshotCount" integer,
    mode text DEFAULT 'ci'::text NOT NULL,
    valid boolean NOT NULL,
    "storybookScreenshotCount" integer,
    CONSTRAINT chk_complete_true_screenshotcount_not_null CHECK (((complete = false) OR ("screenshotCount" IS NOT NULL))),
    CONSTRAINT chk_complete_true_storybookscreenshotcount_not_null CHECK (((complete = false) OR ("storybookScreenshotCount" IS NOT NULL))),
    CONSTRAINT screenshot_buckets_mode_check CHECK ((mode = ANY (ARRAY['ci'::text, 'monitoring'::text])))
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


ALTER SEQUENCE public.screenshot_buckets_id_seq OWNER TO postgres;

--
-- Name: screenshot_buckets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.screenshot_buckets_id_seq OWNED BY public.screenshot_buckets.id;


--
-- Name: screenshot_diff_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.screenshot_diff_reviews (
    "buildReviewId" bigint NOT NULL,
    "screenshotDiffId" bigint NOT NULL,
    state text NOT NULL,
    CONSTRAINT screenshot_diff_reviews_state_check CHECK ((state = ANY (ARRAY['approved'::text, 'rejected'::text])))
);


ALTER TABLE public.screenshot_diff_reviews OWNER TO postgres;

--
-- Name: COLUMN screenshot_diff_reviews."buildReviewId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.screenshot_diff_reviews."buildReviewId" IS 'Build review to which the screenshot diff review is related';


--
-- Name: COLUMN screenshot_diff_reviews."screenshotDiffId"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.screenshot_diff_reviews."screenshotDiffId" IS 'Screenshot diff to which the review is related';


--
-- Name: COLUMN screenshot_diff_reviews.state; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.screenshot_diff_reviews.state IS 'State of the screenshot diff review';


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
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "s3Id" character varying(255),
    "fileId" bigint,
    "testId" bigint,
    "group" character varying(255),
    ignored boolean DEFAULT false NOT NULL
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


ALTER SEQUENCE public.screenshot_diffs_id_seq OWNER TO postgres;

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
    name character varying(1024) NOT NULL,
    "s3Id" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "fileId" bigint,
    "testId" bigint,
    metadata jsonb,
    "playwrightTraceFileId" bigint,
    "buildShardId" bigint,
    threshold real,
    "baseName" character varying(1024)
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


ALTER SEQUENCE public.screenshots_id_seq OWNER TO postgres;

--
-- Name: screenshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.screenshots_id_seq OWNED BY public.screenshots.id;


--
-- Name: slack_channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slack_channels (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(255) NOT NULL,
    "slackId" character varying(255) NOT NULL,
    "slackInstallationId" bigint NOT NULL
);


ALTER TABLE public.slack_channels OWNER TO postgres;

--
-- Name: slack_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.slack_channels_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.slack_channels_id_seq OWNER TO postgres;

--
-- Name: slack_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.slack_channels_id_seq OWNED BY public.slack_channels.id;


--
-- Name: slack_installations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slack_installations (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "teamId" character varying(255) NOT NULL,
    "teamName" character varying(255) NOT NULL,
    "teamDomain" character varying(255) NOT NULL,
    installation jsonb NOT NULL,
    "connectedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.slack_installations OWNER TO postgres;

--
-- Name: slack_installations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.slack_installations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.slack_installations_id_seq OWNER TO postgres;

--
-- Name: slack_installations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.slack_installations_id_seq OWNED BY public.slack_installations.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "planId" integer NOT NULL,
    provider text NOT NULL,
    "stripeSubscriptionId" character varying(255),
    "accountId" bigint NOT NULL,
    "subscriberId" bigint,
    "startDate" timestamp with time zone NOT NULL,
    "endDate" timestamp with time zone,
    "trialEndDate" timestamp with time zone,
    "paymentMethodFilled" boolean NOT NULL,
    status character varying(255) NOT NULL,
    "includedScreenshots" integer,
    "additionalScreenshotPrice" real,
    currency character varying(255),
    "usageUpdatedAt" timestamp with time zone,
    CONSTRAINT check_stripe_fields CHECK (((provider <> 'stripe'::text) OR (("stripeSubscriptionId" IS NOT NULL) AND ("subscriberId" IS NOT NULL)))),
    CONSTRAINT subscriptions_provider_check CHECK ((provider = ANY (ARRAY['stripe'::text, 'github'::text])))
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: team_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_users (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "userId" bigint NOT NULL,
    "teamId" bigint NOT NULL,
    "userLevel" text NOT NULL,
    CONSTRAINT "team_users_userLevel_check" CHECK (("userLevel" = ANY (ARRAY['owner'::text, 'member'::text, 'contributor'::text])))
);


ALTER TABLE public.team_users OWNER TO postgres;

--
-- Name: team_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.team_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_users_id_seq OWNER TO postgres;

--
-- Name: team_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.team_users_id_seq OWNED BY public.team_users.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "inviteSecret" character varying(255),
    "ssoGithubAccountId" bigint,
    "defaultUserLevel" text NOT NULL,
    CONSTRAINT "teams_defaultUserLevel_check" CHECK (("defaultUserLevel" = ANY (ARRAY['member'::text, 'contributor'::text])))
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO postgres;

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: test_stats_builds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_stats_builds (
    "testId" bigint NOT NULL,
    date timestamp with time zone NOT NULL,
    value integer NOT NULL
);


ALTER TABLE public.test_stats_builds OWNER TO postgres;

--
-- Name: test_stats_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_stats_changes (
    "testId" bigint NOT NULL,
    "fileId" bigint NOT NULL,
    date timestamp with time zone NOT NULL,
    value integer NOT NULL
);


ALTER TABLE public.test_stats_changes OWNER TO postgres;

--
-- Name: tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tests (
    id bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    name character varying(1024) NOT NULL,
    "buildName" character varying(255) NOT NULL,
    "projectId" bigint NOT NULL
);


ALTER TABLE public.tests OWNER TO postgres;

--
-- Name: tests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tests_id_seq OWNER TO postgres;

--
-- Name: tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tests_id_seq OWNED BY public.tests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "gitlabUserId" bigint,
    staff boolean DEFAULT false,
    "googleUserId" bigint,
    "deletedAt" timestamp with time zone
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


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: audit_trails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trails ALTER COLUMN id SET DEFAULT nextval('public.audit_trails_id_seq'::regclass);


--
-- Name: automation_action_runs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_action_runs ALTER COLUMN id SET DEFAULT nextval('public.automation_action_runs_id_seq'::regclass);


--
-- Name: automation_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_rules ALTER COLUMN id SET DEFAULT nextval('public.automation_rules_id_seq'::regclass);


--
-- Name: automation_runs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_runs ALTER COLUMN id SET DEFAULT nextval('public.automation_runs_id_seq'::regclass);


--
-- Name: build_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_notifications ALTER COLUMN id SET DEFAULT nextval('public.build_notifications_id_seq'::regclass);


--
-- Name: build_reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_reviews ALTER COLUMN id SET DEFAULT nextval('public.build_reviews_id_seq'::regclass);


--
-- Name: build_shards id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_shards ALTER COLUMN id SET DEFAULT nextval('public.build_shards_id_seq'::regclass);


--
-- Name: builds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builds ALTER COLUMN id SET DEFAULT nextval('public.builds_id_seq'::regclass);


--
-- Name: files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: github_account_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_account_members ALTER COLUMN id SET DEFAULT nextval('public.github_account_members_id_seq'::regclass);


--
-- Name: github_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_accounts ALTER COLUMN id SET DEFAULT nextval('public.github_accounts_id_seq'::regclass);


--
-- Name: github_installations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_installations ALTER COLUMN id SET DEFAULT nextval('public.github_installations_id_seq'::regclass);


--
-- Name: github_pull_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_pull_requests ALTER COLUMN id SET DEFAULT nextval('public.github_pull_requests_id_seq'::regclass);


--
-- Name: github_repositories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_repositories ALTER COLUMN id SET DEFAULT nextval('public.github_repositories_id_seq'::regclass);


--
-- Name: github_repository_installations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_repository_installations ALTER COLUMN id SET DEFAULT nextval('public.github_repository_installations_id_seq'::regclass);


--
-- Name: github_synchronizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_synchronizations ALTER COLUMN id SET DEFAULT nextval('public.github_synchronizations_id_seq'::regclass);


--
-- Name: gitlab_projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gitlab_projects ALTER COLUMN id SET DEFAULT nextval('public.gitlab_projects_id_seq'::regclass);


--
-- Name: gitlab_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gitlab_users ALTER COLUMN id SET DEFAULT nextval('public.gitlab_users_id_seq'::regclass);


--
-- Name: google_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_users ALTER COLUMN id SET DEFAULT nextval('public.google_users_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Name: notification_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_messages ALTER COLUMN id SET DEFAULT nextval('public.notification_messages_id_seq'::regclass);


--
-- Name: notification_workflow_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_workflow_recipients ALTER COLUMN id SET DEFAULT nextval('public.notification_workflow_recipients_id_seq'::regclass);


--
-- Name: notification_workflows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_workflows ALTER COLUMN id SET DEFAULT nextval('public.notification_workflows_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: project_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_users ALTER COLUMN id SET DEFAULT nextval('public.project_users_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


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
-- Name: slack_channels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_channels ALTER COLUMN id SET DEFAULT nextval('public.slack_channels_id_seq'::regclass);


--
-- Name: slack_installations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_installations ALTER COLUMN id SET DEFAULT nextval('public.slack_installations_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: team_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_users ALTER COLUMN id SET DEFAULT nextval('public.team_users_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: tests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tests ALTER COLUMN id SET DEFAULT nextval('public.tests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_slackinstallationid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_slackinstallationid_unique UNIQUE ("slackInstallationId");


--
-- Name: accounts accounts_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_slug_unique UNIQUE (slug);


--
-- Name: accounts accounts_userid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_userid_unique UNIQUE ("userId");


--
-- Name: audit_trails audit_trails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trails
    ADD CONSTRAINT audit_trails_pkey PRIMARY KEY (id);


--
-- Name: automation_action_runs automation_action_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_action_runs
    ADD CONSTRAINT automation_action_runs_pkey PRIMARY KEY (id);


--
-- Name: automation_rules automation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT automation_rules_pkey PRIMARY KEY (id);


--
-- Name: automation_runs automation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_runs
    ADD CONSTRAINT automation_runs_pkey PRIMARY KEY (id);


--
-- Name: build_notifications build_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_notifications
    ADD CONSTRAINT build_notifications_pkey PRIMARY KEY (id);


--
-- Name: build_reviews build_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_reviews
    ADD CONSTRAINT build_reviews_pkey PRIMARY KEY (id);


--
-- Name: build_shards build_shards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_shards
    ADD CONSTRAINT build_shards_pkey PRIMARY KEY (id);


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
-- Name: github_account_members github_account_members_githubaccountid_githubmemberid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_account_members
    ADD CONSTRAINT github_account_members_githubaccountid_githubmemberid_unique UNIQUE ("githubAccountId", "githubMemberId");


--
-- Name: github_account_members github_account_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_account_members
    ADD CONSTRAINT github_account_members_pkey PRIMARY KEY (id);


--
-- Name: github_accounts github_accounts_githubid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_accounts
    ADD CONSTRAINT github_accounts_githubid_unique UNIQUE ("githubId");


--
-- Name: github_accounts github_accounts_login_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_accounts
    ADD CONSTRAINT github_accounts_login_unique UNIQUE (login);


--
-- Name: github_accounts github_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_accounts
    ADD CONSTRAINT github_accounts_pkey PRIMARY KEY (id);


--
-- Name: github_installations github_installations_githubid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_installations
    ADD CONSTRAINT github_installations_githubid_unique UNIQUE ("githubId");


--
-- Name: github_installations github_installations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_installations
    ADD CONSTRAINT github_installations_pkey PRIMARY KEY (id);


--
-- Name: github_pull_requests github_pull_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_pull_requests
    ADD CONSTRAINT github_pull_requests_pkey PRIMARY KEY (id);


--
-- Name: github_repositories github_repositories_githubid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_repositories
    ADD CONSTRAINT github_repositories_githubid_unique UNIQUE ("githubId");


--
-- Name: github_repositories github_repositories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_repositories
    ADD CONSTRAINT github_repositories_pkey PRIMARY KEY (id);


--
-- Name: github_repository_installations github_repository_installations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_repository_installations
    ADD CONSTRAINT github_repository_installations_pkey PRIMARY KEY (id);


--
-- Name: github_synchronizations github_synchronizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_synchronizations
    ADD CONSTRAINT github_synchronizations_pkey PRIMARY KEY (id);


--
-- Name: gitlab_projects gitlab_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gitlab_projects
    ADD CONSTRAINT gitlab_projects_pkey PRIMARY KEY (id);


--
-- Name: gitlab_users gitlab_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gitlab_users
    ADD CONSTRAINT gitlab_users_pkey PRIMARY KEY (id);


--
-- Name: google_users google_users_googleid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_users
    ADD CONSTRAINT google_users_googleid_unique UNIQUE ("googleId");


--
-- Name: google_users google_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_users
    ADD CONSTRAINT google_users_pkey PRIMARY KEY (id);


--
-- Name: ignored_files ignored_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ignored_files
    ADD CONSTRAINT ignored_files_pkey PRIMARY KEY ("projectId", "testId", "fileId");


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
-- Name: notification_messages notification_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_messages
    ADD CONSTRAINT notification_messages_pkey PRIMARY KEY (id);


--
-- Name: notification_workflow_recipients notification_workflow_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_workflow_recipients
    ADD CONSTRAINT notification_workflow_recipients_pkey PRIMARY KEY (id);


--
-- Name: notification_workflows notification_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_workflows
    ADD CONSTRAINT notification_workflows_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: project_users project_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_pkey PRIMARY KEY (id);


--
-- Name: project_users project_users_userid_projectid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_userid_projectid_unique UNIQUE ("userId", "projectId");


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: screenshot_buckets screenshot_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_buckets
    ADD CONSTRAINT screenshot_buckets_pkey PRIMARY KEY (id);


--
-- Name: screenshot_diff_reviews screenshot_diff_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diff_reviews
    ADD CONSTRAINT screenshot_diff_reviews_pkey PRIMARY KEY ("buildReviewId", "screenshotDiffId");


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
-- Name: slack_channels slack_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_channels
    ADD CONSTRAINT slack_channels_pkey PRIMARY KEY (id);


--
-- Name: slack_installations slack_installations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_installations
    ADD CONSTRAINT slack_installations_pkey PRIMARY KEY (id);


--
-- Name: slack_installations slack_installations_teamdomain_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_installations
    ADD CONSTRAINT slack_installations_teamdomain_unique UNIQUE ("teamDomain");


--
-- Name: slack_installations slack_installations_teamid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_installations
    ADD CONSTRAINT slack_installations_teamid_unique UNIQUE ("teamId");


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripesubscriptionid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripesubscriptionid_unique UNIQUE ("stripeSubscriptionId");


--
-- Name: team_users team_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_users
    ADD CONSTRAINT team_users_pkey PRIMARY KEY (id);


--
-- Name: team_users team_users_teamid_userid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_users
    ADD CONSTRAINT team_users_teamid_userid_unique UNIQUE ("teamId", "userId");


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: test_stats_builds test_stats_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_stats_builds
    ADD CONSTRAINT test_stats_builds_pkey PRIMARY KEY ("testId", date);


--
-- Name: test_stats_changes test_stats_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_stats_changes
    ADD CONSTRAINT test_stats_changes_pkey PRIMARY KEY ("testId", "fileId", date);


--
-- Name: tests tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_pkey PRIMARY KEY (id);


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
-- Name: accounts_githubaccountid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_githubaccountid_index ON public.accounts USING btree ("githubAccountId");


--
-- Name: accounts_githublightinstallationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_githublightinstallationid_index ON public.accounts USING btree ("githubLightInstallationId");


--
-- Name: accounts_teamid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_teamid_index ON public.accounts USING btree ("teamId");


--
-- Name: accounts_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_userid_index ON public.accounts USING btree ("userId");


--
-- Name: audit_trails_projectid_testid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_trails_projectid_testid_index ON public.audit_trails USING btree ("projectId", "testId");


--
-- Name: automation_action_runs_automationrunid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX automation_action_runs_automationrunid_index ON public.automation_action_runs USING btree ("automationRunId");


--
-- Name: automation_runs_automationruleid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX automation_runs_automationruleid_index ON public.automation_runs USING btree ("automationRuleId");


--
-- Name: build_notifications_buildid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX build_notifications_buildid_index ON public.build_notifications USING btree ("buildId");


--
-- Name: build_reviews_buildid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX build_reviews_buildid_index ON public.build_reviews USING btree ("buildId");


--
-- Name: build_reviews_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX build_reviews_userid_index ON public.build_reviews USING btree ("userId");


--
-- Name: build_shards_buildid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX build_shards_buildid_index ON public.build_shards USING btree ("buildId");


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
-- Name: builds_jobstatus_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builds_jobstatus_index ON public.builds USING btree ("jobStatus");


--
-- Name: builds_number_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builds_number_index ON public.builds USING btree (number);


--
-- Name: builds_projectid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builds_projectid_index ON public.builds USING btree ("projectId");


--
-- Name: builds_runid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX builds_runid_index ON public.builds USING btree ("runId");


--
-- Name: github_account_members_githubaccountid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_account_members_githubaccountid_index ON public.github_account_members USING btree ("githubAccountId");


--
-- Name: github_account_members_githubmemberid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_account_members_githubmemberid_index ON public.github_account_members USING btree ("githubMemberId");


--
-- Name: github_accounts_type_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_accounts_type_index ON public.github_accounts USING btree (type);


--
-- Name: github_repositories_githubaccountid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_repositories_githubaccountid_index ON public.github_repositories USING btree ("githubAccountId");


--
-- Name: github_repositories_name_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_repositories_name_index ON public.github_repositories USING btree (name);


--
-- Name: github_repository_installations_githubinstallationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_repository_installations_githubinstallationid_index ON public.github_repository_installations USING btree ("githubInstallationId");


--
-- Name: github_repository_installations_githubrepositoryid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_repository_installations_githubrepositoryid_index ON public.github_repository_installations USING btree ("githubRepositoryId");


--
-- Name: github_synchronizations_githubinstallationid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_synchronizations_githubinstallationid_index ON public.github_synchronizations USING btree ("githubInstallationId");


--
-- Name: github_synchronizations_jobstatus_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX github_synchronizations_jobstatus_index ON public.github_synchronizations USING btree ("jobStatus");


--
-- Name: notification_messages_externalid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_messages_externalid_index ON public.notification_messages USING btree ("externalId");


--
-- Name: notification_messages_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_messages_userid_index ON public.notification_messages USING btree ("userId");


--
-- Name: notification_messages_workflowid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_messages_workflowid_index ON public.notification_messages USING btree ("workflowId");


--
-- Name: notification_workflow_recipients_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_workflow_recipients_userid_index ON public.notification_workflow_recipients USING btree ("userId");


--
-- Name: notification_workflow_recipients_workflowid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notification_workflow_recipients_workflowid_index ON public.notification_workflow_recipients USING btree ("workflowId");


--
-- Name: plans_githubid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX plans_githubid_index ON public.plans USING btree ("githubPlanId");


--
-- Name: project_users_projectid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_users_projectid_index ON public.project_users USING btree ("projectId");


--
-- Name: project_users_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_users_userid_index ON public.project_users USING btree ("userId");


--
-- Name: projects_accountid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX projects_accountid_index ON public.projects USING btree ("accountId");


--
-- Name: projects_githubrepositoryid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX projects_githubrepositoryid_index ON public.projects USING btree ("githubRepositoryId");


--
-- Name: projects_name_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX projects_name_index ON public.projects USING btree (name);


--
-- Name: projects_token_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX projects_token_index ON public.projects USING btree (token);


--
-- Name: screenshot_buckets_commit_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_buckets_commit_index ON public.screenshot_buckets USING btree (commit);


--
-- Name: screenshot_buckets_complete_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_buckets_complete_index ON public.screenshot_buckets USING btree (complete);


--
-- Name: screenshot_buckets_createdat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_buckets_createdat ON public.screenshot_buckets USING btree ("createdAt");


--
-- Name: screenshot_buckets_name_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_buckets_name_index ON public.screenshot_buckets USING btree (name);


--
-- Name: screenshot_buckets_projectid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_buckets_projectid_index ON public.screenshot_buckets USING btree ("projectId");


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
-- Name: screenshot_diffs_jobstatus_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_diffs_jobstatus_index ON public.screenshot_diffs USING btree ("jobStatus");


--
-- Name: screenshot_diffs_test_id_id_desc_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_diffs_test_id_id_desc_idx ON public.screenshot_diffs USING btree ("testId", id DESC);


--
-- Name: screenshot_diffs_testid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshot_diffs_testid_index ON public.screenshot_diffs USING btree ("testId");


--
-- Name: screenshots_buildshardid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_buildshardid_index ON public.screenshots USING btree ("buildShardId");


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
-- Name: screenshots_playwrighttracefileid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_playwrighttracefileid_index ON public.screenshots USING btree ("playwrightTraceFileId");


--
-- Name: screenshots_s3id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_s3id_index ON public.screenshots USING btree ("s3Id");


--
-- Name: screenshots_screenshotbucketid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_screenshotbucketid_index ON public.screenshots USING btree ("screenshotBucketId");


--
-- Name: screenshots_testid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX screenshots_testid_index ON public.screenshots USING btree ("testId");


--
-- Name: subscriptions_accountid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_accountid_index ON public.subscriptions USING btree ("accountId");


--
-- Name: subscriptions_planid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_planid_index ON public.subscriptions USING btree ("planId");


--
-- Name: subscriptions_subscriberid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_subscriberid_index ON public.subscriptions USING btree ("subscriberId");


--
-- Name: team_users_teamid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_users_teamid_index ON public.team_users USING btree ("teamId");


--
-- Name: team_users_userid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX team_users_userid_index ON public.team_users USING btree ("userId");


--
-- Name: teams_ssogithubaccountid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX teams_ssogithubaccountid_index ON public.teams USING btree ("ssoGithubAccountId");


--
-- Name: tests_projectid_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tests_projectid_index ON public.tests USING btree ("projectId");


--
-- Name: users_googleuserid_fk_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_googleuserid_fk_index ON public.users USING btree ("googleUserId");


--
-- Name: accounts accounts_forcedplanid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_forcedplanid_foreign FOREIGN KEY ("forcedPlanId") REFERENCES public.plans(id);


--
-- Name: accounts accounts_githubaccountid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_githubaccountid_foreign FOREIGN KEY ("githubAccountId") REFERENCES public.github_accounts(id);


--
-- Name: accounts accounts_githublightinstallationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_githublightinstallationid_foreign FOREIGN KEY ("githubLightInstallationId") REFERENCES public.github_installations(id);


--
-- Name: accounts accounts_slackinstallationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_slackinstallationid_foreign FOREIGN KEY ("slackInstallationId") REFERENCES public.slack_installations(id);


--
-- Name: accounts accounts_teamid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_teamid_foreign FOREIGN KEY ("teamId") REFERENCES public.teams(id);


--
-- Name: accounts accounts_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: audit_trails audit_trails_projectid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trails
    ADD CONSTRAINT audit_trails_projectid_foreign FOREIGN KEY ("projectId") REFERENCES public.projects(id);


--
-- Name: audit_trails audit_trails_testid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trails
    ADD CONSTRAINT audit_trails_testid_foreign FOREIGN KEY ("testId") REFERENCES public.tests(id);


--
-- Name: audit_trails audit_trails_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trails
    ADD CONSTRAINT audit_trails_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: automation_action_runs automation_action_runs_automationrunid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_action_runs
    ADD CONSTRAINT automation_action_runs_automationrunid_foreign FOREIGN KEY ("automationRunId") REFERENCES public.automation_runs(id);


--
-- Name: automation_rules automation_rules_projectid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT automation_rules_projectid_foreign FOREIGN KEY ("projectId") REFERENCES public.projects(id);


--
-- Name: automation_runs automation_runs_automationruleid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_runs
    ADD CONSTRAINT automation_runs_automationruleid_foreign FOREIGN KEY ("automationRuleId") REFERENCES public.automation_rules(id);


--
-- Name: automation_runs automation_runs_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_runs
    ADD CONSTRAINT automation_runs_buildid_foreign FOREIGN KEY ("buildId") REFERENCES public.builds(id);


--
-- Name: automation_runs automation_runs_buildreviewid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_runs
    ADD CONSTRAINT automation_runs_buildreviewid_foreign FOREIGN KEY ("buildReviewId") REFERENCES public.build_reviews(id);


--
-- Name: build_notifications build_notifications_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_notifications
    ADD CONSTRAINT build_notifications_buildid_foreign FOREIGN KEY ("buildId") REFERENCES public.builds(id);


--
-- Name: build_reviews build_reviews_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_reviews
    ADD CONSTRAINT build_reviews_buildid_foreign FOREIGN KEY ("buildId") REFERENCES public.builds(id);


--
-- Name: build_reviews build_reviews_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_reviews
    ADD CONSTRAINT build_reviews_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: build_shards build_shards_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.build_shards
    ADD CONSTRAINT build_shards_buildid_foreign FOREIGN KEY ("buildId") REFERENCES public.builds(id);


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
-- Name: builds builds_githubpullrequestid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builds
    ADD CONSTRAINT builds_githubpullrequestid_foreign FOREIGN KEY ("githubPullRequestId") REFERENCES public.github_pull_requests(id);


--
-- Name: builds builds_projectid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.builds
    ADD CONSTRAINT builds_projectid_foreign FOREIGN KEY ("projectId") REFERENCES public.projects(id);


--
-- Name: github_account_members github_account_members_githubaccountid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_account_members
    ADD CONSTRAINT github_account_members_githubaccountid_foreign FOREIGN KEY ("githubAccountId") REFERENCES public.github_accounts(id);


--
-- Name: github_account_members github_account_members_githubmemberid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_account_members
    ADD CONSTRAINT github_account_members_githubmemberid_foreign FOREIGN KEY ("githubMemberId") REFERENCES public.github_accounts(id);


--
-- Name: github_pull_requests github_pull_requests_creatorid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_pull_requests
    ADD CONSTRAINT github_pull_requests_creatorid_foreign FOREIGN KEY ("creatorId") REFERENCES public.github_accounts(id);


--
-- Name: github_pull_requests github_pull_requests_githubrepositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_pull_requests
    ADD CONSTRAINT github_pull_requests_githubrepositoryid_foreign FOREIGN KEY ("githubRepositoryId") REFERENCES public.github_repositories(id);


--
-- Name: github_repositories github_repositories_githubaccountid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_repositories
    ADD CONSTRAINT github_repositories_githubaccountid_foreign FOREIGN KEY ("githubAccountId") REFERENCES public.github_accounts(id);


--
-- Name: github_repository_installations github_repository_installations_githubinstallationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_repository_installations
    ADD CONSTRAINT github_repository_installations_githubinstallationid_foreign FOREIGN KEY ("githubInstallationId") REFERENCES public.github_installations(id);


--
-- Name: github_repository_installations github_repository_installations_githubrepositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_repository_installations
    ADD CONSTRAINT github_repository_installations_githubrepositoryid_foreign FOREIGN KEY ("githubRepositoryId") REFERENCES public.github_repositories(id);


--
-- Name: github_synchronizations github_synchronizations_githubinstallationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.github_synchronizations
    ADD CONSTRAINT github_synchronizations_githubinstallationid_foreign FOREIGN KEY ("githubInstallationId") REFERENCES public.github_installations(id);


--
-- Name: ignored_files ignored_files_fileid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ignored_files
    ADD CONSTRAINT ignored_files_fileid_foreign FOREIGN KEY ("fileId") REFERENCES public.files(id);


--
-- Name: ignored_files ignored_files_projectid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ignored_files
    ADD CONSTRAINT ignored_files_projectid_foreign FOREIGN KEY ("projectId") REFERENCES public.projects(id);


--
-- Name: ignored_files ignored_files_testid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ignored_files
    ADD CONSTRAINT ignored_files_testid_foreign FOREIGN KEY ("testId") REFERENCES public.tests(id);


--
-- Name: notification_messages notification_messages_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_messages
    ADD CONSTRAINT notification_messages_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: notification_messages notification_messages_workflowid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_messages
    ADD CONSTRAINT notification_messages_workflowid_foreign FOREIGN KEY ("workflowId") REFERENCES public.notification_workflows(id);


--
-- Name: notification_workflow_recipients notification_workflow_recipients_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_workflow_recipients
    ADD CONSTRAINT notification_workflow_recipients_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: notification_workflow_recipients notification_workflow_recipients_workflowid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_workflow_recipients
    ADD CONSTRAINT notification_workflow_recipients_workflowid_foreign FOREIGN KEY ("workflowId") REFERENCES public.notification_workflows(id);


--
-- Name: project_users project_users_projectid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_projectid_foreign FOREIGN KEY ("projectId") REFERENCES public.projects(id);


--
-- Name: project_users project_users_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: projects projects_accountid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_accountid_foreign FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: projects projects_githubrepositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_githubrepositoryid_foreign FOREIGN KEY ("githubRepositoryId") REFERENCES public.github_repositories(id);


--
-- Name: projects projects_gitlabprojectid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_gitlabprojectid_foreign FOREIGN KEY ("gitlabProjectId") REFERENCES public.gitlab_projects(id);


--
-- Name: screenshot_buckets screenshot_buckets_projectid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_buckets
    ADD CONSTRAINT screenshot_buckets_projectid_foreign FOREIGN KEY ("projectId") REFERENCES public.projects(id);


--
-- Name: screenshot_diff_reviews screenshot_diff_reviews_buildreviewid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diff_reviews
    ADD CONSTRAINT screenshot_diff_reviews_buildreviewid_foreign FOREIGN KEY ("buildReviewId") REFERENCES public.build_reviews(id);


--
-- Name: screenshot_diff_reviews screenshot_diff_reviews_screenshotdiffid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diff_reviews
    ADD CONSTRAINT screenshot_diff_reviews_screenshotdiffid_foreign FOREIGN KEY ("screenshotDiffId") REFERENCES public.screenshot_diffs(id);


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
-- Name: screenshot_diffs screenshot_diffs_testid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_testid_foreign FOREIGN KEY ("testId") REFERENCES public.tests(id);


--
-- Name: screenshots screenshots_buildshardid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots
    ADD CONSTRAINT screenshots_buildshardid_foreign FOREIGN KEY ("buildShardId") REFERENCES public.build_shards(id);


--
-- Name: screenshots screenshots_fileid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots
    ADD CONSTRAINT screenshots_fileid_foreign FOREIGN KEY ("fileId") REFERENCES public.files(id);


--
-- Name: screenshots screenshots_playwrighttracefileid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots
    ADD CONSTRAINT screenshots_playwrighttracefileid_foreign FOREIGN KEY ("playwrightTraceFileId") REFERENCES public.files(id);


--
-- Name: screenshots screenshots_screenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots
    ADD CONSTRAINT screenshots_screenshotbucketid_foreign FOREIGN KEY ("screenshotBucketId") REFERENCES public.screenshot_buckets(id);


--
-- Name: screenshots screenshots_testid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenshots
    ADD CONSTRAINT screenshots_testid_foreign FOREIGN KEY ("testId") REFERENCES public.tests(id);


--
-- Name: slack_channels slack_channels_slackinstallationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_channels
    ADD CONSTRAINT slack_channels_slackinstallationid_foreign FOREIGN KEY ("slackInstallationId") REFERENCES public.slack_installations(id);


--
-- Name: subscriptions subscriptions_accountid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_accountid_foreign FOREIGN KEY ("accountId") REFERENCES public.accounts(id);


--
-- Name: subscriptions subscriptions_planid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_planid_foreign FOREIGN KEY ("planId") REFERENCES public.plans(id);


--
-- Name: subscriptions subscriptions_subscriberid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_subscriberid_foreign FOREIGN KEY ("subscriberId") REFERENCES public.users(id);


--
-- Name: team_users team_users_teamid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_users
    ADD CONSTRAINT team_users_teamid_foreign FOREIGN KEY ("teamId") REFERENCES public.teams(id);


--
-- Name: team_users team_users_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_users
    ADD CONSTRAINT team_users_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: teams teams_ssogithubaccountid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_ssogithubaccountid_foreign FOREIGN KEY ("ssoGithubAccountId") REFERENCES public.github_accounts(id);


--
-- Name: test_stats_builds test_stats_builds_testid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_stats_builds
    ADD CONSTRAINT test_stats_builds_testid_foreign FOREIGN KEY ("testId") REFERENCES public.tests(id);


--
-- Name: test_stats_changes test_stats_changes_fileid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_stats_changes
    ADD CONSTRAINT test_stats_changes_fileid_foreign FOREIGN KEY ("fileId") REFERENCES public.files(id);


--
-- Name: test_stats_changes test_stats_changes_testid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_stats_changes
    ADD CONSTRAINT test_stats_changes_testid_foreign FOREIGN KEY ("testId") REFERENCES public.tests(id);


--
-- Name: tests tests_projectid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_projectid_foreign FOREIGN KEY ("projectId") REFERENCES public.projects(id);


--
-- Name: users users_gitlabuserid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_gitlabuserid_foreign FOREIGN KEY ("gitlabUserId") REFERENCES public.gitlab_users(id);


--
-- Name: users users_googleuserid_fk_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_googleuserid_fk_foreign FOREIGN KEY ("googleUserId") REFERENCES public.google_users(id);


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
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20221203103833_installation_token.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20221213130347_stripe.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20221228140518_add_missing_accounts.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230102064502_add_forced_private.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230103095309_add_pr_number.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230218100910_add_stability_score.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230313131422_add_tests_table.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230323071510_add_mute_to_tests.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230416201920_crawls.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230417193649_isolate.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230418095958_project-not-null.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230418125037_user-github-account-id.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230418130232_simplify-github-account.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230418133221_simplify-account.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230418154104_remove-github-installation-accounts.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230418191815_non-nullable-github-repo.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230423073805_team-invite-link.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230423170603_slug-unique.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230423195916_no-project-slug.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230426123607_screenshot-diff-index.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230427131915_require_purchase_startDate.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230428122453_vercel-data.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230429125237_add_purchase_trial.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230430182249_multiple-project-repo.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230501135647_add_plan_usage_type.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230503215250_buckets-count.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230504073924_buckets_constraint.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230504075127_buckets_complete_default_false.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230505112219_add_purchase_payment_method_filled.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230524074946_build-reference.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230625185103_vercel-checks.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230703200439_test-name-length.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230708213033_github_pr_comment.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230712193423_purchase-subscription-id.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230714125556_build-pr-head-commit.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230826091827_gitlab_users.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230827144239_gitlab_acess_token.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230830151208_gitlab_projects.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20230930081123_add_diffs_group.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231017142204_screenshot_metadata.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231020163248_github-pull-request-job-status.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231024072202_github-draft-merged.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231024085955_fix-github-account-type-constraint.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231106114751_pw-traces.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231115151718_file-type.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231115160027_playwrightTraceIndex.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231115210334_file-type-not-null.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20231122143018_add-purchase-status.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240108211747_project-status-check.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240121215150_github-sso.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240202080857_staff-user.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240203212814_renaming.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240204080614_subscriptions_included_screenshots.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240219213539_subscriptions_big_integer.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240222154748_not-nullable-payment-method-filled.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240301151709_screenshot-diffs-index.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240307081941_project_users.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240309214656_clean_vercel.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240329130227_googleUserId.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240330152633_gitlab-on-prem.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240428061335_monitoring-mode.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240428200226_monitoring-mode-bucket.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240505121926_slack-installation.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240604133729_comment_id_big_integer.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240614204320_build_shards.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240616142430_build_shards_indices.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240630151704_screenshot-threshold.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240706121810_screenshot-base-name.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240822082247_github-light.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20240901150444_build-metadata.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241006153157_reference-branch.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241008035928_fix-enum.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241011152207_parent-commits.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241201074304_github-access-token.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241201100628_remove-github-access-token.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241201210158_google-account.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241201222408_gitlab-last-loggedat.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241215091232_project-default-role.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20241231154644_build-status.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250102150800_build-review.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250103090503_remove-validation-status-column.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250103131406_plan-interval.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250105124212_spend-management.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250105130307_remove-crawls-captures.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250111204217_user-notifications.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250113180732_clean-additional-screenshot-price.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250119081939_slack_channels.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250202084159_cleanup-test-table.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250505143128_proxy-github.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250523070743_create_automation_tables.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250524183823_clean-stability-store.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250602091017_test-stats.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250607160713_remove-test-activities.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250617171538_slack-connected-at.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250622134309_ignored-files.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250629170855_screenshot-diffs-ignore.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250705083915_deleted-users.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250803194148_storybook-count.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250808202617_screenshot-diff-review.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250808204525_build-review-state.js', 1, NOW());
INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('20250820130012_build-dates.js', 1, NOW());