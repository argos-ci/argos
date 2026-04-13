import { ScreenshotMetadataJSONSchema } from "@argos/schemas/screenshot-metadata";
import cors from "cors";
import { Router } from "express";
import { stringify } from "yaml";

import { createBuild } from "./handlers/createBuild";
import { exchangeCliToken } from "./handlers/exchangeCliToken";
import { finalizeBuilds } from "./handlers/finalizeBuilds";
import { getAuthProject } from "./handlers/getAuthProject";
import { getBuild } from "./handlers/getBuild";
import { getBuildDiffs } from "./handlers/getBuildDiffs";
import { getProject } from "./handlers/getProject";
import { getProjectBuilds } from "./handlers/getProjectBuilds";
import { updateBuild } from "./handlers/updateBuild";
import { schema } from "./schema";
import { errorHandler, registerHandler } from "./util";

const router: Router = Router();

// CORS
router.use(
  cors({
    // Allow the Swagger editor to access the OpenAPI schema
    origin: ["https://editor.swagger.io", "https://editor-next.swagger.io"],
  }),
);

router.get("/screenshot-metadata.json", (_req, res) => {
  res.json(ScreenshotMetadataJSONSchema);
});

// Expose the OpenAPI schema as YAML
router.get("/openapi.yaml", (_req, res) => {
  res.set("Content-Type", "text/yaml");
  const yamlSchema = stringify(schema, {
    aliasDuplicateObjects: false,
  });
  res.send(yamlSchema);
});

// Register the handlers.
registerHandler(router, createBuild);
registerHandler(router, exchangeCliToken);
registerHandler(router, finalizeBuilds);
registerHandler(router, getAuthProject);
registerHandler(router, getBuild);
registerHandler(router, getBuildDiffs);
registerHandler(router, getProject);
registerHandler(router, getProjectBuilds);
registerHandler(router, updateBuild);

// Error handlers
router.use(errorHandler);

export { router as openAPIRouter };
