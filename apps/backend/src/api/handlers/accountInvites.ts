import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  cancelTeamInvite,
  inviteTeamMembers,
  queryTeamInvites,
} from "@/database/services/team-invite";
import {
  assertTeamAdmin,
  resetTeamInviteLink,
} from "@/database/services/team-member";
import { extractLocationFromRequest } from "@/util/request-location";

import { getAccountForAuth } from "../auth/project";
import { PageParamsSchema, paginated } from "../schema/primitives/pagination";
import { AccountSlug } from "../schema/primitives/project";
import {
  serializeTeamInvite,
  TeamInviteSchema,
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

const AccountPathSchema = z.object({
  accountSlug: AccountSlug.meta({ description: "Slug of the team." }),
});

export const listAccountInvitesOperation = {
  operationId: "listAccountInvites",
  summary: "List pending invites",
  description:
    "List the pending invitations to join a team, most recent first. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: {
    path: AccountPathSchema,
    query: PageParamsSchema.extend({
      search: z
        .string()
        .optional()
        .meta({ description: "Match invites on their email address." }),
    }),
  },
  responses: {
    "200": {
      description: "List of pending invites",
      content: { "application/json": { schema: paginated(TeamInviteSchema) } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listAccountInvites: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/invites", async (req, res) => {
    const { page, perPage, search } = req.ctx.query;
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    const teamId = await assertTeamAdmin({ account, user: auth.user });

    const invites = await queryTeamInvites({ teamId, search }).range(
      (page - 1) * perPage,
      page * perPage - 1,
    );

    res.send({
      results: invites.results.map(serializeTeamInvite),
      pageInfo: { total: invites.total, page, perPage },
    });
  });
};

export const createAccountInvitesOperation = {
  operationId: "createAccountInvites",
  summary: "Invite members",
  description:
    "Invite people to a team by email. Each invited address receives an email with a link to join. Re-inviting an address that already has a pending invite refreshes it. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: { path: AccountPathSchema },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({
          members: z
            .array(
              z.object({
                email: z.email(),
                level: TeamUserLevel,
              }),
            )
            .min(1)
            .max(100)
            .meta({ description: "The people to invite." }),
        }),
      },
    },
  },
  responses: {
    "201": {
      description: "The invites that were created",
      content: { "application/json": { schema: z.array(TeamInviteSchema) } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const createAccountInvites: CreateAPIHandler = ({ post }) => {
  post("/accounts/{accountSlug}/invites", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    // Shared with the GraphQL API — same admin check, same invite email.
    const invites = await inviteTeamMembers({
      account,
      user: auth.user,
      actorAccount: auth.account,
      members: req.ctx.body.members,
      requestLocation: extractLocationFromRequest(req),
    });

    res.status(201).send(invites.map(serializeTeamInvite));
  });
};

export const cancelAccountInviteOperation = {
  operationId: "cancelAccountInvite",
  summary: "Cancel an invite",
  description:
    "Cancel a pending invitation, invalidating its link. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: {
    path: AccountPathSchema.extend({
      inviteId: z.string().meta({
        description: "Identifier of the invite, as returned when listing them.",
      }),
    }),
  },
  responses: {
    "204": { description: "Invite cancelled" },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const cancelAccountInvite: CreateAPIHandler = ({ delete: del }) => {
  del("/accounts/{accountSlug}/invites/{inviteId}", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    await cancelTeamInvite({
      account,
      user: auth.user,
      inviteId: req.ctx.params.inviteId,
    });

    res.status(204).send();
  });
};

export const resetAccountInviteLinkOperation = {
  operationId: "resetAccountInviteLink",
  summary: "Reset the invite link",
  description:
    "Rotate the team's shared invite link, invalidating the previous one. Anyone holding the old link can no longer use it to join. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: { path: AccountPathSchema },
  responses: {
    "200": {
      description: "The new invite link",
      content: {
        "application/json": {
          schema: z
            .object({
              inviteLink: z.url().meta({
                description:
                  "The team's new shared invite link. Anyone with it joins at the team's default role.",
              }),
            })
            .meta({ id: "InviteLink" }),
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

export const resetAccountInviteLink: CreateAPIHandler = ({ post }) => {
  post("/accounts/{accountSlug}/invite-link/reset", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    const inviteLink = await resetTeamInviteLink({
      account,
      user: auth.user,
    });
    invariant(inviteLink, "invite link not generated");

    res.send({ inviteLink });
  });
};
