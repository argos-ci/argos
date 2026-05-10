import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { exchangeGitHubActionsOidcToken as exchangeGitHubActionsOidcTokenService } from "@/auth/github-actions-oidc-exchange";

import { Sha1HashSchema } from "../schema/primitives/sha";
import {
  forbidden,
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const GitHubActionsOidcExchangeRequestSchema = z.object({
  oidcToken: z.string().min(1).meta({
    description: "GitHub Actions OIDC token",
  }),
  repository: z
    .string()
    .regex(/^[^/]+\/[^/]+$/)
    .optional()
    .meta({
      description: "GitHub repository in owner/name format",
    }),
  commit: Sha1HashSchema.optional().meta({
    description: "Expected commit SHA",
  }),
  branch: z.string().min(1).optional().meta({
    description: "Expected branch name",
  }),
  pullRequestNumber: z.number().int().min(1).optional().meta({
    description: "Expected pull request number",
  }),
});

const GitHubActionsOidcExchangeResponseSchema = z.object({
  token: z.string().meta({
    description: "Short-lived Argos project token",
  }),
  expiresAt: z.string().meta({
    description: "Token expiration date as an ISO string",
  }),
});

export const exchangeGitHubActionsOidcTokenOperation = {
  operationId: "exchangeGitHubActionsOidcToken",
  summary: "Exchange a GitHub Actions OIDC token for an Argos token",
  description:
    "Called by GitHub Actions to exchange an OIDC token for a short-lived Argos project token.",
  security: [],
  requestBody: {
    content: {
      "application/json": {
        schema: GitHubActionsOidcExchangeRequestSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Token exchange successful",
      content: {
        "application/json": {
          schema: GitHubActionsOidcExchangeResponseSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const exchangeGitHubActionsOidcToken: CreateAPIHandler = ({ post }) => {
  return post("/auth/github-actions/oidc/exchange", async (req, res) => {
    const result = await exchangeGitHubActionsOidcTokenService(req.ctx.body);

    res.json(result);
  });
};
