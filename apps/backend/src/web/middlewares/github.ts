import { createNodeMiddleware, Webhooks } from "@octokit/webhooks";
import { Router } from "express";
import { z } from "zod";

import config from "@/config";
import { transaction } from "@/database";
import { Account, GithubInstallation } from "@/database/models";
import { checkOctokitErrorStatus, getAppOctokit } from "@/github";
import logger from "@/logger";
import {
  handleGitHubEvents,
  synchronizeFromInstallationId,
} from "@/synchronize";
import { getOrCreateInstallation } from "@/synchronize/github/eventHelpers";

import { asyncHandler } from "../util";

function createWebhooksHandler(input: {
  app: GithubInstallation["app"];
  secret: string;
  fallbackSecret?: string;
}) {
  const webhooks = new Webhooks({
    secret: input.secret,
    additionalSecrets: input.fallbackSecret ? [input.fallbackSecret] : [],
  });

  webhooks.onAny(async (event) => {
    await handleGitHubEvents(input.app, event);
  });

  webhooks.onError((error) => {
    logger.error({ error }, "GitHub webhook handler error");
  });

  return webhooks;
}

const router = Router();

const mainMiddleware = createNodeMiddleware(
  createWebhooksHandler({
    app: "main",
    secret: config.get("github.webhookSecret"),
    fallbackSecret: config.get("github.fallbackWebhookSecret"),
  }),
  { path: "/github/event-handler" },
);

router.use((req, res, next) => {
  mainMiddleware(req, res, next);
});

const lightMiddleware = createNodeMiddleware(
  createWebhooksHandler({
    app: "light",
    secret: config.get("githubLight.webhookSecret"),
    fallbackSecret: config.get("githubLight.fallbackWebhookSecret"),
  }),
  { path: "/github-light/event-handler" },
);

router.use((req, res, next) => {
  lightMiddleware(req, res, next);
});

const QuerySchema = z.object({
  installation_id: z.coerce.number(),
  setup_action: z.literal("install"),
  state: z.string(),
});
const StateSchema = z.object({ accountId: z.string() });

function parseState(input: unknown) {
  if (typeof input !== "string") {
    return null;
  }

  try {
    return StateSchema.parse(JSON.parse(input));
  } catch {
    return null;
  }
}

/**
 * GitHub sends the user to the setup URL right after creating the
 * installation, but nothing in that URL is signed: anyone can visit it with
 * the id of an installation that is not theirs. The one the user just made is
 * brand new, and nobody owns it yet.
 */
const MAX_NEW_INSTALLATION_AGE = 60 * 60 * 1000;

/**
 * Check if GitHub created a light app installation moments ago.
 */
async function checkIsNewLightInstallation(installationId: number) {
  const octokit = getAppOctokit({ app: "light", proxy: false });
  const ghInstallation = await octokit.apps
    .getInstallation({ installation_id: installationId })
    .then((res) => res.data)
    .catch((error: unknown) => {
      if (checkOctokitErrorStatus(404, error)) {
        return null;
      }
      throw error;
    });
  if (!ghInstallation) {
    return false;
  }
  const age = Date.now() - new Date(ghInstallation.created_at).getTime();
  return age < MAX_NEW_INSTALLATION_AGE;
}

/**
 * Link a light installation to an account, unless another account owns it.
 */
async function linkLightInstallation(
  account: Account,
  installation: GithubInstallation,
) {
  return transaction(async (trx) => {
    // Two accounts linking the same installation would both find it unowned:
    // the lock makes the second one wait, and then see the first one's link.
    await GithubInstallation.query(trx).findById(installation.id).forUpdate();
    const owner = await Account.query(trx)
      .select("id")
      .where("githubLightInstallationId", installation.id)
      .whereNot("id", account.id)
      .first();
    if (owner) {
      return false;
    }
    await account
      .$query(trx)
      .patch({ githubLightInstallationId: installation.id });
    return true;
  });
}

router.get(
  "/github-light/install",
  asyncHandler(async (req, res) => {
    const query = QuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).send("Invalid query parameters");
      return;
    }

    const state = parseState(query.data.state);
    if (!state) {
      res.status(400).send("Invalid state");
      return;
    }

    const account = await Account.query()
      .findById(state.accountId)
      .withGraphFetched("githubLightInstallation");

    if (!account) {
      res.status(400).send("Invalid account");
      return;
    }

    const installation = await (async () => {
      // If the installation already exists, returns it
      if (
        account.githubLightInstallation &&
        !account.githubLightInstallation.deleted &&
        account.githubLightInstallation.githubId === query.data.installation_id
      ) {
        return account.githubLightInstallation;
      }
      if (!(await checkIsNewLightInstallation(query.data.installation_id))) {
        return null;
      }
      // If the installation does not exist, create it
      const installation = await getOrCreateInstallation({
        githubId: query.data.installation_id,
        app: "light",
      });
      const linked = await linkLightInstallation(account, installation);
      return linked ? installation : null;
    })();

    if (!installation) {
      res.status(400).send("Invalid installation");
      return;
    }

    await synchronizeFromInstallationId(installation.id);

    const url = new URL(
      `/${account.slug}/settings#github-without-content-access`,
      config.get("server.url"),
    );
    res.redirect(String(url));
    return;
  }),
);

export const apiMiddleware: Router = router;
