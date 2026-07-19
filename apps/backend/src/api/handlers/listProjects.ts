import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { queryAccountProjects } from "@/database/services/project";

import { getAccountForAuth } from "../auth/project";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import {
  AccountSlug,
  ProjectSchema,
  serializeProject,
} from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

export const listProjectsOperation = {
  operationId: "listProjects",
  summary: "List an account's projects",
  description:
    "List the projects of an account that are visible to the authenticated user, most recently active first. Results are paginated. The token must be scoped to the account.",
  tags: ["Projects"],
  security: patOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      accountSlug: AccountSlug.meta({
        description: "Slug of the account to list projects for.",
      }),
    }),
    query: PageParamsSchema,
  },
  responses: {
    "200": {
      description: "List of projects",
      content: {
        "application/json": {
          schema: paginated(ProjectSchema),
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listProjects: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/projects", async (req, res) => {
    const { page, perPage } = req.ctx.query;
    const auth = await req.ctx.auth();

    // The token scope is the authorization boundary: it must cover the target
    // account. Resolves the in-scope account or throws 401.
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    // Shared with the GraphQL API — same visibility rules, same ordering.
    const query = queryAccountProjects({ account, user: auth.user });
    if (!query) {
      res.send({ results: [], pageInfo: { total: 0, page, perPage } });
      return;
    }

    const projects = await query.range(
      (page - 1) * perPage,
      page * perPage - 1,
    );
    const results = await Promise.all(projects.results.map(serializeProject));
    res.send({
      results,
      pageInfo: { total: projects.total, page, perPage },
    });
  });
};
