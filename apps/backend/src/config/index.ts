import convict from "convict";
// eslint-disable-next-line import/default
import dotenv from "dotenv";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const rootDotEnvPath = join(__dirname, "../../../../.env");

dotenv.config({
  path: rootDotEnvPath,
});

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
  contactEmail: {
    doc: "The contact email",
    default: "contact@argos-ci.com",
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
      default: "https://app.argos-ci.dev",
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
    publicImageBaseUrl: {
      doc: "Public URL for screenshots",
      format: String,
      default: "https://ik.imagekit.io/argos/development/",
      env: "S3_PUBLIC_IMAGE_BASE_URL",
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
      default: `https://github.com/login/oauth/authorize?scope=user:email&client_id=${process.env["GITHUB_CLIENT_ID"]}`,
    },
    webhookSecret: {
      format: String,
      default: "development",
      env: "GITHUB_WEBHOOK_SECRET",
    },
    marketplaceUrl: {
      doc: "GitHub Marketplace URL",
      format: String,
      default: "https://github.com/marketplace/argos-ci",
      env: "GITHUB_MARKETPLACE_URL",
    },
  },
  gitlab: {
    appId: {
      doc: "App ID",
      format: String,
      default: "",
      env: "GITLAB_APP_ID",
    },
    appSecret: {
      doc: "App Secret",
      format: String,
      default: "",
      env: "GITLAB_APP_SECRET",
    },
    loginUrl: {
      format: String,
      default: `https://gitlab.com/oauth/authorize?scope=read_user&response_type=code&client_id=${process.env["GITLAB_APP_ID"]}`,
    },
  },
  stripe: {
    url: {
      doc: "Stripe URL",
      format: String,
      default: "https://billing.stripe.com/p/login/test_4gw02U4MgaLvcZWeUU",
      env: "STRIPE_URL",
    },
    apiKey: {
      doc: "Stripe API key",
      format: String,
      default: "",
      env: "STRIPE_API_KEY",
    },
    pricingTableId: {
      doc: "Stripe pricing table ID",
      format: String,
      default: "prctbl_1MFJlUHOD9RpIFZd8XYehmWL",
    },
    publishableKey: {
      doc: "Stripe publishable key",
      format: String,
      default: "pk_test_vdUpuf2Ep9SR8GIfLJYltyCk",
    },
    webhookSecret: {
      doc: "Stripe webhook endpoint secret",
      format: String,
      env: "STRIPE_WEBHOOK_SECRET",
      default: "whsec_XXX",
    },
  },
  vercel: {
    clientId: {
      doc: "Client ID",
      format: String,
      default: "",
      env: "VERCEL_CLIENT_ID",
    },
    clientSecret: {
      doc: "Client Secret",
      format: String,
      default: "",
      env: "VERCEL_CLIENT_SECRET",
    },
    integrationUrl: {
      format: String,
      default: "https://vercel.com/integrations/argos-dev",
      env: "VERCEL_APP_URL",
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
        default: join(__dirname, "../../db/migrations"),
      },
    },
    seeds: {
      directory: {
        doc: "Seeds directory",
        format: String,
        default: join(__dirname, "../../db/seeds"),
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
        doc: "Maximum connections per pool",
        format: Number,
        default: Math.floor(
          (maxConnectionsAllowed - freeConnectionsForThirdTools) / workers,
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
config.loadFile(join(__dirname, `../../config/environments/${env}.json`));
config.validate();

config.set(
  "github.privateKey",
  config.get("github.privateKey").replace(/\\n/g, "\n"),
);

if (process.env["DATABASE_URL"]) {
  const url = new URL(process.env["DATABASE_URL"]);

  config.set("pg.connection.host", url.hostname);
  config.set("pg.connection.port", url.port);
  config.set("pg.connection.user", url.username);
  config.set("pg.connection.password", url.password);
  config.set("pg.connection.database", url.pathname.substring(1));
  config.set("pg.connection.ssl", { rejectUnauthorized: false });
  config.set("pg.connection.timezone", "utc");
}

export default config;
