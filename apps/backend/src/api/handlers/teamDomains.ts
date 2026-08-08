import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  addTeamDomain,
  listTeamDomains,
  removeTeamDomain,
} from "@/database/services/team-domain";
import { assertTeamAdmin } from "@/database/services/team-member";

import { getAccountForAuth } from "../auth/project";
import { AccountSlug } from "../schema/primitives/project";
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

const TeamDomainSchema = z
  .object({
    domain: z.string(),
    createdAt: z.iso.datetime(),
  })
  .meta({
    description:
      "An email domain the team is open to: anyone signing up with a verified address on it joins automatically, at the team's default role.",
    id: "TeamDomain",
  });

export const listTeamDomainsOperation = {
  operationId: "listTeamDomains",
  summary: "List a team's email domains",
  description:
    "List the email domains a team is open to. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: { path: AccountPathSchema },
  responses: {
    "200": {
      description: "The team's email domains",
      content: {
        "application/json": { schema: z.array(TeamDomainSchema) },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listTeamDomainsHandler: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}/domains", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    const teamId = await assertTeamAdmin({ account, user: auth.user });
    const domains = await listTeamDomains(teamId);

    res.send(
      domains.map((teamDomain) => ({
        domain: teamDomain.domain,
        createdAt: new Date(teamDomain.createdAt).toISOString(),
      })),
    );
  });
};

export const addTeamDomainOperation = {
  operationId: "addTeamDomain",
  summary: "Open a team to an email domain",
  description:
    "Add an email domain to a team, so anyone signing up with a verified address on it joins automatically. Requires administrator access to the team, and you must yourself hold a verified address on the domain — a team can only be opened to a domain its administrator demonstrably belongs to. Public email providers are refused.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: { path: AccountPathSchema },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({
          domain: z.string().min(1).meta({
            description: "The email domain, e.g. `acme.com`.",
          }),
        }),
      },
    },
  },
  responses: {
    "201": {
      description: "The domain the team is now open to",
      content: { "application/json": { schema: TeamDomainSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const addTeamDomainHandler: CreateAPIHandler = ({ post }) => {
  post("/accounts/{accountSlug}/domains", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    // Shared with the GraphQL API — same public-provider and verified-address
    // rules.
    const teamDomain = await addTeamDomain({
      account,
      user: auth.user,
      domain: req.ctx.body.domain,
    });

    invariant(teamDomain, "team domain not created");

    res.status(201).send({
      domain: teamDomain.domain,
      createdAt: new Date(teamDomain.createdAt).toISOString(),
    });
  });
};

export const removeTeamDomainOperation = {
  operationId: "removeTeamDomain",
  summary: "Close a team to an email domain",
  description:
    "Remove an email domain from a team. New sign-ups on it no longer join automatically; members who already joined stay. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: {
    path: AccountPathSchema.extend({
      domain: z.string().meta({ description: "The email domain to remove." }),
    }),
  },
  responses: {
    "204": { description: "Domain removed" },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const removeTeamDomainHandler: CreateAPIHandler = ({ delete: del }) => {
  del("/accounts/{accountSlug}/domains/{domain}", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    await removeTeamDomain({
      account,
      user: auth.user,
      domain: req.ctx.params.domain,
    });

    res.status(204).send();
  });
};
