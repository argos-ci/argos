import type { OpenAPIObject } from "openapi3-ts/oas31";
import { z } from "zod";
import {
  createDocument,
  extendZodWithOpenApi,
  ZodOpenApiObject,
} from "zod-openapi";

import config from "@/config";
import { BuildAggregatedStatusSchema } from "@/database/models";

extendZodWithOpenApi(z);

const owner = z.string().openapi({
  description: "Account owner",
  example: "acme",
});

const project = z.string().openapi({
  description: "Project name",
  example: "web",
});

const buildNumber = z.string().openapi({
  description: "Build number",
  example: "123",
});

const ErrorSchema = z
  .object({
    error: z.string(),
    details: z.array(z.object({ message: z.string() })),
  })
  .openapi({
    description: "Error response",
    ref: "Error",
  });

function createErrorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: ErrorSchema,
      },
    },
  };
}

const invalidParameterResponse = createErrorResponse("Invalid parameters");
const forbidden = createErrorResponse("Forbidden");
const notFound = createErrorResponse("Not found");

const Build = z
  .object({
    id: z.string(),
    number: z.number().min(1),
    status: BuildAggregatedStatusSchema,
  })
  .openapi({
    description: "Build",
    ref: "Build",
  });

export const zodSchema = {
  openapi: "3.0.3",
  info: {
    title: "Argos API",
    version: "1.0.0",
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
  security: [
    {
      tokenAuth: [],
    },
  ],
  paths: {
    "/projects/{owner}/{project}/builds/{buildNumber}": {
      get: {
        operationId: "getBuild",
        requestParams: {
          path: z.object({ owner, project, buildNumber }),
        },
        responses: {
          "200": {
            description: "200 OK",
            content: {
              "application/json": { schema: Build },
            },
          },
          "403": forbidden,
          "404": notFound,
          "400": invalidParameterResponse,
          "500": {
            description: "Unexpected error",
            content: {
              "application/json": {
                schema: z.object({
                  error: z.string(),
                  details: z
                    .array(z.object({ message: z.string() }))
                    .optional(),
                }),
              },
            },
          },
        },
      },
    },
  },
} satisfies ZodOpenApiObject;

export const schema: OpenAPIObject = createDocument(zodSchema);
