import { createNodeMiddleware, Webhooks } from "@octokit/webhooks";

import config from "@/config/index.js";
import logger from "@/logger/index.js";
import { handleGitHubEvents } from "@/synchronize/index.js";

const webhooks = new Webhooks({
  secret: config.get("github.webhookSecret"),
});

webhooks.onAny(async (event) => {
  await handleGitHubEvents(event);
});

webhooks.onError((error) => {
  logger.error(error);
});

export const webhooksMiddleware = createNodeMiddleware(webhooks, {
  path: "/github/event-handler",
});
