import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Account, StaffTeamContact } from "@/database/models";

import type { IResolvers } from "../__generated__/resolver-types";
import type { Context } from "../context";
import type { AccountActivation } from "../loaders";
import { badUserInput, forbidden, unauthenticated } from "../util";

/** Every staff entry point opens with this — the check lives in one place. */
function assertStaff(ctx: Context): asserts ctx is Context & {
  auth: NonNullable<Context["auth"]>;
} {
  if (!ctx.auth) {
    throw unauthenticated();
  }
  if (!ctx.auth.user.staff) {
    throw forbidden();
  }
}

/**
 * Reads one field off the activation aggregate. The loader batches and caches,
 * so selecting all four costs a single query.
 */
function activationField<Key extends keyof AccountActivation>(key: Key) {
  return async (
    account: { id: string },
    _args: unknown,
    ctx: Context,
  ): Promise<AccountActivation[Key]> => {
    const activation = await ctx.loaders.AccountActivationByAccountId.load(
      account.id,
    );
    return activation[key];
  };
}

const { gql } = gqlTag;

/**
 * Upper bound on the trial pipeline window. Each returned team drives an
 * aggregate over `projects` joined to `builds`, so an unbounded window would
 * scan the whole build history.
 */
const MAX_TRIAL_PIPELINE_DAYS = 365;

export const typeDefs = gql`
  "An owner of a team, as needed to write to them."
  type TeamStaffOwner {
    id: ID!
    name: String
    email: String
    "Where the owner said they found Argos. Null when never asked, or skipped."
    signupSource: SignupSource
    "Free-text answer given alongside the \`other\` source."
    signupSourceDetail: String
  }

  "Trace of a staff member reaching out to a team."
  type TeamStaffContact {
    id: ID!
    date: DateTime!
    user: User!
  }

  "One billing period of a team, priced from the usage it accumulated."
  type TeamStaffBillingPeriod {
    from: DateTime!
    "End of the period, or now while it is still running."
    to: DateTime!
    "False while the period is still accumulating usage."
    closed: Boolean!
    "Cost of the screenshots consumed beyond the included quota, this period."
    additionalScreenshotsCost: Float!
  }

  "What a team is consuming, as needed to explain what it is about to pay."
  type TeamStaffPeriodUsage {
    """
    Periods Stripe actually invoices, most recent first: the one still running,
    then the closed ones. Empty while the team is on its trial, whose usage is
    never billed.
    """
    billingPeriods: [TeamStaffBillingPeriod!]!
    """
    Share of Storybook screenshots in everything the team ever uploaded, between
    0 and 1. Null when it never uploaded a screenshot at all.
    """
    storybookRatio: Float
    "Storybook screenshots uploaded since the team was created."
    storybookScreenshotsCount: Int!
  }

  """
  Team data reserved to Argos staff.

  Everything staff-only lives under this one type so a single guard covers it:
  adding a field here cannot leak it, whereas a field added directly to \`Team\`
  is public until someone remembers to guard it.
  """
  type TeamStaffInfo {
    projectsCount: Int!
    buildsCount: Int!
    "Screenshots uploaded since the team was created"
    screenshotsCount: Int!
    "When the team got its first build compared to a baseline"
    firstComparisonAt: DateTime
    owners: [TeamStaffOwner!]!
    "When a staff member reached out to the team, null if never"
    contact: TeamStaffContact
    """
    The plan the team is on, granted plans included. Null when it has no
    subscription at all — which is most of a trial pipeline.
    """
    plan: Plan
    """
    What the plan costs per billing period, in the subscription's currency, as
    Stripe states it. Null when Stripe has nothing to state: a granted plan, a
    GitHub subscription, or a subscription not synced since Argos started
    reading the amount.
    """
    flatPrice: Float
    "Billing usage. Null when the team is not on a usage-based plan."
    periodUsage: TeamStaffPeriodUsage
  }

  extend type Team {
    "Staff-only data. Null for everyone else."
    staff: TeamStaffInfo
  }

  input SetTeamStaffContactInput {
    teamAccountId: ID!
    contacted: Boolean!
  }

  extend type Query {
    "List all teams (staff only)"
    staffTeams: [Team!]!
    "List teams created within the last \`days\` days, newest first (staff only)"
    staffTrialPipeline(days: Int! = 30): [Team!]!
  }

  extend type Mutation {
    "Record or clear that a staff member reached out to a team (staff only)"
    setTeamStaffContact(input: SetTeamStaffContactInput!): Team!
  }
`;

