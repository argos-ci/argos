import { ScreenshotMetadataJSONSchema } from "@argos/schemas/screenshot-metadata";
import cors from "cors";
import { Router } from "express";
import { stringify } from "yaml";

import { createBuild } from "./handlers/createBuild";
import { finalizeBuilds } from "./handlers/finalizeBuilds";
import { getAuthProject } from "./handlers/getAuthProject";
import { getAuthProjectBuilds } from "./handlers/getAuthProjectBuilds";
import { getBuild } from "./handlers/getBuild";
import { getBuildDiffs } from "./handlers/getBuildDiffs";
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
registerHandler(router, getAuthProject);
registerHandler(router, getAuthProjectBuilds);
registerHandler(router, getBuild);
registerHandler(router, getBuildDiffs);
registerHandler(router, createBuild);
registerHandler(router, updateBuild);
registerHandler(router, finalizeBuilds);

// Error handlers
router.use(errorHandler);

export { router as openAPIRouter };
