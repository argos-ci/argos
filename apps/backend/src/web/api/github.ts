import { createNodeMiddleware, Webhooks } from "@octokit/webhooks";

import config from "@/config/index.js";
import { handleGitHubEvents } from "@/synchronize/index.js";

const webhooks = new Webhooks({
  secret: config.get("github.webhookSecret"),
});

webhooks.onAny((event) => {
  handleGitHubEvents(event);
});

export const webhooksMiddleware = createNodeMiddleware(webhooks, {
  path: "/github/event-handler",
});