export const resolvers: IResolvers = {
  Team: {
    staff: (account, _args, ctx) => {
      // The only guard on staff data: `TeamStaffInfo` resolves against the
      // account, so returning null here withholds every field under it.
      // `teamId` is checked too, so the fields below never have to.
      if (!ctx.auth?.user.staff || !account.teamId) {
        return null;
      }
      return account;
    },
  },
  TeamStaffInfo: {
    projectsCount: activationField("projectsCount"),
    buildsCount: activationField("buildsCount"),
    screenshotsCount: activationField("screenshotsCount"),
    firstComparisonAt: activationField("firstComparisonAt"),
    owners: async (account, _args, ctx) => {
      invariant(account.teamId, "not a team account");
      return ctx.loaders.TeamOwnersByTeamId.load(account.teamId);
    },
    contact: async (account, _args, ctx) => {
      invariant(account.teamId, "not a team account");
      return ctx.loaders.StaffTeamContactByTeamId.load(account.teamId);
    },
    plan: async (account, _args, ctx) => {
      const billing = await ctx.loaders.AccountBillingByAccountId.load(
        account.id,
      );
      return billing.plan;
    },
    flatPrice: async (account, _args, ctx) => {
      const billing = await ctx.loaders.AccountBillingByAccountId.load(
        account.id,
      );
      return billing.flatPrice;
    },
    // Resolves to the account rather than to the usage itself: the Storybook
    // mix below costs a scan of the account's whole history, so it is left to
    // its own resolver and only runs when a document actually selects it.
    periodUsage: async (account, _args, ctx) => {
      const { periodUsage: usage } =
        await ctx.loaders.AccountBillingByAccountId.load(account.id);
      return usage ? account : null;
    },
  },
  TeamStaffPeriodUsage: {
    billingPeriods: async (account, _args, ctx) => {
      const { periodUsage: usage } =
        await ctx.loaders.AccountBillingByAccountId.load(account.id);
      invariant(usage, "period usage resolved for a team that has none");
      return usage.billingPeriods.map((period) => ({
        from: period.from,
        to: period.to,
        closed: period.closed,
        additionalScreenshotsCost: period.additionalScreenshotCost,
      }));
    },
    storybookRatio: async (account, _args, ctx) => {
      const totals = await ctx.loaders.AccountStorybookTotalsByAccountId.load(
        account.id,
      );
      return totals.ratio;
    },
    storybookScreenshotsCount: async (account, _args, ctx) => {
      const totals = await ctx.loaders.AccountStorybookTotalsByAccountId.load(
        account.id,
      );
      return totals.count;
    },
  },
  TeamStaffContact: {
    date: (contact) => new Date(contact.createdAt),
    user: async (contact, _args, ctx) => {
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: contact.userId,
      });
      invariant(account, "user account not found");
      return account;
    },
  },
  Query: {
    staffTeams: async (_root, _args, ctx) => {
      assertStaff(ctx);

      return Account.query()
        .whereNotNull("teamId")
        .whereNull("userId")
        .orderByRaw("coalesce(name, slug) asc");
    },
    staffTrialPipeline: async (_root, args, ctx) => {
      assertStaff(ctx);

      if (args.days < 1 || args.days > MAX_TRIAL_PIPELINE_DAYS) {
        throw badUserInput(
          `\`days\` must be between 1 and ${MAX_TRIAL_PIPELINE_DAYS}.`,
        );
      }

      // Newest first: the list is read as a feed of what just happened, not
      // as a directory. The id breaks ties so the order is total.
      return Account.query()
        .whereNotNull("teamId")
        .whereNull("userId")
        .whereRaw(`accounts."createdAt" >= now() - make_interval(days => ?)`, [
          args.days,
        ])
        .orderBy("createdAt", "desc")
        .orderBy("id", "desc");
    },
  },
  Mutation: {
    setTeamStaffContact: async (_root, args, ctx) => {
      assertStaff(ctx);

      const teamAccount = await Account.query()
        .findById(args.input.teamAccountId)
        .throwIfNotFound();

      // The field is declared as `Team!`: handing back a personal account here
      // would resolve as `User` and break the response against the schema.
      if (!teamAccount.teamId) {
        throw badUserInput("Account is not a team.");
      }

      if (args.input.contacted) {
        // Idempotent: marking an already-contacted team keeps the original
        // author and date rather than rewriting them.
        await StaffTeamContact.query()
          .insert({ teamId: teamAccount.teamId, userId: ctx.auth.user.id })
          .onConflict("teamId")
          .ignore();
      } else {
        await StaffTeamContact.query()
          .delete()
          .where("teamId", teamAccount.teamId);
      }

      ctx.loaders.StaffTeamContactByTeamId.clear(teamAccount.teamId);

      return teamAccount;
    },
  },
};
