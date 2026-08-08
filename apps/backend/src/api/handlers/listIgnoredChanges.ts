import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Test } from "@/database/models";
import { queryIgnoredChanges } from "@/database/services/ignored-change";
import { formatTestChangeId, formatTestId } from "@/util/test-id";

import { getProjectForAuth } from "../auth/project";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const IgnoredChangeSchema = z
  .object({
    id: z.string().meta({
      description:
        "Identifier of the ignored change, accepted by the unignore endpoint.",
    }),
    test: z
      .object({
        id: z.string(),
        name: z.string(),
        buildName: z.string(),
      })
      .meta({ description: "The test the ignored change belongs to." }),
  })
  .meta({
    description:
      "A change currently ignored in a project: it no longer requires review and is approved automatically.",
    id: "IgnoredChange",
  });

export const listIgnoredChangesOperation = {
  operationId: "listIgnoredChanges",
  summary: "List a project's ignored changes",
  description:
    "List the changes currently ignored in a project, most recently ignored first. Use it to audit what has been silenced and to unignore anything that should be reviewed again.",
  tags: ["Tests"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
    }),
    query: PageParamsSchema,
  },
  responses: {
    "200": {
      description: "List of the project's ignored changes",
      content: {
        "application/json": { schema: paginated(IgnoredChangeSchema) },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listIgnoredChanges: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/ignored-changes", async (req, res) => {
    const { page, perPage } = req.ctx.query;
    const project = await getProjectForAuth(req.ctx.auth(), req.ctx.params);

    // Shared with the GraphQL API (`Project.ignoredChanges`) — same ordering.
    const ignored = await queryIgnoredChanges({
      projectId: project.id,
      after: (page - 1) * perPage,
      first: perPage,
    });

    // The rows carry only ids; resolve the tests in one query so each entry can
    // name the test it silences.
    const tests = await Test.query().findByIds(
      ignored.results.map((row) => row.testId),
    );
    const testsById = new Map(tests.map((test) => [test.id, test]));

    res.send({
      results: ignored.results.flatMap((row) => {
        const test = testsById.get(row.testId);
        if (!test) {
          return [];
        }
        return [
          {
            id: formatTestChangeId({
              projectName: project.name,
              testId: row.testId,
              fingerprint: row.fingerprint,
            }),
            test: {
              id: formatTestId({
                projectName: project.name,
                testId: test.id,
              }),
              name: test.name,
              buildName: test.buildName,
            },
          },
        ];
      }),
      pageInfo: { total: ignored.total, page, perPage },
    });
  });
};
