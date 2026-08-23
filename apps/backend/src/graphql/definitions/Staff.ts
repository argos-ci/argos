import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Account, StaffTeamContact } from "@/database/models";
import type { AccountSubscriptionStatus } from "@/database/models/Account";
import {
  getAccountBillings,
  type AccountBilling,
} from "@/database/services/period-usage";
import { getStaffRevenue, MAX_MONTHS } from "@/stripe/revenue";

import type {
  IAccountSubscriptionStatus,
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
 * `filterAndOrderAccounts` instead, against the same computation the page
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
 * Narrow a batch of teams to an interval and a subscription state, then order
 * them by what they bill.
 *
 * Teams that bill nothing sort below every billed one whichever way the column
 * runs — ascending, they would otherwise fill the first page with rows that
 * have no amount at all, which is never what the column is being asked.
 */
function filterAndOrderAccounts(input: {
  accounts: Account[];
  billings: Map<string, AccountBilling>;
  statuses: Map<string, AccountSubscriptionStatus | null>;
  orderBy: IStaffTeamOrderBy;
  interval: IPlanInterval | null;
  status: IAccountSubscriptionStatus | null;
}): Account[] {
  const { accounts, billings, statuses, orderBy, interval, status } = input;

  let candidates = accounts;

  if (interval) {
    candidates = candidates.filter(
      (account) => billings.get(account.id)?.plan?.interval === interval,
    );
  }

  if (status) {
    candidates = candidates.filter(
      (account) => statuses.get(account.id) === status,
    );
  }

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
    """
    When the period closes, whether or not it has. Unlike \`to\`, this does not
    stop at the moment a running period was read: it is the anniversary the next
    period opens on, which follows the subscription rather than the calendar.
    """
    endsAt: DateTime!
    "False while the period is still accumulating usage."
    closed: Boolean!
    """
    Screenshots consumed over the period — Storybook ones included, and the
    units standalone media uploads are billed as. So it runs above the sum of
    the period's buckets on a project that records video.
    """
    screenshotsCount: Int!
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
    Screenshots consumed since the current period opened, billed or not.

    Apart from \`billingPeriods\` because it answers a different question: that
    list is what Stripe invoices, so it is empty on a trial — and a trial is
    precisely when what a team consumes is worth watching.
    """
    currentPeriodScreenshotsCount: Int!
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
    """
    Screenshots included in each billing period before the overage starts: the
    amount the subscription states, and the plan's published one when it states
    none. Null only when there is no plan to fall back to, and for a granted
    plan, which counts nothing against a quota.
    """
    includedScreenshots: Int
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

  "What the teams on one billing interval contributed to a month."
  type StaffRevenueSplit {
    revenue: Float!
    "How many teams contributed."
    teamsCount: Int!
    """
    The part of \`revenue\` invoiced in a currency other than euros, converted
    at the page's fixed rate.

    Stripe states each invoice in the currency it was raised in; dollars are
    brought into euros at a fixed rate rather than the day's, and this says how
    much of the figure rests on that conversion.
    """
    foreignRevenue: Float!
  }

  """
  What Argos invoiced over one calendar month.

  Read from the Stripe invoices themselves rather than recomputed from usage, so
  the amounts carry what Stripe actually charged — negotiated prices, coupons,
  credit notes — instead of a second pricing engine of ours that would have to
  agree with the first. Amounts exclude tax, are net of credit notes, and are
  stated in euros, dollars converted at a fixed rate.
  """
  type StaffRevenueMonth {
    "The first instant of the month, in UTC — what names it on screen."
    month: DateTime!
    "The two splits below, added up."
    revenue: Float!
    "What teams billed by the month were invoiced that month."
    monthlyPlans: StaffRevenueSplit!
    "The teams behind \`monthlyPlans\`, largest first — they sum to it."
    teams: [StaffRevenueMonthTeam!]!
    """
    What the annual contracts contributed to the month: their invoices
    amortized, day by day, over the stretch each one pays for — the monthly
    equivalent of the annual book. A renewal weighs on the twelve months it
    covers, an upsell on the stretch it was sold for, and a month's figure
    never moves once written.
    """
    yearlyPlans: StaffRevenueSplit!
  }

  "What one team was invoiced over a month, one line of the breakdown."
  type StaffRevenueMonthTeam {
    "The team's slug, which names its pages."
    slug: String!
    "The team's display name, when it has one."
    name: String
    "The Stripe customer the invoices were raised on."
    stripeCustomerId: String!
    "What the invoices add up to, in \`currency\`."
    amount: Float!
    "The currency the team is invoiced in — null when a month mixes several."
    currency: String
    "In euros, like the split it sums into."
    revenue: Float!
  }

  "One invoice a contract's worth is read from."
  type StaffContractInvoice {
    "Net of tax and credit notes, in the currency it was raised in."
    amount: Float!
    "The currency it was raised in — the contract's total converts it."
    currency: String!
    "When it was raised."
    invoicedAt: DateTime!
    "The stretch it covers, when it states a real one."
    coveredFrom: DateTime
    coveredUntil: DateTime
  }

  """
  One annual contract in force, and the invoices its rate is read from: the
  latest annual bill plus whatever was sold on top of it since.

  Listed so the yearly figure can be audited contract by contract — including
  the contracts that contributed nothing, which the total alone would hide.
  """
  type StaffYearlyContract {
    "The team's slug, which names its pages."
    slug: String!
    "The team's display name, when it has one."
    name: String
    "The subscription the database knows the contract by."
    stripeSubscriptionId: String!
    """
    The invoices below added up, in euros. Null when none was found, in which
    case the contract adds nothing to the rate.
    """
    amount: Float
    "The invoices the contract is worth, newest first."
    invoices: [StaffContractInvoice!]!
    """
    True when the invoices found are still awaiting payment. Counted all the
    same — a contract invoice raised is money on its way — and flagged, so
    collection can be watched.
    """
    awaitingPayment: Boolean!
  }

  "What Argos invoiced, and the annual contracts behind the yearly rate."
  type StaffRevenue {
    "The window, oldest first and the running month last."
    months: [StaffRevenueMonth!]!
    "The contracts behind every month's \`yearlyPlans\`, largest first."
    yearlyContracts: [StaffYearlyContract!]!
    """
    What GitHub Marketplace brings in a month, in euros, gross of the 5%
    GitHub keeps. A stated constant, not a reading — GitHub exposes no invoice
    API — so it is not part of the figures above.
    """
    githubMarketplaceMonthlyRevenue: Float!
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
      """
      Keeps only teams in that subscription state. Teams with no subscription at
      all are dropped, having no state to match.
      """
      status: AccountSubscriptionStatus
      orderBy: StaffTeamOrderBy! = NAME_ASC
    ): StaffTeamConnection!
    "List teams created within the last \`days\` days, newest first (staff only)"
    staffTrialPipeline(days: Int! = 30): [Team!]!
    """
    What Argos invoiced over the last \`months\` calendar months, oldest first
    and the running one last, with the annual contracts the yearly rate is
    made of (staff only).

    Read from the \`stripe_invoices\` mirror, which the Stripe webhooks keep
    current and a reconciliation sweep backs up — a window the mirror was
    never backfilled for is refused rather than reported as zeros. The staff
    revenue page is the only consumer today.
    """
    staffRevenue(months: Int!): StaffRevenue!
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
    includedScreenshots: async (account, _args, ctx) => {
      const billing = await ctx.loaders.AccountBillingByAccountId.load(
        account.id,
      );
      return billing.includedScreenshots;
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
    currentPeriodScreenshotsCount: async (account, _args, ctx) => {
      const { periodUsage: usage } =
        await ctx.loaders.AccountBillingByAccountId.load(account.id);
      invariant(usage, "period usage resolved for a team that has none");
      return usage.currentPeriodScreenshotsCount;
    },
    billingPeriods: async (account, _args, ctx) => {
      const { periodUsage: usage } =
        await ctx.loaders.AccountBillingByAccountId.load(account.id);
      invariant(usage, "period usage resolved for a team that has none");
      return usage.billingPeriods.map((period) => ({
        from: period.from,
        to: period.to,
        endsAt: period.endsAt,
        closed: period.closed,
        screenshotsCount: period.screenshotsCount,
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

      const { after, orderBy, interval, status } = args;
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

      // Ordering by an amount, or narrowing to an interval or a subscription
      // state, cannot be decided from a column: each one is derived, so every
      // candidate has to be resolved rather than just the page. The orderings
      // the database can apply on its own take the cheap path below, where only
      // the page it returns is ever resolved.
      if (!dbOrdering || interval || status) {
        // Ordered here too when the database can: the filters below preserve
        // the order they are given, so a column ordering under a filter stays
        // the ordering that was asked for.
        const accounts = await query.clone().modify((builder) => {
          if (dbOrdering) {
            builder.orderByRaw(dbOrdering);
          }
        });

        // Only what the request actually needs: a state filter costs a
        // subscription lookup, an interval filter and the amount orderings cost
        // a pricing pass, and neither pays for the other.
        const needsBilling =
          Boolean(interval) || Boolean(AMOUNT_ORDERINGS[orderBy]);
        const [billings, statuses] = await Promise.all([
          needsBilling
            ? getAccountBillings(accounts)
            : new Map<string, AccountBilling>(),
          status
            ? Account.getSubscriptionStatuses(accounts)
            : new Map<string, AccountSubscriptionStatus | null>(),
        ]);

        const ordered = filterAndOrderAccounts({
          accounts,
          billings,
          statuses,
          orderBy,
          interval: interval ?? null,
          status: status ?? null,
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
    staffRevenue: async (_root, args, ctx) => {
      assertStaff(ctx);

      // Guarded here as well as in the service: this one answers a bad request
      // with a bad-request error rather than an invariant the client cannot
      // read.
      if (args.months < 1 || args.months > MAX_MONTHS) {
        throw badUserInput(`\`months\` must be between 1 and ${MAX_MONTHS}.`);
      }

      return getStaffRevenue(args.months);
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
