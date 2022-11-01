import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";

import config from "@argos-ci/config";
import { handleGitHubEvents } from "@argos-ci/synchronize";

const webhooks = new Webhooks({
  secret: config.get("github.webhookSecret"),
});

webhooks.onAny((event) => {
  handleGitHubEvents(event);
});

export default createNodeMiddleware(webhooks, {
  path: "/github/event-handler",
});
