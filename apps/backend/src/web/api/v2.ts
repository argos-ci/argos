import { Router, type Request, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";

import { openAPIRouter } from "@/api";
import config from "@/config";
import { createRedisStore } from "@/util/rate-limit";

const router: Router = Router();

/**
 * The requests `@argos-ci/core` makes to upload a build or a deployment. A CI
 * fleet sends them in bursts — several per shard, and the shards of a run
 * finish together — from a few shared egress IPs (runners behind a NAT
 * gateway, larger runners with static IPs), so they are counted on a budget
 * sized for a fleet, apart from the rest of the API.
 */
const CI_ROUTES = [
  ["post", "/auth/github-actions/oidc/exchange"],
  ["post", "/auth/github-actions/tokenless/exchange"],
  ["get", "/project"],
  ["post", "/baseline"],
  ["post", "/builds"],
  ["put", "/builds/:buildId"],
  ["post", "/builds/finalize"],
  ["post", "/deployments"],
  ["post", "/deployments/:deploymentId/finalize"],
] as const;

const ciRequests = new WeakSet<Request>();

const markCiRequest: RequestHandler = (req, _res, next) => {
  ciRequests.add(req);
  next();
};

for (const [method, path] of CI_ROUTES) {
  router[method](path, markCiRequest);
}

router.use(
  rateLimit({
    windowMs: config.get("api.rateLimit.window"),
    limit: config.get("api.rateLimit.ciLimit"),
    identifier: "ci",
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: createRedisStore("api-ci"),
    skip: (req) => !ciRequests.has(req),
  }),
  rateLimit({
    windowMs: config.get("api.rateLimit.window"),
    limit: config.get("api.rateLimit.limit"),
    identifier: "api",
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: createRedisStore("api"),
    skip: (req) => ciRequests.has(req),
  }),
);
router.use(openAPIRouter);

export default router;
