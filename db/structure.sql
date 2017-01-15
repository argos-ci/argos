--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.1
-- Dumped by pg_dump version 9.6.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: builds; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE builds (
    id bigint NOT NULL,
    "baseScreenshotBucketId" bigint NOT NULL,
    "compareScreenshotBucketId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE builds OWNER TO development;

--
-- Name: builds_id_seq; Type: SEQUENCE; Schema: public; Owner: development
--

CREATE SEQUENCE builds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE builds_id_seq OWNER TO development;

--
-- Name: builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: development
--

ALTER SEQUENCE builds_id_seq OWNED BY builds.id;


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE knex_migrations OWNER TO development;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: development
--

CREATE SEQUENCE knex_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE knex_migrations_id_seq OWNER TO development;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: development
--

ALTER SEQUENCE knex_migrations_id_seq OWNED BY knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE knex_migrations_lock (
    is_locked integer
);


ALTER TABLE knex_migrations_lock OWNER TO development;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE organizations (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE organizations OWNER TO development;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: development
--

CREATE SEQUENCE organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE organizations_id_seq OWNER TO development;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: development
--

ALTER SEQUENCE organizations_id_seq OWNED BY organizations.id;


--
-- Name: repositories; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE repositories (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE repositories OWNER TO development;

--
-- Name: repositories_id_seq; Type: SEQUENCE; Schema: public; Owner: development
--

CREATE SEQUENCE repositories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE repositories_id_seq OWNER TO development;

--
-- Name: repositories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: development
--

ALTER SEQUENCE repositories_id_seq OWNED BY repositories.id;


--
-- Name: screenshot_buckets; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE screenshot_buckets (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    commit character varying(255) NOT NULL,
    branch character varying(255) NOT NULL,
    "jobStatus" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE screenshot_buckets OWNER TO development;

--
-- Name: screenshot_buckets_id_seq; Type: SEQUENCE; Schema: public; Owner: development
--

CREATE SEQUENCE screenshot_buckets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE screenshot_buckets_id_seq OWNER TO development;

--
-- Name: screenshot_buckets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: development
--

ALTER SEQUENCE screenshot_buckets_id_seq OWNED BY screenshot_buckets.id;


--
-- Name: screenshot_diffs; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE screenshot_diffs (
    id bigint NOT NULL,
    "buildId" bigint NOT NULL,
    "baseScreenshotId" bigint NOT NULL,
    "compareScreenshotId" bigint NOT NULL,
    score integer NOT NULL,
    "jobStatus" character varying(255) NOT NULL,
    "validationStatus" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE screenshot_diffs OWNER TO development;

--
-- Name: screenshot_diffs_id_seq; Type: SEQUENCE; Schema: public; Owner: development
--

CREATE SEQUENCE screenshot_diffs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE screenshot_diffs_id_seq OWNER TO development;

--
-- Name: screenshot_diffs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: development
--

ALTER SEQUENCE screenshot_diffs_id_seq OWNED BY screenshot_diffs.id;


--
-- Name: screenshots; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE screenshots (
    id bigint NOT NULL,
    "screenshotBucketId" bigint NOT NULL,
    name character varying(255) NOT NULL,
    "s3Id" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE screenshots OWNER TO development;

--
-- Name: screenshots_id_seq; Type: SEQUENCE; Schema: public; Owner: development
--

CREATE SEQUENCE screenshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE screenshots_id_seq OWNER TO development;

--
-- Name: screenshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: development
--

ALTER SEQUENCE screenshots_id_seq OWNED BY screenshots.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: development
--

CREATE TABLE users (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE users OWNER TO development;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: development
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_id_seq OWNER TO development;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: development
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: builds id; Type: DEFAULT; Schema: public; Owner: development
--

ALTER TABLE ONLY builds ALTER COLUMN id SET DEFAULT nextval('builds_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: development
--

ALTER TABLE ONLY knex_migrations ALTER COLUMN id SET DEFAULT nextval('knex_migrations_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: development
--

ALTER TABLE ONLY organizations ALTER COLUMN id SET DEFAULT nextval('organizations_id_seq'::regclass);


--
-- Name: repositories id; Type: DEFAULT; Schema: public; Owner: development
--

ALTER TABLE ONLY repositories ALTER COLUMN id SET DEFAULT nextval('repositories_id_seq'::regclass);


--
-- Name: screenshot_buckets id; Type: DEFAULT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshot_buckets ALTER COLUMN id SET DEFAULT nextval('screenshot_buckets_id_seq'::regclass);


--
-- Name: screenshot_diffs id; Type: DEFAULT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshot_diffs ALTER COLUMN id SET DEFAULT nextval('screenshot_diffs_id_seq'::regclass);


--
-- Name: screenshots id; Type: DEFAULT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshots ALTER COLUMN id SET DEFAULT nextval('screenshots_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: development
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Data for Name: builds; Type: TABLE DATA; Schema: public; Owner: development
--

COPY builds (id, "baseScreenshotBucketId", "compareScreenshotBucketId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: builds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: development
--

SELECT pg_catalog.setval('builds_id_seq', 1, false);


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: development
--

COPY knex_migrations (id, name, batch, migration_time) FROM stdin;
1	20161217154940_init.js	1	2017-01-15 16:21:18.803+00
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: development
--

SELECT pg_catalog.setval('knex_migrations_id_seq', 1, true);


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: development
--

COPY knex_migrations_lock (is_locked) FROM stdin;
0
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: development
--

COPY organizations (id, "githubId", name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: development
--

SELECT pg_catalog.setval('organizations_id_seq', 1, false);


--
-- Data for Name: repositories; Type: TABLE DATA; Schema: public; Owner: development
--

COPY repositories (id, "githubId", name, enabled, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: repositories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: development
--

SELECT pg_catalog.setval('repositories_id_seq', 1, false);


--
-- Data for Name: screenshot_buckets; Type: TABLE DATA; Schema: public; Owner: development
--

COPY screenshot_buckets (id, name, commit, branch, "jobStatus", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: screenshot_buckets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: development
--

SELECT pg_catalog.setval('screenshot_buckets_id_seq', 1, false);


--
-- Data for Name: screenshot_diffs; Type: TABLE DATA; Schema: public; Owner: development
--

COPY screenshot_diffs (id, "buildId", "baseScreenshotId", "compareScreenshotId", score, "jobStatus", "validationStatus", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: screenshot_diffs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: development
--

SELECT pg_catalog.setval('screenshot_diffs_id_seq', 1, false);


--
-- Data for Name: screenshots; Type: TABLE DATA; Schema: public; Owner: development
--

COPY screenshots (id, "screenshotBucketId", name, "s3Id", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: screenshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: development
--

SELECT pg_catalog.setval('screenshots_id_seq', 1, false);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: development
--

COPY users (id, "githubId", name, email, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: development
--

SELECT pg_catalog.setval('users_id_seq', 1, false);


--
-- Name: builds builds_pkey; Type: CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY builds
    ADD CONSTRAINT builds_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: repositories repositories_pkey; Type: CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY repositories
    ADD CONSTRAINT repositories_pkey PRIMARY KEY (id);


--
-- Name: screenshot_buckets screenshot_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshot_buckets
    ADD CONSTRAINT screenshot_buckets_pkey PRIMARY KEY (id);


--
-- Name: screenshot_diffs screenshot_diffs_pkey; Type: CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_pkey PRIMARY KEY (id);


--
-- Name: screenshots screenshots_pkey; Type: CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshots
    ADD CONSTRAINT screenshots_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: organizations_githubid_index; Type: INDEX; Schema: public; Owner: development
--

CREATE INDEX organizations_githubid_index ON organizations USING btree ("githubId");


--
-- Name: repositories_enabled_index; Type: INDEX; Schema: public; Owner: development
--

CREATE INDEX repositories_enabled_index ON repositories USING btree (enabled);


--
-- Name: repositories_githubid_index; Type: INDEX; Schema: public; Owner: development
--

CREATE INDEX repositories_githubid_index ON repositories USING btree ("githubId");


--
-- Name: screenshot_buckets_commit_index; Type: INDEX; Schema: public; Owner: development
--

CREATE INDEX screenshot_buckets_commit_index ON screenshot_buckets USING btree (commit);


--
-- Name: screenshot_buckets_name_index; Type: INDEX; Schema: public; Owner: development
--

CREATE INDEX screenshot_buckets_name_index ON screenshot_buckets USING btree (name);


--
-- Name: screenshots_name_index; Type: INDEX; Schema: public; Owner: development
--

CREATE INDEX screenshots_name_index ON screenshots USING btree (name);


--
-- Name: screenshots_s3id_index; Type: INDEX; Schema: public; Owner: development
--

CREATE INDEX screenshots_s3id_index ON screenshots USING btree ("s3Id");


--
-- Name: users_githubid_index; Type: INDEX; Schema: public; Owner: development
--

CREATE INDEX users_githubid_index ON users USING btree ("githubId");


--
-- Name: builds builds_basescreenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY builds
    ADD CONSTRAINT builds_basescreenshotbucketid_foreign FOREIGN KEY ("baseScreenshotBucketId") REFERENCES screenshot_buckets(id);


--
-- Name: builds builds_comparescreenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY builds
    ADD CONSTRAINT builds_comparescreenshotbucketid_foreign FOREIGN KEY ("compareScreenshotBucketId") REFERENCES screenshot_buckets(id);


--
-- Name: screenshot_diffs screenshot_diffs_basescreenshotid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_basescreenshotid_foreign FOREIGN KEY ("baseScreenshotId") REFERENCES screenshots(id);


--
-- Name: screenshot_diffs screenshot_diffs_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_buildid_foreign FOREIGN KEY ("buildId") REFERENCES builds(id);


--
-- Name: screenshot_diffs screenshot_diffs_comparescreenshotid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_comparescreenshotid_foreign FOREIGN KEY ("compareScreenshotId") REFERENCES screenshots(id);


--
-- Name: screenshots screenshots_screenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: development
--

ALTER TABLE ONLY screenshots
    ADD CONSTRAINT screenshots_screenshotbucketid_foreign FOREIGN KEY ("screenshotBucketId") REFERENCES screenshot_buckets(id);


--
-- PostgreSQL database dump complete
--

