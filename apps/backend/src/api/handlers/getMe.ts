import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { serializeUser, UserSchema } from "../schema/primitives/user";
import { serverError, unauthorized } from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const MeAccountSchema = z
  .object({
    id: z.string(),
    slug: z
      .string()
      .meta({ description: "Account slug, used as the `owner` in API paths." }),
    name: z.string().nullable(),
    type: z.enum(["user", "team"]),
  })
  .meta({
    description: "An account (personal or team) accessible to the token.",
    id: "MeAccount",
  });

const MeSchema = UserSchema.extend({
  accounts: z.array(MeAccountSchema).meta({
    description:
      "The accounts this token can access: the personal account and the teams selected when the token was created or authorized.",
  }),
}).meta({ description: "The authenticated user.", id: "Me" });

const responses = {
  "200": {
    description: "The authenticated user",
    content: {
      "application/json": {
        schema: MeSchema,
      },
    },
  },
  "401": unauthorized,
  "500": serverError,
} satisfies ZodOpenApiOperationObject["responses"];

export const getMeOperation = {
  operationId: "getMe",
  summary: "Get the current user",
  description:
    "Retrieve the user associated with the token used to authenticate the request, with the accounts (personal and teams) the token can access. Account slugs are the `owner` used in other API paths.",
  tags: ["Users"],
  security: patOrOAuthAuth(["profile"]),
  responses,
} satisfies ZodOpenApiOperationObject;

export const getMe: CreateAPIHandler = ({ get }) => {
  get("/me", async (req, res) => {
    const auth = await req.ctx.auth();

    res.send({
      ...serializeUser(auth.account),
      accounts: auth.scope.map((account) => ({
        id: account.id,
        slug: account.slug,
        name: account.displayName,
        type: account.type,
      })),
    });
  });
};
