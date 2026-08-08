import { invariant } from "@argos/util/invariant";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { UserAccessToken, UserAccessTokenScope } from "@/database/models";
import {
  authenticateWithEmail,
  requestEmailSignup,
} from "@/database/services/account";
import { hashToken } from "@/database/services/crypto";
import { transaction } from "@/database/transaction";
import { createRedisStore } from "@/util/rate-limit";
import { extractLocationFromRequest } from "@/util/request-location";

import {
  invalidParameters,
  serverError,
  tooManyRequests,
} from "../schema/util/error";
import { noAuth } from "../security";
import { CreateAPIHandler } from "../util";

/**
 * Requesting a code sends an email to an address the caller chose, so it is
 * capped per IP well below the global API limit — otherwise the endpoint is a
 * way to have Argos mail anyone, repeatedly.
 */
const emailCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("auth-email-code"),
  handler: (_req, res) => {
    res
      .status(429)
      .json({ error: "Too many verification emails. Try again later." });
  },
});

export const requestEmailCodeOperation = {
  operationId: "requestEmailCode",
  summary: "Send an email verification code",
  description:
    "Send a verification code to an email address, to sign up or sign in from the CLI. Always succeeds, whether or not the address already has an account — which of the two happened is not disclosed. Exchange the code with `exchangeEmailCode`.",
  tags: ["Authentication"],
  "x-internal": true,
  security: noAuth,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({
          email: z.email().meta({
            description: "Address to send the verification code to.",
          }),
        }),
      },
    },
  },
  responses: {
    "204": { description: "Code sent, if the address can receive one" },
    "400": invalidParameters,
    "429": tooManyRequests,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const requestEmailCode: CreateAPIHandler = ({ post }) => {
  post("/auth/email/code", emailCodeLimiter, async (req, res) => {
    // Sends the signup or the "you already have an account" template, picked
    // from whether the address is known — the caller is told neither way.
    await requestEmailSignup({
      email: req.ctx.body.email,
      requestLocation: extractLocationFromRequest(req),
    });

    res.status(204).send();
  });
};

const EmailTokenResponseSchema = z
  .object({
    token: z.string().meta({
      description:
        "An Argos token for CLI use, scoped to the personal account. Store it as `ARGOS_TOKEN`.",
    }),
    created: z.boolean().meta({
      description:
        "Whether this call created the account, as opposed to signing in to an existing one.",
    }),
    account: z
      .object({
        id: z.string(),
        slug: z.string(),
      })
      .meta({ description: "The personal account the token is scoped to." }),
  })
  .meta({
    description: "A CLI token minted from a verified email code.",
    id: "EmailAuthToken",
  });

export const exchangeEmailCodeOperation = {
  operationId: "exchangeEmailCode",
  summary: "Exchange an email code for a CLI token",
  description:
    "Verify a code sent by `requestEmailCode`, creating the account if the address is new, and return a token for CLI use. The token is scoped to the personal account only — to reach a team, create a token from the Argos dashboard or use the browser login flow.",
  tags: ["Authentication"],
  "x-internal": true,
  security: noAuth,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({
          email: z.email(),
          code: z.string().min(1).meta({
            description: "The code from the verification email.",
          }),
        }),
      },
    },
  },
  responses: {
    "200": {
      description: "The verified account and its CLI token",
      content: { "application/json": { schema: EmailTokenResponseSchema } },
    },
    "400": invalidParameters,
    "429": tooManyRequests,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const exchangeEmailCode: CreateAPIHandler = ({ post }) => {
  post("/auth/email/token", async (req, res) => {
    // Shared with the GraphQL API: same code verification, same lockout after
    // repeated failures, same account creation on a first sign-in.
    const { account, creation } = await authenticateWithEmail({
      email: req.ctx.body.email,
      code: req.ctx.body.code,
    });

    invariant(account.userId, "Expected account to have userId");
    const userId = account.userId;

    const token = UserAccessToken.generateToken();
    await transaction(async (trx) => {
      const userAccessToken = await UserAccessToken.query(trx).insertAndFetch({
        userId,
        name: "Argos CLI",
        token: hashToken(token),
        lastUsedAt: null,
        expireAt: null,
        source: "cli",
      });

      // Least privilege: an email code is a weaker proof than the browser
      // login, so the token it mints reaches the personal account and nothing
      // else — not the teams the user may belong to.
      await UserAccessTokenScope.query(trx).insert({
        userAccessTokenId: userAccessToken.id,
        accountId: account.id,
      });
    });

    res.send({
      token,
      created: creation,
      account: { id: account.id, slug: account.slug },
    });
  });
};
