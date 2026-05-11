import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { exchangeGitHubActionsTokenlessToken as exchangeGitHubActionsTokenlessTokenService } from "@/auth/github-actions-tokenless-exchange";

import { Sha1HashSchema } from "../schema/primitives/sha";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const GitHubActionsTokenlessExchangeRequestSchema = z.object({
  tokenlessToken: z.string().min(1).meta({
    description: "Argos tokenless GitHub Actions bearer token",
  }),
  commit: Sha1HashSchema.meta({
    description: "Expected commit SHA",
  }),
  branch: z.string().min(1).meta({
    description: "Expected branch name",
  }),
});

const GitHubActionsTokenlessExchangeResponseSchema = z.object({
  token: z.string().meta({
    description: "Short-lived Argos project token",
  }),
  expiresAt: z.string().meta({
    description: "Token expiration date as an ISO string",
  }),
});

export const exchangeGitHubActionsTokenlessTokenOperation = {
  operationId: "exchangeGitHubActionsTokenlessToken",
  summary: "Exchange a tokenless GitHub Actions token for an Argos token",
  description:
    "Called by GitHub Actions to exchange a tokenless bearer token for a short-lived Argos project token. The provided commit and branch must match the GitHub workflow run.",
  security: [],
  requestBody: {
    content: {
      "application/json": {
        schema: GitHubActionsTokenlessExchangeRequestSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Token exchange successful",
      content: {
        "application/json": {
          schema: GitHubActionsTokenlessExchangeResponseSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
    "503": serviceUnavailable,
  },
} satisfies ZodOpenApiOperationObject;

export const exchangeGitHubActionsTokenlessToken: CreateAPIHandler = ({
  post,
}) => {
  return post("/auth/github-actions/tokenless/exchange", async (req, res) => {
    const result = await exchangeGitHubActionsTokenlessTokenService(
      req.ctx.body,
    );
    res.json(result);
  });
};
