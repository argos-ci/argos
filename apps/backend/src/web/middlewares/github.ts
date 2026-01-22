import { createNodeMiddleware, Webhooks } from "@octokit/webhooks";
import { Router } from "express";
import { z } from "zod";

import config from "@/config";
import { Account, GithubInstallation } from "@/database/models";
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
}) {
  const webhooks = new Webhooks({
    secret: input.secret,
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
      // If the installation does not exist, create it
      const installation = await getOrCreateInstallation({
        githubId: query.data.installation_id,
        app: "light",
      });
      await account.$query().patch({
        githubLightInstallationId: installation.id,
      });
      return installation;
    })();

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
