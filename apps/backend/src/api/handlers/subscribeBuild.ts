import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  subscribeUserToBuild,
  unsubscribeUserFromBuild,
} from "@/database/services/build-notification-subscription";
import {
  subscribeUserToTest,
  unsubscribeUserFromTest,
} from "@/database/services/test-notification-subscription";

import { loadBuildForUserAuth } from "../auth/build";
import { loadTestForAuth } from "../auth/test";
import { BuildNumber } from "../schema/primitives/build";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import { TestId } from "../schema/primitives/test";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const SubscriptionSchema = z
  .object({
    subscribed: z.boolean().meta({
      description:
        "Whether the authenticated user now receives notifications for this resource.",
    }),
  })
  .meta({
    description: "A notification subscription.",
    id: "NotificationSubscription",
  });

const commonResponses = {
  "400": invalidParameters,
  "401": unauthorized,
  "403": forbidden,
  "404": notFound,
  "500": serverError,
} satisfies Partial<ZodOpenApiOperationObject["responses"]>;

const BuildPathSchema = z.object({
  owner: AccountSlug,
  project: ProjectName,
  buildNumber: BuildNumber,
});

const TestPathSchema = z.object({
  owner: AccountSlug,
  project: ProjectName,
  testId: TestId,
});

export const subscribeBuildOperation = {
  operationId: "subscribeBuild",
  summary: "Subscribe to a build",
  description:
    "Start receiving notifications about a build — new comments, reviews, and status changes. Clears a previous explicit unsubscription.",
  tags: ["Builds"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: BuildPathSchema },
  responses: {
    "200": {
      description: "Subscribed",
      content: { "application/json": { schema: SubscriptionSchema } },
    },
    ...commonResponses,
  },
} satisfies ZodOpenApiOperationObject;

export const subscribeBuild: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/builds/{buildNumber}/subscription",
    async (req, res) => {
      const { auth, build } = await loadBuildForUserAuth(
        req.ctx.auth(),
        req.ctx.params,
      );
      await subscribeUserToBuild({ buildId: build.id, userId: auth.user.id });
      res.send({ subscribed: true });
    },
  );
};

export const unsubscribeBuildOperation = {
  operationId: "unsubscribeBuild",
  summary: "Unsubscribe from a build",
  description:
    "Stop receiving notifications about a build. Recorded as an intentional unsubscription, so Argos will not auto-subscribe you to it again.",
  tags: ["Builds"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: BuildPathSchema },
  responses: {
    "200": {
      description: "Unsubscribed",
      content: { "application/json": { schema: SubscriptionSchema } },
    },
    ...commonResponses,
  },
} satisfies ZodOpenApiOperationObject;

export const unsubscribeBuild: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/builds/{buildNumber}/subscription",
    async (req, res) => {
      const { auth, build } = await loadBuildForUserAuth(
        req.ctx.auth(),
        req.ctx.params,
      );
      await unsubscribeUserFromBuild({
        buildId: build.id,
        userId: auth.user.id,
      });
      res.send({ subscribed: false });
    },
  );
};

export const subscribeTestOperation = {
  operationId: "subscribeTest",
  summary: "Subscribe to a test",
  description:
    "Start receiving notifications about a test — new comments and the changes it produces. Clears a previous explicit unsubscription.",
  tags: ["Tests"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: TestPathSchema },
  responses: {
    "200": {
      description: "Subscribed",
      content: { "application/json": { schema: SubscriptionSchema } },
    },
    ...commonResponses,
  },
} satisfies ZodOpenApiOperationObject;

export const subscribeTest: CreateAPIHandler = ({ post }) => {
  post(
    "/projects/{owner}/{project}/tests/{testId}/subscription",
    async (req, res) => {
      const { auth, test } = await loadTestForAuth(
        req.ctx.auth(),
        req.ctx.params,
      );
      await subscribeUserToTest({ testId: test.id, userId: auth.user.id });
      res.send({ subscribed: true });
    },
  );
};

export const unsubscribeTestOperation = {
  operationId: "unsubscribeTest",
  summary: "Unsubscribe from a test",
  description:
    "Stop receiving notifications about a test. Recorded as an intentional unsubscription, so Argos will not auto-subscribe you to it again.",
  tags: ["Tests"],
  security: patOrOAuthAuth(["comments:write"]),
  requestParams: { path: TestPathSchema },
  responses: {
    "200": {
      description: "Unsubscribed",
      content: { "application/json": { schema: SubscriptionSchema } },
    },
    ...commonResponses,
  },
} satisfies ZodOpenApiOperationObject;

export const unsubscribeTest: CreateAPIHandler = ({ delete: del }) => {
  del(
    "/projects/{owner}/{project}/tests/{testId}/subscription",
    async (req, res) => {
      const { auth, test } = await loadTestForAuth(
        req.ctx.auth(),
        req.ctx.params,
      );
      await unsubscribeUserFromTest({ testId: test.id, userId: auth.user.id });
      res.send({ subscribed: false });
    },
  );
};
