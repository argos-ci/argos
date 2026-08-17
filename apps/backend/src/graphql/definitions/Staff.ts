import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Account, StaffTeamContact } from "@/database/models";
import {
  getAccountBillings,
  type AccountBilling,
} from "@/database/services/period-usage";

import type {
  IPlanInterval,
  IResolvers,
  IStaffTeamOrderBy,
} from "../__generated__/resolver-types";
import type { Context } from "../context";
import type { AccountActivation } from "../loaders";
import { badUserInput, forbidden, unauthenticated } from "../util";
import { paginateResult } from "./PageInfo";

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

/**
 * Upper bound on a directory page.
 *
 * Every row returned costs a billing lookup, so the page size is what bounds
 * the work an unbounded directory can be asked to do.
 */
const MAX_STAFF_TEAMS_PAGE_SIZE = 100;

/**
 * Orderings the database can apply on its own.
 *
 * The amount orderings are absent on purpose: what a team bills is not a column
 * but the result of pricing its periods, so it cannot be reached from an `ORDER
 * BY` without restating the billing rules in SQL. They are ordered in
 * `orderAccountsByBilling` instead, against the same computation the page
 * displays.
 */
const DB_ORDERINGS: Partial<Record<IStaffTeamOrderBy, string>> = {
  NAME_ASC: `coalesce(name, slug) asc`,
  NAME_DESC: `coalesce(name, slug) desc`,
  CREATED_ASC: `accounts."createdAt" asc, accounts.id asc`,
  CREATED_DESC: `accounts."createdAt" desc, accounts.id desc`,
  // Counted per row rather than joined and grouped: the directory is a few
  // hundred teams and `team_users_teamid_index` answers each count outright,
  // whereas a group-by would have to carry every other column through it.
  MEMBERS_ASC: `(select count(*) from team_users where team_users."teamId" = accounts."teamId") asc`,
  MEMBERS_DESC: `(select count(*) from team_users where team_users."teamId" = accounts."teamId") desc`,
};

/** Which period an amount ordering reads, and which way it runs. */
const AMOUNT_ORDERINGS: Partial<
  Record<IStaffTeamOrderBy, { period: "previous" | "current"; desc: boolean }>
> = {
  PREVIOUS_PERIOD_ASC: { period: "previous", desc: false },
  PREVIOUS_PERIOD_DESC: { period: "previous", desc: true },
  CURRENT_PERIOD_ASC: { period: "current", desc: false },
  CURRENT_PERIOD_DESC: { period: "current", desc: true },
};

/**
 * What a team billed over one period, or null when it billed nothing.
 *
 * The flat price is taken in the period's own unit, exactly as the column that
 * displays it does — a yearly subscription's period is a year. This exists so
 * the ordering and the figure on screen come out of one rule; a team ordered
 * above another has to read higher than it too.
 */
function getPeriodAmount(
  billing: AccountBilling,
  period: "previous" | "current",
): number | null {
  const { periodUsage, plan } = billing;

  if (!periodUsage || !plan) {
    return null;
  }

  const billed =
    period === "previous"
      ? periodUsage.billingPeriods.find((item) => item.closed)
      : periodUsage.billingPeriods.find((item) => !item.closed);

  if (!billed) {
    return null;
  }

  // Null when Stripe was never asked for the amount. Ordered as nothing rather
  // than guessed at: the guess belongs to the display, which says it is one.
  const flatPrice = billing.flatPrice ?? 0;
  return flatPrice + billed.additionalScreenshotCost;
}

/**
 * Order a batch of teams by what they bill, and narrow them to one interval.
 *
 * Teams that bill nothing sort below every billed one whichever way the column
 * runs — ascending, they would otherwise fill the first page with rows that
 * have no amount at all, which is never what the column is being asked.
 */
