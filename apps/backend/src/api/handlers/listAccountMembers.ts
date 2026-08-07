import { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { Team } from "@/database/models";
import {
  assertTeamAdmin,
  queryTeamMembers,
  type TeamMembersOrder,
} from "@/database/services/team-member";

import { getAccountForAuth } from "../auth/project";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug } from "../schema/primitives/project";
import {
  serializeTeamMember,
  TeamMemberSchema,
} from "../schema/primitives/team";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

/**
 * Comma-separated levels, so the filter stays a single query parameter rather
 * than a repeated one — easier for an agent to build and for a human to read.
 */
const LevelsParam = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) {
      return undefined;
    }
    const parsed = z
      .array(TeamUserLevelSchema)
      .safeParse(value.split(",").map((entry) => entry.trim()));
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid levels. Expected a comma-separated list of: ${TeamUserLevelSchema.options.join(", ")}.`,
      });
      return z.NEVER;
    }
    return parsed.data;
  })
  .meta({
    description:
      "Restrict to the given roles, comma-separated (e.g. `owner,member`).",
  });

const OrderByParam = z.enum(["date", "name-asc", "name-desc"]).optional().meta({
  description:
    "Ordering of the results. Defaults to `date`, most recently added first.",
});

export const listAccountMembersOperation = {
  operationId: "listAccountMembers",
  summary: "List a team's members",
  description:
    "List the members of a team, with their role. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: {
    path: z.object({
      accountSlug: AccountSlug.meta({
        description: "Slug of the team to list members for.",
      }),
    }),
    query: PageParamsSchema.extend({
      search: z.string().optional().meta({
        description: "Match members on their name, slug, or email address.",
      }),
      levels: LevelsParam,
      orderBy: OrderByParam,
    }),
  },
  responses: {
    "200": {
      description: "List of team members",
      content: {
        "application/json": {
          schema: paginated(TeamMemberSchema),
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

export const listAccountMembers: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/members", async (req, res) => {
    const { page, perPage, search, levels, orderBy } = req.ctx.query;
    const auth = await req.ctx.auth();

    // The token scope is the authorization boundary: it must cover the target
    // account. Resolves the in-scope account or throws 401.
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    // Shared with the GraphQL API — same admin check, same filters, same order.
    const teamId = await assertTeamAdmin({ account, user: auth.user });
    const team = await Team.query().findById(teamId);
    invariant(team, "team not found");

    const members = await queryTeamMembers({
      team,
      filters: {
        search,
        levels,
        orderBy: orderBy as TeamMembersOrder | undefined,
      },
    }).range((page - 1) * perPage, page * perPage - 1);

    res.send({
      results: members.results.map(serializeTeamMember),
      pageInfo: { total: members.total, page, perPage },
    });
  });
};
