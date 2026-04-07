import type { OpenAPIObject } from "openapi3-ts/oas31";
import { createDocument, ZodOpenApiObject } from "zod-openapi";

import config from "@/config";

import { createBuildOperation } from "./handlers/createBuild";
import { finalizeBuildsOperation } from "./handlers/finalizeBuilds";
import { getAuthProjectOperation } from "./handlers/getAuthProject";
import { getBuildOperation } from "./handlers/getBuild";
import { getBuildDiffsOperation } from "./handlers/getBuildDiffs";
import { getProjectOperation } from "./handlers/getProject";
import { getProjectBuildsOperation } from "./handlers/getProjectBuilds";
import { updateBuildOperation } from "./handlers/updateBuild";

export const zodSchema = {
  openapi: "3.1.1",
  info: {
    title: "Argos API",
    version: "2.0.0",
  },
  servers: [
    {
      url: `${config.get("api.baseUrl")}/v2`,
      description: "API Endpoint",
    },
  ],
  components: {
    securitySchemes: {
      tokenAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Project Token",
        description: "A project token is required to access the API.",
      },
    },
  },
  security: [{ tokenAuth: [] }],
  paths: {
    "/builds": {
      post: createBuildOperation,
    },
    "/builds/finalize": {
      post: finalizeBuildsOperation,
    },
    "/project": {
      get: getAuthProjectOperation,
    },
    "/builds/{buildId}": {
      put: updateBuildOperation,
    },
    "/projects/{owner}/{project}": {
      get: getProjectOperation,
    },
    "/projects/{owner}/{project}/builds": {
      get: getProjectBuildsOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}": {
      get: getBuildOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/diffs": {
      get: getBuildDiffsOperation,
    },
  },
} satisfies ZodOpenApiObject;

export const schema: OpenAPIObject = createDocument(zodSchema);
