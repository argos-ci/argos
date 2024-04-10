import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import cors from "cors";
import { Router } from "express";
import { stringify } from "yaml";

import { Build } from "@/database/models/Build.js";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { schema } from "./schema.js";
import { errorHandler, get } from "./util.js";

const router = Router();

router.use(
  cors({
    origin: ["https://editor.swagger.io", "https://editor-next.swagger.io/"],
  }),
);

router.get("/openapi.yaml", (_req, res) => {
  res.set("Content-Type", "text/yaml");
  const yamlSchema = stringify(schema);
  res.send(yamlSchema);
});

get(
  router,
  "/projects/{owner}/{project}/builds/{buildNumber}",
  repoAuth,
  async (req, res) => {
    const { owner, project, buildNumber } = req.params;
    if (!req.authProject) {
      throw boom(401, "Not authorized");
    }

    if (project !== req.authProject.name) {
      throw boom(404, "Build not found");
    }

    const build = await Build.query()
      .joinRelated("account")
      .where("account.slug", owner)
      .where({
        projectId: req.authProject.id,
        number: buildNumber,
      })
      .first();

    if (!build) {
      throw boom(404, "Build not found");
    }

    const [status] = await Build.getAggregatedBuildStatuses([build]);
    invariant(status);

    res.json({ id: build.id, number: build.number, status });
  },
);

router.use(Sentry.Handlers.errorHandler());
router.use(errorHandler);

export { router as openAPIRouter };
