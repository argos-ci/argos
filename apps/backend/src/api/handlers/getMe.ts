import { ZodOpenApiOperationObject } from "zod-openapi";

import { boom } from "@/util/error";

import { getAuthPayloadFromExpressReq } from "../auth/project";
import { serializeUser, UserSchema } from "../schema/primitives/user";
import { serverError, unauthorized } from "../schema/util/error";
import { personalAccessTokenAuth } from "../schema/util/security";
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
    const auth = await getAuthPayloadFromExpressReq(req);

    if (auth.type !== "pat") {
      throw boom(
        401,
        "Getting the current user requires a personal access token. See https://argos-ci.com/docs for details.",
      );
    }

    res.send(serializeUser(auth.account));
  });
};
