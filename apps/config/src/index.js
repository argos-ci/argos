import convict from "convict";
import dotenv from "dotenv";
import path from "path";
import url from "url";

dotenv.config();

const workers = 5;
const maxConnectionsAllowed = 20;
const freeConnectionsForThirdTools = 2;

const config = convict({
  env: {
    doc: "The application environment",
    format: ["production", "development", "test"],
    default: "development",
    env: "NODE_ENV",
  },
  googleAnalytics: {
    doc: "The tracking id",
    default: "UA-89989315-2",
  },
  api: {
    subdomain: {
      format: String,
      default: "api.dev",
      env: "API_SUBDOMAIN",
    },
  },
  app: {
    subdomain: {
      format: String,
      default: "app.dev",
      env: "APP_SUBDOMAIN",
    },
  },
  server: {
    port: {
      doc: "The server port number",
      format: "port",
      default: 4001,
      env: "PORT",
    },
    logFormat: {
      doc: "The morgan log format to use",
      format: ["dev", "combined", "common", "short", "tiny", ""],
      default: "dev",
    },
    url: {
      doc: "The user public url",
      format: String,
      default: "https://app.argos-ci.dev:4002",
      env: "SERVER_URL",
    },
    sessionSecret: {
      doc: "This is the secret used to sign the session ID cookie.",
      format: String,
      default: "keyboard cat",
      env: "SERVER_SESSION_SECRET",
    },
    secure: {
      doc: "Specify if the server is using https or not.",
      format: Boolean,
      default: false,
    },
    httpsRedirect: {
      doc: "Specify if an https redirection should occur.",
      format: Boolean,
      default: false,
    },
  },
  client: {
    port: {
      doc: "The client port number",
      format: "port",
      default: 4002,
    },
  },
  amqp: {
    url: {
      doc: "RabbitMQ url",
      format: String,
      default: "amqp://localhost",
      env: "CLOUDAMQP_URL",
    },
  },
  s3: {
    screenshotsBucket: {
      doc: "Bucket containing screenshots",
      format: String,
      default: "argos-ci-development",
      env: "AWS_SCREENSHOTS_BUCKET",
    },
  },
  github: {
    appId: {
      doc: "App ID",
      format: String,
      default: "",
      env: "GITHUB_APP_ID",
    },
    privateKey: {
      doc: "Private key",
      format: String,
      default: "",
      env: "GITHUB_APP_PRIVATE_KEY",
    },
    clientId: {
      doc: "Client ID",
      format: String,
      default: "",
      env: "GITHUB_CLIENT_ID",
    },
    clientSecret: {
      doc: "Client Secret",
      format: String,
      default: "",
      env: "GITHUB_CLIENT_SECRET",
    },
    appUrl: {
      format: String,
      default: "https://github.com/apps/argos-ci-dev",
      env: "GITHUB_APP_URL",
    },
    loginUrl: {
      format: String,
      default: `https://github.com/login/oauth/authorize?scope=user:email&client_id=${process.env.GITHUB_CLIENT_ID}`,
    },
    webhookSecret: {
      format: String,
      default: "development",
      env: "GITHUB_WEBHOOK_SECRET",
    },
    marketplaceUrl: {
      doc: "GitHub Marketplace URL",
      format: String,
      default: "https://github.com/marketplace/argos-ci-dev",
      env: "GITHUB_MARKETPLACE_URL",
    },
  },
  redis: {
    url: {
      doc: "Redis url",
      format: String,
      default: "redis://localhost:6379/1",
      env: "REDIS_URL",
    },
  },
  releaseVersion: {
    doc: "Sentry release version",
    format: String,
    default: "dev",
    env: "HEROKU_SLUG_COMMIT",
  },
  sentry: {
    environment: {
      doc: "Sentry environment",
      format: String,
      default: "development",
      env: "NODE_ENV",
    },
    clientDsn: {
      doc: "Sentry client DSN",
      format: String,
      default: "",
      env: "SENTRY_CLIENT_DSN",
    },
    serverDsn: {
      doc: "Sentry server DSN",
      format: String,
      default: "",
      env: "SENTRY_SERVER_DSN",
    },
  },
  pg: {
    migrations: {
      directory: {
        doc: "Migrations directory",
        format: String,
        default: path.join(__dirname, "../../database/migrations"),
      },
    },
    client: {
      doc: "Knex client",
      format: String,
      default: "postgresql",
    },
    pool: {
      min: {
        doc: "Minimum connections per pool",
        format: Number,
        default: 2,
      },
      max: {
        doc: "Maxium connections per pool",
        format: Number,
        default: Math.floor(
          (maxConnectionsAllowed - freeConnectionsForThirdTools) / workers
        ),
      },
    },
    connection: {
      host: {
        doc: "Postgres user",
        format: String,
        default: "127.0.0.1",
      },
      user: {
        doc: "Postgres user",
        format: String,
        default: "postgres",
      },
      database: {
        doc: "Postgres database",
        format: String,
        default: "development",
      },
    },
  },
});

const env = config.get("env");
config.loadFile(path.join(__dirname, `../environments/${env}.json`));
config.validate();

config.set(
  "github.privateKey",
  config.get("github.privateKey").replace(/\\n/g, "\n")
);

if (process.env.DATABASE_URL) {
  const urlParts = url.parse(process.env.DATABASE_URL);
  const [user, password] = urlParts.auth.split(":");

  config.set("pg.connection.host", urlParts.hostname);
  config.set("pg.connection.port", urlParts.port);
  config.set("pg.connection.user", user);
  config.set("pg.connection.password", password);
  config.set("pg.connection.database", urlParts.path.substring(1));
  config.set("pg.connection.ssl", {
    rejectUnauthorized: false,
  });
  config.set("pg.connection.timezone", "utc");
}

export default config;
