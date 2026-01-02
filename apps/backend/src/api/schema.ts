import type { OpenAPIObject } from "openapi3-ts/oas31";
import { createDocument, ZodOpenApiObject } from "zod-openapi";

import config from "@/config";

import { createBuildOperation } from "./handlers/createBuild";
import { finalizeBuildsOperation } from "./handlers/finalizeBuilds";
import { getAuthProjectOperation } from "./handlers/getAuthProject";
import { getAuthProjectBuildsOperation } from "./handlers/getAuthProjectBuilds";
import { getBuildOperation } from "./handlers/getBuild";
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
    "/builds/{buildId}": {
      get: getBuildOperation,
      put: updateBuildOperation,
    },
    "/project": {
      get: getAuthProjectOperation,
    },
    "/project/builds": {
      get: getAuthProjectBuildsOperation,
    },
  },
} satisfies ZodOpenApiObject;

export const schema: OpenAPIObject = createDocument(zodSchema);
