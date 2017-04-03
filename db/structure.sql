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

--
-- Name: build_notifications_type; Type: TYPE; Schema: public; Owner: argos
--

CREATE TYPE build_notifications_type AS ENUM (
    'progress',
    'no-diff-detected',
    'diff-detected',
    'diff-accepted',
    'diff-rejected'
);


ALTER TYPE build_notifications_type OWNER TO argos;

--
-- Name: job_status; Type: TYPE; Schema: public; Owner: argos
--

CREATE TYPE job_status AS ENUM (
    'pending',
    'progress',
    'complete',
    'error'
);


ALTER TYPE job_status OWNER TO argos;

--
-- Name: service_type; Type: TYPE; Schema: public; Owner: argos
--

CREATE TYPE service_type AS ENUM (
    'github'
);


ALTER TYPE service_type OWNER TO argos;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: build_notifications; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE build_notifications (
    id bigint NOT NULL,
    type build_notifications_type NOT NULL,
    "jobStatus" job_status NOT NULL,
    "buildId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE build_notifications OWNER TO argos;

--
-- Name: build_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE build_notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE build_notifications_id_seq OWNER TO argos;

--
-- Name: build_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE build_notifications_id_seq OWNED BY build_notifications.id;


--
-- Name: builds; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE builds (
    id bigint NOT NULL,
    "baseScreenshotBucketId" bigint,
    "compareScreenshotBucketId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "repositoryId" bigint NOT NULL,
    number integer NOT NULL,
    "jobStatus" job_status
);


ALTER TABLE builds OWNER TO argos;

--
-- Name: builds_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE builds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE builds_id_seq OWNER TO argos;

--
-- Name: builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE builds_id_seq OWNED BY builds.id;


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE knex_migrations OWNER TO argos;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE knex_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE knex_migrations_id_seq OWNER TO argos;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE knex_migrations_id_seq OWNED BY knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE knex_migrations_lock (
    is_locked integer
);


ALTER TABLE knex_migrations_lock OWNER TO argos;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE organizations (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    login character varying(255) NOT NULL
);


ALTER TABLE organizations OWNER TO argos;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE organizations_id_seq OWNER TO argos;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE organizations_id_seq OWNED BY organizations.id;


--
-- Name: repositories; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE repositories (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    token character varying(255),
    "organizationId" bigint,
    "userId" bigint,
    private boolean DEFAULT false NOT NULL,
    "baselineBranch" character varying(255) NOT NULL
);


ALTER TABLE repositories OWNER TO argos;

--
-- Name: repositories_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE repositories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE repositories_id_seq OWNER TO argos;

--
-- Name: repositories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE repositories_id_seq OWNED BY repositories.id;


--
-- Name: screenshot_buckets; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE screenshot_buckets (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    commit character varying(255) NOT NULL,
    branch character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "repositoryId" bigint NOT NULL
);


ALTER TABLE screenshot_buckets OWNER TO argos;

--
-- Name: screenshot_buckets_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE screenshot_buckets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE screenshot_buckets_id_seq OWNER TO argos;

--
-- Name: screenshot_buckets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE screenshot_buckets_id_seq OWNED BY screenshot_buckets.id;


--
-- Name: screenshot_diffs; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE screenshot_diffs (
    id bigint NOT NULL,
    "buildId" bigint NOT NULL,
    "baseScreenshotId" bigint,
    "compareScreenshotId" bigint NOT NULL,
    score numeric(10,5),
    "jobStatus" job_status,
    "validationStatus" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "s3Id" character varying(255)
);


ALTER TABLE screenshot_diffs OWNER TO argos;

--
-- Name: screenshot_diffs_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE screenshot_diffs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE screenshot_diffs_id_seq OWNER TO argos;

--
-- Name: screenshot_diffs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE screenshot_diffs_id_seq OWNED BY screenshot_diffs.id;


--
-- Name: screenshots; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE screenshots (
    id bigint NOT NULL,
    "screenshotBucketId" bigint NOT NULL,
    name character varying(255) NOT NULL,
    "s3Id" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE screenshots OWNER TO argos;

--
-- Name: screenshots_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE screenshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE screenshots_id_seq OWNER TO argos;

--
-- Name: screenshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE screenshots_id_seq OWNED BY screenshots.id;


--
-- Name: synchronizations; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE synchronizations (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "jobStatus" job_status,
    type service_type,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE synchronizations OWNER TO argos;

--
-- Name: synchronizations_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE synchronizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE synchronizations_id_seq OWNER TO argos;

--
-- Name: synchronizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE synchronizations_id_seq OWNED BY synchronizations.id;


--
-- Name: user_organization_rights; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE user_organization_rights (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE user_organization_rights OWNER TO argos;

--
-- Name: user_organization_rights_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE user_organization_rights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE user_organization_rights_id_seq OWNER TO argos;

--
-- Name: user_organization_rights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE user_organization_rights_id_seq OWNED BY user_organization_rights.id;


--
-- Name: user_repository_rights; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE user_repository_rights (
    id bigint NOT NULL,
    "userId" bigint NOT NULL,
    "repositoryId" bigint NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE user_repository_rights OWNER TO argos;

--
-- Name: user_repository_rights_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE user_repository_rights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE user_repository_rights_id_seq OWNER TO argos;

--
-- Name: user_repository_rights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE user_repository_rights_id_seq OWNED BY user_repository_rights.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: argos
--

CREATE TABLE users (
    id bigint NOT NULL,
    "githubId" integer NOT NULL,
    name character varying(255),
    email character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "accessToken" character varying(255),
    login character varying(255) NOT NULL,
    "privateSync" boolean DEFAULT false NOT NULL,
    "githubScopes" jsonb
);


ALTER TABLE users OWNER TO argos;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: argos
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_id_seq OWNER TO argos;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: argos
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: build_notifications id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY build_notifications ALTER COLUMN id SET DEFAULT nextval('build_notifications_id_seq'::regclass);


--
-- Name: builds id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY builds ALTER COLUMN id SET DEFAULT nextval('builds_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY knex_migrations ALTER COLUMN id SET DEFAULT nextval('knex_migrations_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY organizations ALTER COLUMN id SET DEFAULT nextval('organizations_id_seq'::regclass);


--
-- Name: repositories id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY repositories ALTER COLUMN id SET DEFAULT nextval('repositories_id_seq'::regclass);


--
-- Name: screenshot_buckets id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshot_buckets ALTER COLUMN id SET DEFAULT nextval('screenshot_buckets_id_seq'::regclass);


--
-- Name: screenshot_diffs id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshot_diffs ALTER COLUMN id SET DEFAULT nextval('screenshot_diffs_id_seq'::regclass);


--
-- Name: screenshots id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshots ALTER COLUMN id SET DEFAULT nextval('screenshots_id_seq'::regclass);


--
-- Name: synchronizations id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY synchronizations ALTER COLUMN id SET DEFAULT nextval('synchronizations_id_seq'::regclass);


--
-- Name: user_organization_rights id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_organization_rights ALTER COLUMN id SET DEFAULT nextval('user_organization_rights_id_seq'::regclass);


--
-- Name: user_repository_rights id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_repository_rights ALTER COLUMN id SET DEFAULT nextval('user_repository_rights_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: argos
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Name: build_notifications build_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY build_notifications
    ADD CONSTRAINT build_notifications_pkey PRIMARY KEY (id);


--
-- Name: builds builds_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY builds
    ADD CONSTRAINT builds_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: repositories repositories_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY repositories
    ADD CONSTRAINT repositories_pkey PRIMARY KEY (id);


--
-- Name: screenshot_buckets screenshot_buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshot_buckets
    ADD CONSTRAINT screenshot_buckets_pkey PRIMARY KEY (id);


--
-- Name: screenshot_diffs screenshot_diffs_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_pkey PRIMARY KEY (id);


--
-- Name: screenshots screenshots_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshots
    ADD CONSTRAINT screenshots_pkey PRIMARY KEY (id);


--
-- Name: synchronizations synchronizations_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY synchronizations
    ADD CONSTRAINT synchronizations_pkey PRIMARY KEY (id);


--
-- Name: user_organization_rights user_organization_rights_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_organization_rights
    ADD CONSTRAINT user_organization_rights_pkey PRIMARY KEY (id);


--
-- Name: user_organization_rights user_organization_rights_userid_organizationid_unique; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_organization_rights
    ADD CONSTRAINT user_organization_rights_userid_organizationid_unique UNIQUE ("userId", "organizationId");


--
-- Name: user_repository_rights user_repository_rights_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_repository_rights
    ADD CONSTRAINT user_repository_rights_pkey PRIMARY KEY (id);


--
-- Name: user_repository_rights user_repository_rights_userid_repositoryid_unique; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_repository_rights
    ADD CONSTRAINT user_repository_rights_userid_repositoryid_unique UNIQUE ("userId", "repositoryId");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: build_notifications_buildid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX build_notifications_buildid_index ON build_notifications USING btree ("buildId");


--
-- Name: builds_number_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX builds_number_index ON builds USING btree (number);


--
-- Name: organizations_githubid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX organizations_githubid_index ON organizations USING btree ("githubId");


--
-- Name: repositories_enabled_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX repositories_enabled_index ON repositories USING btree (enabled);


--
-- Name: repositories_githubid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX repositories_githubid_index ON repositories USING btree ("githubId");


--
-- Name: repositories_organizationid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX repositories_organizationid_index ON repositories USING btree ("organizationId");


--
-- Name: repositories_token_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX repositories_token_index ON repositories USING btree (token);


--
-- Name: repositories_userid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX repositories_userid_index ON repositories USING btree ("userId");


--
-- Name: screenshot_buckets_commit_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX screenshot_buckets_commit_index ON screenshot_buckets USING btree (commit);


--
-- Name: screenshot_buckets_name_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX screenshot_buckets_name_index ON screenshot_buckets USING btree (name);


--
-- Name: screenshots_name_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX screenshots_name_index ON screenshots USING btree (name);


--
-- Name: screenshots_s3id_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX screenshots_s3id_index ON screenshots USING btree ("s3Id");


--
-- Name: synchronizations_jobstatus_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX synchronizations_jobstatus_index ON synchronizations USING btree ("jobStatus");


--
-- Name: synchronizations_type_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX synchronizations_type_index ON synchronizations USING btree (type);


--
-- Name: synchronizations_userid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX synchronizations_userid_index ON synchronizations USING btree ("userId");


--
-- Name: user_organization_rights_organizationid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX user_organization_rights_organizationid_index ON user_organization_rights USING btree ("organizationId");


--
-- Name: user_organization_rights_userid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX user_organization_rights_userid_index ON user_organization_rights USING btree ("userId");


--
-- Name: user_repository_rights_repositoryid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX user_repository_rights_repositoryid_index ON user_repository_rights USING btree ("repositoryId");


--
-- Name: user_repository_rights_userid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX user_repository_rights_userid_index ON user_repository_rights USING btree ("userId");


--
-- Name: users_githubid_index; Type: INDEX; Schema: public; Owner: argos
--

CREATE INDEX users_githubid_index ON users USING btree ("githubId");


--
-- Name: build_notifications build_notifications_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY build_notifications
    ADD CONSTRAINT build_notifications_buildid_foreign FOREIGN KEY ("buildId") REFERENCES builds(id);


--
-- Name: builds builds_basescreenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY builds
    ADD CONSTRAINT builds_basescreenshotbucketid_foreign FOREIGN KEY ("baseScreenshotBucketId") REFERENCES screenshot_buckets(id);


--
-- Name: builds builds_comparescreenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY builds
    ADD CONSTRAINT builds_comparescreenshotbucketid_foreign FOREIGN KEY ("compareScreenshotBucketId") REFERENCES screenshot_buckets(id);


--
-- Name: builds builds_repositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY builds
    ADD CONSTRAINT builds_repositoryid_foreign FOREIGN KEY ("repositoryId") REFERENCES repositories(id);


--
-- Name: repositories repositories_organizationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY repositories
    ADD CONSTRAINT repositories_organizationid_foreign FOREIGN KEY ("organizationId") REFERENCES organizations(id);


--
-- Name: repositories repositories_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY repositories
    ADD CONSTRAINT repositories_userid_foreign FOREIGN KEY ("userId") REFERENCES users(id);


--
-- Name: screenshot_buckets screenshot_buckets_repositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshot_buckets
    ADD CONSTRAINT screenshot_buckets_repositoryid_foreign FOREIGN KEY ("repositoryId") REFERENCES repositories(id);


--
-- Name: screenshot_diffs screenshot_diffs_basescreenshotid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_basescreenshotid_foreign FOREIGN KEY ("baseScreenshotId") REFERENCES screenshots(id);


--
-- Name: screenshot_diffs screenshot_diffs_buildid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_buildid_foreign FOREIGN KEY ("buildId") REFERENCES builds(id);


--
-- Name: screenshot_diffs screenshot_diffs_comparescreenshotid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshot_diffs
    ADD CONSTRAINT screenshot_diffs_comparescreenshotid_foreign FOREIGN KEY ("compareScreenshotId") REFERENCES screenshots(id);


--
-- Name: screenshots screenshots_screenshotbucketid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY screenshots
    ADD CONSTRAINT screenshots_screenshotbucketid_foreign FOREIGN KEY ("screenshotBucketId") REFERENCES screenshot_buckets(id);


--
-- Name: synchronizations synchronizations_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY synchronizations
    ADD CONSTRAINT synchronizations_userid_foreign FOREIGN KEY ("userId") REFERENCES users(id);


--
-- Name: user_organization_rights user_organization_rights_organizationid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_organization_rights
    ADD CONSTRAINT user_organization_rights_organizationid_foreign FOREIGN KEY ("organizationId") REFERENCES organizations(id);


--
-- Name: user_organization_rights user_organization_rights_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_organization_rights
    ADD CONSTRAINT user_organization_rights_userid_foreign FOREIGN KEY ("userId") REFERENCES users(id);


--
-- Name: user_repository_rights user_repository_rights_repositoryid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_repository_rights
    ADD CONSTRAINT user_repository_rights_repositoryid_foreign FOREIGN KEY ("repositoryId") REFERENCES repositories(id);


--
-- Name: user_repository_rights user_repository_rights_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: argos
--

ALTER TABLE ONLY user_repository_rights
    ADD CONSTRAINT user_repository_rights_userid_foreign FOREIGN KEY ("userId") REFERENCES users(id);


--
-- PostgreSQL database dump complete
--

-- Knex migrations

INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20161217154940_init.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170128163909_screenshot_buckets_drop_column_jobStatus.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170128165351_builds_alter_column_baseScreenshotBucketId.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170128165352_screenshot_diffs_alter_column_score.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170128165353_screenshot_diffs_alter_column_score.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170129135917_link_repositories.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170129213906_screenshot_diffs_add_column_s3id.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170205204435_organization-repository.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170211133332_add_table_synchronizations.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170211153730_users_add_column_accessToken.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170211165500_create_table_user_organization_rights.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170211165501_create_table_user_repository_rights.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170212091412_users_email_remove_not_null.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170212092004_add_column_userId_to_repositories.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170212102433_repositories_alter_column_organization_id.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170222000548_users_name_login.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170222000549_builds_number.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170222222346_add_jobStatus_to_builds.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170304184220_add_constraints.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170304184221_remove_constraints.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170305095107_notifications.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170306205356_new-notifications.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170312191852_users_add_private_enabled.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170312202055_repositories_add_column_private.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170312230324_organizations_login.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170319114827_add_github_scopes_to_users.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170329213934_allow_null_baseScreenshotIds.js', 1, NOW());
INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('20170402203440_repository_baseline_branch.js', 1, NOW());
