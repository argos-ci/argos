import type { OpenAPIObject } from "openapi3-ts/oas31";
import { z } from "zod";
import {
  createDocument,
  extendZodWithOpenApi,
  ZodOpenApiObject,
} from "zod-openapi";

import { NotificationPayloadSchema } from "@/build-notification/index.js";
import config from "@/config";
import { BuildAggregatedStatusSchema } from "@/database/models";

extendZodWithOpenApi(z);

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

const invalidParameters = createErrorResponse("Invalid parameters");
const unauthorized = createErrorResponse("Unauthorized");
const serverError = createErrorResponse("Server error");

const Project = z.object({
  id: z.string(),
  defaultBaseBranch: z.string(),
  hasRemoteContentAcess: z.boolean(),
});

const Build = z
  .object({
    id: z.string(),
    number: z.number().min(1),
    status: BuildAggregatedStatusSchema,
    url: z.string().url(),
    notification: NotificationPayloadSchema.nullable(),
  })
  .openapi({
    description: "Build",
    ref: "Build",
  });

const PageParamsSchema = z.object({
  perPage: z
    .string()
    .optional()
    .pipe(z.coerce.number().min(1).max(100).default(30))
    .openapi({
      description: "Number of items per page (max 100)",
    }),
  page: z
    .string()
    .optional()
    .pipe(z.coerce.number().min(1).default(1))
    .openapi({
      description: "Page number",
    }),
});

const GetAuthProjectBuildsParams = PageParamsSchema.extend({
  commit: z.string().optional().openapi({
    description: "Commit hash.",
  }),
  distinctName: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") {
        return true;
      }
      if (v === "false") {
        return false;
      }
      return null;
    })
    .openapi({
      description:
        "Only return the latest builds created, unique by name and commit.",
    }),
});

export const zodSchema = {
  openapi: "3.0.3",
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
    "/project": {
      get: {
        operationId: "getAuthProject",
        responses: {
          "200": {
            description: "Project",
            content: {
              "application/json": {
                schema: Project,
              },
            },
          },
          "401": unauthorized,
          "500": serverError,
        },
      },
    },
    "/project/builds": {
      get: {
        operationId: "getAuthProjectBuilds",
        requestParams: {
          query: GetAuthProjectBuildsParams,
        },
        responses: {
          "200": {
            description: "List of builds",
            content: {
              "application/json": {
                schema: z.object({
                  results: z.array(Build),
                  pageInfo: z.object({
                    total: z.number(),
                    page: z.number(),
                    perPage: z.number(),
                  }),
                }),
              },
            },
          },
          "401": unauthorized,
          "400": invalidParameters,
          "500": serverError,
        },
      },
    },
  },
} satisfies ZodOpenApiObject;

export const schema: OpenAPIObject = createDocument(zodSchema);
