import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { exchangeCliAuthCode } from "@/auth/cli";
import { boom } from "@/util/error";

import {
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const CliTokenExchangeRequestSchema = z.object({
  code: z.string().meta({
    description: "PKCE authorization code from the login flow",
  }),
  code_verifier: z.string().meta({
    description: "PKCE code verifier matching the code challenge",
  }),
});

const CliTokenResponseSchema = z.object({
  token: z.string().meta({
    description: "Argos API token for CLI use",
  }),
});

export const exchangeCliTokenOperation = {
  operationId: "exchangeCliToken",
  summary: "Exchange CLI authorization code for a token",
  description:
    "Called by the CLI to exchange a PKCE authorization code for an API token.",
  requestBody: {
    content: {
      "application/json": {
        schema: CliTokenExchangeRequestSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Token exchange successful",
      content: {
        "application/json": {
          schema: CliTokenResponseSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const exchangeCliToken: CreateAPIHandler = ({ post }) => {
  return post("/auth/cli/token", async (req, res) => {
    const { body } = req.ctx;

    const token = await exchangeCliAuthCode(body.code, body.code_verifier);

    if (!token) {
      throw boom(401, "Invalid or expired authorization code.");
    }

    res.json({ token });
  });
};
