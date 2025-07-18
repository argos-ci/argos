import { join } from "node:path";
import { fileURLToPath } from "node:url";
import convict from "convict";
import dotenv from "dotenv";

import { loadDatabaseConfigFromURL } from "./database";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const rootDotEnvPath = join(__dirname, "../../../../.env");

dotenv.config({
  path: rootDotEnvPath,
  quiet: true,
});

const workers = 5;
const maxConnectionsAllowed = 20;
const freeConnectionsForThirdTools = 2;

/**
 * Create the configuration object.
 */
export function createConfig() {
  const config = convict({
    env: {
      doc: "The application environment",
      format: ["production", "development", "test"],
      default: "development",
      env: "NODE_ENV",
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
    csp: {
      scriptSrc: {
        doc: "Content Security Policy script-src",
        format: Array,
        default: [],
        env: "CSP_SCRIPT_SRC",
      },
    },
    api: {
      baseUrl: {
        doc: "The API base URL",
        format: String,
        default: "https://api.argos-ci.dev:4001",
        env: "API_BASE_URL",
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
    resend: {
      apiKey: {
        doc: "Resend API Key",
        format: String,
        default: "",
        env: "RESEND_API_KEY",
      },
      webhookSecret: {
        doc: "Resend webhook secret",
        format: String,
        default: "development",
        env: "RESEND_WEBHOOK_SECRET",
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
        default: "https://files.argos-ci.com/development/",
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
      proxyUrl: {
        doc: "Proxy URL",
        format: String,
        default: "",
        env: "GITHUB_PROXY_URL",
      },
    },
    githubLight: {
      appId: {
        doc: "App ID",
        format: String,
        default: "",
        env: "GITHUB_LIGHT_APP_ID",
      },
      appUrl: {
        format: String,
        default: "https://github.com/apps/argos-ci-light-dev",
        env: "GITHUB_LIGHT_APP_URL",
      },
      privateKey: {
        doc: "Private key",
        format: String,
        default: "",
        env: "GITHUB_LIGHT_APP_PRIVATE_KEY",
      },
      webhookSecret: {
        format: String,
        default: "development",
        env: "GITHUB_LIGHT_WEBHOOK_SECRET",
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
      argosAuthSecret: {
        format: String,
        default: "",
        env: "GITLAB_ARGOS_AUTH_SECRET",
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
        default: "no-api-key",
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
    githubSso: {
      stripeProductId: {
        doc: "GitHub SSO Stripe product ID",
        format: String,
        env: "GITHUB_SSO_STRIPE_PRODUCT_ID",
        default: "prod_PZKO1PwFyJfJyU",
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
      cspReportUri: {
        doc: "CSP report URI",
        format: String,
        default: "",
        env: "SENTRY_CSP_REPORT_URI",
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
        password: {
          doc: "Postgres password",
          format: String,
          default: "",
        },
        database: {
          doc: "Postgres database",
          format: String,
          default: "development",
        },
        ssl: {
          doc: "SSL connection",
          format: Boolean,
          default: false,
        },
        port: {
          doc: "Port",
          format: Number,
          default: 5432,
        },
      },
    },
    discord: {
      webhookUrl: {
        doc: "Discord Webhook URL",
        format: String,
        default: "",
        env: "DISCORD_WEBHOOK_URL",
      },
    },
    google: {
      clientId: {
        doc: "Google client ID",
        format: String,
        default: "",
        env: "GOOGLE_CLIENT_ID",
      },
      clientSecret: {
        doc: "Google client secret",
        format: String,
        default: "",
        env: "GOOGLE_CLIENT_SECRET",
      },
    },
    slack: {
      clientId: {
        doc: "Slack client ID",
        format: String,
        default: "",
        env: "SLACK_CLIENT_ID",
      },
      clientSecret: {
        doc: "Slack client secret",
        format: String,
        default: "",
        env: "SLACK_CLIENT_SECRET",
      },
      signingSecret: {
        doc: "Slack signing secret",
        format: String,
        default: "",
        env: "SLACK_SIGNING_SECRET",
      },
      stateSecret: {
        doc: "Slack state secret",
        format: String,
        default: "",
        env: "SLACK_STATE_SECRET",
      },
    },
    bucket: {
      publishableKey: {
        doc: "Bucket.co (feature-flag) publishable key",
        format: String,
        default: "pub_deve_IEHZxQsLdVrHkzftm4sWDj",
      },
    },
    sqids: {
      // Use a custom alphabet to avoid ambiguous characters.
      // This alphabet is URL-safe and case-insensitive.
      // This alphabet should never change, as it would break existing IDs.
      alphabet: {
        doc: "Custom alphabet for Sqids",
        format: String,
        default: "FN5LTPGRW98EB2X3ZYHDCU0AS7KJQV64MO1I",
        env: "SQIDS_ALPHABET",
      },
    },
  });

  const env = config.get("env");
  config.loadFile(join(__dirname, `../../config/environments/${env}.json`));

  config.set(
    "github.privateKey",
    config.get("github.privateKey").replace(/\\n/g, "\n"),
  );

  if (process.env["DATABASE_URL"]) {
    loadDatabaseConfigFromURL(process.env["DATABASE_URL"], config);
  }

  config.validate();

  return config;
}

export type Config = ReturnType<typeof createConfig>;

export default createConfig();
