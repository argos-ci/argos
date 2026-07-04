import { ZodOpenApiOperationObject } from "zod-openapi";

import { serializeUser, UserSchema } from "../schema/primitives/user";
import { serverError, unauthorized } from "../schema/util/error";
import { personalAccessTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const responses = {
  "200": {
    description: "The authenticated user",
    content: {
      "application/json": {
        schema: UserSchema,
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
    "Retrieve the user associated with the personal access token used to authenticate the request.",
  tags: ["Users"],
  security: personalAccessTokenAuth,
  responses,
} satisfies ZodOpenApiOperationObject;

export const getMe: CreateAPIHandler = ({ get }) => {
  get("/me", async (req, res) => {
    const auth = await req.ctx.auth();

    res.send(serializeUser(auth.account));
  });
};
