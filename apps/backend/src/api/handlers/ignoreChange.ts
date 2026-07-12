import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type { AuthPATPayload } from "@/auth/payload";
import { Test } from "@/database/models";
import {
  getChangeMutationDenial,
  ignoreChange as ignoreTestChange,
  unignoreChange as unignoreTestChange,
} from "@/database/services/ignored-change";
import { IMetricsPeriod } from "@/graphql/__generated__/resolver-types";
import {
  getChangesTotalOccurrences,
  getStartDateFromPeriod,
} from "@/metrics/test";
import { boom } from "@/util/error";
import { formatTestChangeId, safeParseTestChangeId } from "@/util/test-id";

import { getProjectForAuth } from "../auth/project";
import { ChangeSchema } from "../schema/primitives/change";
import { MetricsPeriodSchema } from "../schema/primitives/metrics";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { personalAccessTokenAuth } from "../security";
import { CreateAPIHandler } from "../util";

const ChangeId = z.string().meta({
  description:
    "Identifier of the change to update, as returned in a diff's `change.id`.",
});

const IgnorePathParams = z.object({
  owner: AccountSlug,
  project: ProjectName,
  changeId: ChangeId,
});

const IgnoreQueryParams = z.object({
  metricsPeriod: MetricsPeriodSchema,
});

export const ignoreChangeOperation = {
  operationId: "ignoreChange",
  summary: "Ignore a test change",
  description:
    "Ignore a test change so its diffs no longer require review and are automatically approved on future builds. Use it to silence a change that has been identified as flaky.",
  tags: ["Changes"],
  security: personalAccessTokenAuth,
  requestParams: {
    path: IgnorePathParams,
    query: IgnoreQueryParams,
  },
  responses: {
    "200": {
      description: "Change ignored — returns the updated change",
      content: {
        "application/json": {
          schema: ChangeSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const unignoreChangeOperation = {
  operationId: "unignoreChange",
  summary: "Unignore a test change",
  description:
    "Stop ignoring a test change so its diffs require review again on future builds.",
  tags: ["Changes"],
  security: personalAccessTokenAuth,
  requestParams: {
    path: IgnorePathParams,
    query: IgnoreQueryParams,
  },
  responses: {
    "200": {
      description: "Change unignored — returns the updated change",
      content: {
        "application/json": {
          schema: ChangeSchema,
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

/**
 * Resolve and authorize a change-mutation request: validate the change id, load
 * and authorize the routed project, ensure the test belongs to it, and check
 * that the caller may review and that the ignore feature is enabled.
 */
async function resolveChangeMutation(input: {
  auth: AuthPATPayload;
  params: { owner: string; project: string; changeId: string };
}) {
  const { auth, params } = input;

  const changeIdPayload = safeParseTestChangeId(params.changeId);
  if (!changeIdPayload) {
    throw boom(404, "Change not found");
  }

  const project = await getProjectForAuth(Promise.resolve(auth), {
    owner: params.owner,
    project: params.project,
  });

  // A test id is globally unique, so ownership by the routed project is the
  // authorization boundary for the change.
  const test = await Test.query().findById(changeIdPayload.testId);
  if (!test || test.projectId !== project.id) {
    throw boom(404, "Change not found");
  }

  const denial = await getChangeMutationDenial(project, auth.user);
  if (denial === "forbidden") {
    throw boom(403, "You do not have permission to ignore changes");
  }
  if (denial === "ignore-disabled") {
    throw boom(400, "The ignore feature is disabled for this project");
  }

  return {
    projectName: project.name,
    projectId: project.id,
    userId: auth.user.id,
    testId: changeIdPayload.testId,
    fingerprint: changeIdPayload.fingerprint,
  };
}

async function serializeChange(input: {
  projectName: string;
  testId: string;
  fingerprint: string;
  ignored: boolean;
  metricsFrom: Date;
}): Promise<z.infer<typeof ChangeSchema>> {
  const { projectName, testId, fingerprint, ignored, metricsFrom } = input;
  const [occurrences] = await getChangesTotalOccurrences(
    [{ testId, fingerprint }],
    { from: metricsFrom },
  );
  return {
    id: formatTestChangeId({ projectName, testId, fingerprint }),
    ignored,
    occurrences: occurrences ?? 0,
  };
}

export const ignoreChange: CreateAPIHandler = ({ post }) => {
  return post(
    "/projects/{owner}/{project}/changes/{changeId}/ignore",
    async (req, res) => {
      const resolved = await resolveChangeMutation({
        auth: await req.ctx.auth(),
        params: req.ctx.params,
      });

      await ignoreTestChange({
        projectId: resolved.projectId,
        testId: resolved.testId,
        fingerprint: resolved.fingerprint,
        userId: resolved.userId,
      });

      res.send(
        await serializeChange({
          ...resolved,
          ignored: true,
          metricsFrom: getStartDateFromPeriod(
            req.ctx.query.metricsPeriod as IMetricsPeriod,
          ),
        }),
      );
    },
  );
};

export const unignoreChange: CreateAPIHandler = ({ post }) => {
  return post(
    "/projects/{owner}/{project}/changes/{changeId}/unignore",
    async (req, res) => {
      const resolved = await resolveChangeMutation({
        auth: await req.ctx.auth(),
        params: req.ctx.params,
      });

      await unignoreTestChange({
        projectId: resolved.projectId,
        testId: resolved.testId,
        fingerprint: resolved.fingerprint,
        userId: resolved.userId,
      });

      res.send(
        await serializeChange({
          ...resolved,
          ignored: false,
          metricsFrom: getStartDateFromPeriod(
            req.ctx.query.metricsPeriod as IMetricsPeriod,
          ),
        }),
      );
    },
  );
};
