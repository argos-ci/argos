import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  removeTeamMember,
  setTeamMemberLevel,
} from "@/database/services/team-member";

import { getAccountForAuth } from "../auth/project";
import { AccountSlug } from "../schema/primitives/project";
import {
  serializeTeamMember,
  TeamMemberSchema,
  TeamUserLevel,
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

const MemberPathSchema = z.object({
  accountSlug: AccountSlug.meta({ description: "Slug of the team." }),
  userId: z.string().meta({
    description:
      "Identifier of the user to act on — the `user.id` returned by `listAccountMembers`, which is the user's account id.",
  }),
});

export const setAccountMemberLevelOperation = {
  operationId: "setAccountMemberLevel",
  summary: "Change a member's role",
  description:
    "Change the role of an existing team member. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: { path: MemberPathSchema },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({ level: TeamUserLevel }),
      },
    },
  },
  responses: {
    "200": {
      description: "The updated membership",
      content: { "application/json": { schema: TeamMemberSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const setAccountMemberLevel: CreateAPIHandler = ({ patch }) => {
  patch("/accounts/{accountSlug}/members/{userId}", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    // Shared with the GraphQL API — same admin check, same rules.
    const teamUser = await setTeamMemberLevel({
      account,
      user: auth.user,
      userAccountId: req.ctx.params.userId,
      level: req.ctx.body.level,
    });

    // `setTeamMemberLevel` returns the membership without the joined account
    // when the level was already the requested one, so load it for the payload.
    await teamUser.$fetchGraph("user.account");

    res.send(serializeTeamMember(teamUser));
  });
};

export const removeAccountMemberOperation = {
  operationId: "removeAccountMember",
  summary: "Remove a member",
  description:
    "Remove a user from a team. Requires administrator access to the team. The last member of a team cannot be removed; removing the second-to-last one promotes the remaining member to owner.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: { path: MemberPathSchema },
  responses: {
    "204": { description: "Member removed" },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const removeAccountMember: CreateAPIHandler = ({ delete: del }) => {
  del("/accounts/{accountSlug}/members/{userId}", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    await removeTeamMember({
      account,
      user: auth.user,
      userAccountId: req.ctx.params.userId,
    });

    res.status(204).send();
  });
};
