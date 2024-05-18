import cors from "cors";
import { Router } from "express";
import { stringify } from "yaml";

import { getAuthProjectBuilds } from "./handlers/getAuthProjectBuilds.js";
import { schema } from "./schema.js";
import { errorHandler, registerHandler } from "./util.js";

const router = Router();

// CORS
router.use(
  cors({
    // Allow the Swagger editor to access the OpenAPI schema
    origin: ["https://editor.swagger.io", "https://editor-next.swagger.io"],
  }),
);

// Expose the OpenAPI schema as YAML
router.get("/openapi.yaml", (_req, res) => {
  res.set("Content-Type", "text/yaml");
  const yamlSchema = stringify(schema);
  res.send(yamlSchema);
});

// Register the handlers.
registerHandler(router, getAuthProjectBuilds);

// Error handlers
router.use(errorHandler);

export { router as openAPIRouter };
