import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import type { Account } from "@/database/models";
import {
  setTeamDefaultUserLevel,
  type TeamDefaultUserLevel as TeamDefaultUserLevelType,
} from "@/database/services/team-member";

import { getAccountForAuth } from "../auth/project";
import { AccountSlug } from "../schema/primitives/project";
import { TeamDefaultUserLevel } from "../schema/primitives/team";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { patOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const AccountDetailsSchema = z
  .object({
    id: z.string(),
    slug: AccountSlug,
    name: z.string().nullable(),
    type: z.enum(["user", "team"]),
    plan: z
      .object({
        name: z.string(),
        includedScreenshots: z.int(),
      })
      .nullable()
      .meta({ description: "The account's plan, `null` when it has none." }),
    periodStartDate: z.iso.datetime().nullable().meta({
      description: "Start of the current billing period.",
    }),
    periodEndDate: z.iso.datetime().nullable().meta({
      description: "End of the current billing period.",
    }),
    currentPeriodScreenshots: z.int().meta({
      description: "Screenshots used since the start of the current period.",
    }),
    includedScreenshots: z.int().meta({
      description: "Screenshots included in the plan for a period.",
    }),
    consumptionRatio: z.number().meta({
      description:
        "Used screenshots over included screenshots. Above `1` the account is over its plan and pays for the extra.",
    }),
    additionalScreenshotsCost: z.number().meta({
      description:
        "Cost accrued so far this period for screenshots beyond the plan, in the subscription's currency.",
    }),
    defaultUserLevel: TeamDefaultUserLevel.nullable().meta({
      description:
        "Role given to users joining through the invite link or a verified domain. `null` on a personal account.",
    }),
  })
  .meta({
    description:
      "An account with its plan and current-period usage, to watch consumption against the plan.",
    id: "AccountDetails",
  });

/** Serialize an account with its plan and current-period usage. */
async function serializeAccount(
  account: Account,
): Promise<z.infer<typeof AccountDetailsSchema>> {
  const manager = account.$getSubscriptionManager();
  const [
    plan,
    periodStartDate,
    periodEndDate,
    currentPeriodScreenshots,
    includedScreenshots,
    consumptionRatio,
    additionalScreenshotsCost,
  ] = await Promise.all([
    manager.getPlan(),
    manager.getCurrentPeriodStartDate(),
    manager.getCurrentPeriodEndDate(),
    manager.getCurrentPeriodScreenshots(),
    manager.getIncludedScreenshots(),
    manager.getCurrentPeriodConsumptionRatio(),
    manager.getAdditionalScreenshotCost(),
  ]);

  let defaultUserLevel: TeamDefaultUserLevelType | null = null;
  if (account.type === "team") {
    await account.$fetchGraph("team", { skipFetched: true });
    defaultUserLevel = account.team?.defaultUserLevel ?? null;
  }

  return {
    id: account.id,
    slug: account.slug,
    name: account.displayName,
    type: account.type,
    plan: plan
      ? { name: plan.name, includedScreenshots: plan.includedScreenshots }
      : null,
    periodStartDate: periodStartDate
      ? new Date(periodStartDate).toISOString()
      : null,
    periodEndDate: periodEndDate ? new Date(periodEndDate).toISOString() : null,
    currentPeriodScreenshots: currentPeriodScreenshots.all,
    includedScreenshots,
    consumptionRatio,
    additionalScreenshotsCost,
    defaultUserLevel,
  };
}

export const getAccountOperation = {
  operationId: "getAccount",
  summary: "Get an account",
  description:
    "Retrieve an account with its plan and current-period usage. Use it to watch screenshot consumption against the plan before it runs over.",
  tags: ["Users"],
  security: patOrOAuthAuth(["profile"]),
  requestParams: {
    path: z.object({
      accountSlug: AccountSlug.meta({
        description: "Slug of the account to retrieve.",
      }),
    }),
  },
  responses: {
    "200": {
      description: "The account with its plan and usage",
      content: { "application/json": { schema: AccountDetailsSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const getAccount: CreateAPIHandler = ({ get }) => {
  get("/accounts/{accountSlug}", async (req, res) => {
    const auth = await req.ctx.auth();
    // The token scope is the authorization boundary: it must cover the account.
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });
    res.send(await serializeAccount(account));
  });
};

export const updateAccountOperation = {
  operationId: "updateAccount",
  summary: "Update a team's defaults",
  description:
    "Change the role given to users that join a team through its invite link or a verified email domain. Requires administrator access to the team.",
  tags: ["Members"],
  security: patOrOAuthAuth(["account:admin"]),
  requestParams: {
    path: z.object({
      accountSlug: AccountSlug.meta({ description: "Slug of the team." }),
    }),
  },
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: z.object({ defaultUserLevel: TeamDefaultUserLevel }),
      },
    },
  },
  responses: {
    "200": {
      description: "The updated account",
      content: { "application/json": { schema: AccountDetailsSchema } },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const updateAccount: CreateAPIHandler = ({ patch }) => {
  patch("/accounts/{accountSlug}", async (req, res) => {
    const auth = await req.ctx.auth();
    const account = getAccountForAuth(auth, {
      slug: req.ctx.params.accountSlug,
    });

    // Shared with the GraphQL API — same admin check.
    await setTeamDefaultUserLevel({
      account,
      user: auth.user,
      level: req.ctx.body.defaultUserLevel,
    });

    res.send(await serializeAccount(account));
  });
};