function orderAccountsByBilling(input: {
  accounts: Account[];
  billings: Map<string, AccountBilling>;
  orderBy: IStaffTeamOrderBy;
  interval: IPlanInterval | null;
}): Account[] {
  const { accounts, billings, orderBy, interval } = input;

  const candidates = interval
    ? accounts.filter(
        (account) => billings.get(account.id)?.plan?.interval === interval,
      )
    : accounts;

  const amountOrdering = AMOUNT_ORDERINGS[orderBy];

  // An interval filter under a column ordering: the narrowing above preserves
  // the order the database already applied, so there is nothing to sort.
  if (!amountOrdering) {
    return candidates;
  }

  const amountByAccountId = new Map(
    candidates.map((account) => {
      const billing = billings.get(account.id);
      return [
        account.id,
        billing ? getPeriodAmount(billing, amountOrdering.period) : null,
      ];
    }),
  );

  return [...candidates].sort((left, right) => {
    const leftAmount = amountByAccountId.get(left.id) ?? null;
    const rightAmount = amountByAccountId.get(right.id) ?? null;

    if (leftAmount === null || rightAmount === null) {
      if (leftAmount === rightAmount) {
        return getDisplayName(left).localeCompare(getDisplayName(right));
      }
      return leftAmount === null ? 1 : -1;
    }

    // Tied amounts fall back to the name so the order is total, and a page
    // boundary cannot show the same team twice.
    if (leftAmount === rightAmount) {
      return getDisplayName(left).localeCompare(getDisplayName(right));
    }

    return amountOrdering.desc
      ? rightAmount - leftAmount
      : leftAmount - rightAmount;
  });
}

/** What the directory shows for a team, which is what it is ordered by. */
function getDisplayName(account: Account): string {
  return (account.name || account.slug || "").toLowerCase();
}

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

  "How the team directory can be ordered."
  enum StaffTeamOrderBy {
    NAME_ASC
    NAME_DESC
    CREATED_ASC
    CREATED_DESC
    MEMBERS_ASC
    MEMBERS_DESC
    "By what the last closed period came to, teams billing nothing last."
    PREVIOUS_PERIOD_ASC
    PREVIOUS_PERIOD_DESC
    "By what the running period has accrued, teams billing nothing last."
    CURRENT_PERIOD_ASC
    CURRENT_PERIOD_DESC
  }

  type StaffTeamConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Team!]!
  }

  extend type Query {
    """
    List all teams (staff only).

    Ordering, search and the interval filter are applied here rather than on the
    client: the directory is unbounded, and every row it returns costs a billing
    lookup.
    """
    staffTeams(
      after: Int! = 0
      first: Int! = 100
      "Matches a team's name or slug, case-insensitively."
      search: String
      "Keeps only teams billed on that interval. Teams with no plan are dropped."
      interval: PlanInterval
      orderBy: StaffTeamOrderBy! = NAME_ASC
    ): StaffTeamConnection!
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
    staffTeams: async (_root, args, ctx) => {
      assertStaff(ctx);

      const { after, orderBy, interval } = args;
      const first = Math.min(args.first, MAX_STAFF_TEAMS_PAGE_SIZE);

      if (first < 1 || after < 0) {
        throw badUserInput(
          "`first` must be positive and `after` non-negative.",
        );
      }

      const query = Account.query()
        .whereNotNull("teamId")
        .whereNull("userId")
        .modify((builder) => {
          const search = args.search?.trim();
          if (search) {
            // Escaped so a slug containing `%` or `_` matches itself rather
            // than acting as a wildcard.
            const pattern = `%${search.replaceAll(/[\\%_]/g, "\\$&")}%`;
            builder.where((where) => {
              where
                .whereRaw(`name ilike ? escape '\\'`, [pattern])
                .orWhereRaw(`slug ilike ? escape '\\'`, [pattern]);
            });
          }
        });

      const dbOrdering = DB_ORDERINGS[orderBy];

      // Ordering by an amount, or narrowing to one billing interval, cannot be
      // decided without resolving what each team is billed — so every candidate
      // is priced, not just the page. The orderings the database can apply on
      // its own take the cheap path below, where only the page is ever priced.
      if (!dbOrdering || interval) {
        // Ordered here too when the database can: the filter below preserves
        // the order it is given, so a column ordering under an interval filter
        // stays the ordering that was asked for.
        const accounts = await query.clone().modify((builder) => {
          if (dbOrdering) {
            builder.orderByRaw(dbOrdering);
          }
        });
        const billings = await getAccountBillings(accounts);
        const ordered = orderAccountsByBilling({
          accounts,
          billings,
          orderBy,
          interval: interval ?? null,
        });

        return paginateResult({
          result: {
            total: ordered.length,
            results: ordered.slice(after, after + first),
          },
          after,
          first,
        });
      }

      const [total, results] = await Promise.all([
        query.clone().resultSize(),
        query.clone().orderByRaw(dbOrdering).limit(first).offset(after),
      ]);

      return paginateResult({ result: { total, results }, after, first });
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
