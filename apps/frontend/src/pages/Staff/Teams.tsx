import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { diffInCalendarDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { CreditCardIcon, SearchIcon } from "lucide-react";
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { Helmet } from "react-helmet";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard } from "@/containers/AuthGuard";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import {
  AccountSubscriptionStatus,
  PlanInterval,
  StaffTeamOrderBy,
} from "@/gql/graphql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Loader } from "@/ui/Loader";
import { PageLoader } from "@/ui/PageLoader";
import { Select, SelectButton } from "@/ui/Select";
import { SortHeader, type SortDirection } from "@/ui/SortHeader";
import { Text } from "@/ui/Text";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";

import { getAccountURL } from "../Account/AccountParams";
import {
  formatPrice,
  getPeriodFlatPrice,
  PRO_PLAN_NAME,
  type PricedPlan,
} from "./pricing";
import { StripeCustomerLink } from "./stripe";

const StaffTeamsQuery = graphql(`
  query StaffTeams_staffTeams(
    $after: Int!
    $first: Int!
    $search: String
    $interval: PlanInterval
    $status: AccountSubscriptionStatus
    $orderBy: StaffTeamOrderBy!
  ) {
    staffTeams(
      after: $after
      first: $first
      search: $search
      interval: $interval
      status: $status
      orderBy: $orderBy
    ) {
      pageInfo {
        totalCount
      }
      edges {
        id
        createdAt
        slug
        name
        membersCount
        subscriptionStatus
        stripeCustomerId
        staff {
          flatPrice
          includedScreenshots
          plan {
            id
            name
            displayName
            interval
          }
          periodUsage {
            currentPeriodScreenshotsCount
            billingPeriods {
              endsAt
              closed
              screenshotsCount
              additionalScreenshotsCost
            }
          }
        }
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
  }
`);

const StaffTeamMembersQuery = graphql(`
  query StaffTeams_teamMembers(
    $teamAccountId: ID!
    $first: Int!
    $after: Int!
  ) {
    teamById(id: $teamAccountId) {
      id
      ... on Team {
        members(first: $first, after: $after, orderBy: NAME_ASC) {
          pageInfo {
            totalCount
            hasNextPage
          }
          edges {
            id
            level
            user {
              id
              slug
              name
              emails {
                email
                verified
              }
            }
          }
        }
      }
    }
  }
`);

type TeamNode = DocumentType<
  typeof StaffTeamsQuery
>["staffTeams"]["edges"][number];

/**
 * A team with its staff block resolved.
 *
 * `Team.staff` is nullable because non-staff must not read it, but this page is
 * only reachable through `staffTeams`, which refuses non-staff outright.
 * Narrowing once here keeps the billing cells below honest instead of defaulting
 * a missing amount to zero, which would render as a real figure.
 */
type TeamItem = TeamNode & { staff: NonNullable<TeamNode["staff"]> };

/**
 * Asserted rather than filtered out: a missing staff block on this page means
 * the guard that fills it stopped working, and dropping the row would hide that
 * behind a directory quietly missing teams — with a total that agrees with it.
 */
function toStaffTeam(team: TeamNode): TeamItem {
  invariant(
    team.staff,
    "team directory returned a team without its staff data",
  );
  return { ...team, staff: team.staff };
}

type BillingPeriod = NonNullable<
  TeamItem["staff"]["periodUsage"]
>["billingPeriods"][number];

type TeamMemberItem = NonNullable<
  Extract<
    DocumentType<typeof StaffTeamMembersQuery>["teamById"],
    { __typename?: "Team" }
  >["members"]
>["edges"][number];

type SortKey =
  | "team"
  | "createdAt"
  | "members"
  | "previousPeriod"
  | "currentPeriod";

const PAGE_SIZE = 100;

/**
 * How long a query has to run before the table says it is busy.
 *
 * Long enough that a page which comes back quickly changes nothing on screen —
 * search runs on every keystroke, and dimming the table each time would be a
 * strobe. Short enough that ordering by an amount, which prices every billed
 * team, never looks like a click that did nothing.
 */
const BUSY_DELAY_MS = 300;

/**
 * Whether `active` has been true for longer than `delay`, so a wait too short
 * to notice is never reported as one.
 */
function useDelayedFlag(active: boolean, delay: number): boolean {
  const [raised, setRaised] = useState(false);
  const [lastActive, setLastActive] = useState(active);

  // Adjusted during render rather than from an effect: React documents this for
  // resetting state a prop derives from, and it lowers the flag in the same
  // pass that clears the wait instead of after a second one.
  if (lastActive !== active) {
    setLastActive(active);
    setRaised(false);
  }

  useEffect(() => {
    if (!active) {
      return;
    }

    const timeout = setTimeout(() => setRaised(true), delay);
    return () => clearTimeout(timeout);
  }, [active, delay]);

  return raised;
}

const INTERVAL_FILTER_KEYS = ["all", "month", "year"] as const;

type IntervalFilter = (typeof INTERVAL_FILTER_KEYS)[number];

/**
 * How the directory can be narrowed by billing interval.
 *
 * The two period columns hold each team's own unit — a yearly subscription
 * states a year's amount — so a mixed list puts figures an order of magnitude
 * apart in the same column. Narrowing to one interval is what makes them
 * comparable, and sorting on them meaningful.
 */
const INTERVAL_FILTERS: Record<
  IntervalFilter,
  { label: string; interval: PlanInterval | null }
> = {
  all: { label: "All intervals", interval: null },
  month: { label: "Monthly", interval: PlanInterval.Month },
  year: { label: "Yearly", interval: PlanInterval.Year },
};

const STATUS_FILTER_ALL = "all";

/**
 * The subscription states the directory can be narrowed to.
 *
 * Every state the schema knows, in lifecycle order rather than alphabetically —
 * the list is read as a funnel, from a trial that has not committed to anything
 * through to the ways a subscription ends. `trialing_with_payment_method` is
 * spelled out here where there is room for it, unlike in the column.
 */
const STATUS_FILTERS: { value: AccountSubscriptionStatus; label: string }[] = [
  { value: AccountSubscriptionStatus.Trialing, label: "Trialing" },
  {
    value: AccountSubscriptionStatus.TrialingWithPaymentMethod,
    label: "Trialing with card",
  },
  { value: AccountSubscriptionStatus.Active, label: "Active" },
  { value: AccountSubscriptionStatus.PastDue, label: "Past due" },
  { value: AccountSubscriptionStatus.Unpaid, label: "Unpaid" },
  { value: AccountSubscriptionStatus.Paused, label: "Paused" },
  { value: AccountSubscriptionStatus.TrialExpired, label: "Trial expired" },
  { value: AccountSubscriptionStatus.Canceled, label: "Canceled" },
  { value: AccountSubscriptionStatus.Incomplete, label: "Incomplete" },
  {
    value: AccountSubscriptionStatus.IncompleteExpired,
    label: "Incomplete expired",
  },
];

const STATUS_FILTER_KEYS = [
  STATUS_FILTER_ALL,
  ...STATUS_FILTERS.map((status) => status.value),
] as const;

type StatusFilter = (typeof STATUS_FILTER_KEYS)[number];

function getStatusFilterLabel(filter: StatusFilter): string {
  const status = STATUS_FILTERS.find((item) => item.value === filter);
  return status ? status.label : "All statuses";
}

/**
 * The server's ordering for each column and direction.
 *
 * Ordering happens there rather than here because the directory is paginated
 * there: sorting a page of a hundred among several hundred teams would only
 * reorder what the page already held.
 */
const ORDER_BY: Record<SortKey, Record<SortDirection, StaffTeamOrderBy>> = {
  team: {
    asc: StaffTeamOrderBy.NameAsc,
    desc: StaffTeamOrderBy.NameDesc,
  },
  createdAt: {
    asc: StaffTeamOrderBy.CreatedAsc,
    desc: StaffTeamOrderBy.CreatedDesc,
  },
  members: {
    asc: StaffTeamOrderBy.MembersAsc,
    desc: StaffTeamOrderBy.MembersDesc,
  },
  previousPeriod: {
    asc: StaffTeamOrderBy.PreviousPeriodAsc,
    desc: StaffTeamOrderBy.PreviousPeriodDesc,
  },
  currentPeriod: {
    asc: StaffTeamOrderBy.CurrentPeriodAsc,
    desc: StaffTeamOrderBy.CurrentPeriodDesc,
  },
};

/** One period of a team, with what it came to. */
type BilledPeriod = { period: BillingPeriod; amount: number };

/** The two periods this page reports on, priced. */
type TeamBilling = {
  plan: PricedPlan;
  /**
   * The last period that closed. Its usage is settled, but the prices are the
   * ones the subscription carries today — Argos keeps no history of them — so a
   * contract renegotiated since is priced on its new terms rather than the ones
   * it was invoiced on. Null until the team closes its first period.
   */
  previous: BilledPeriod | null;
  /** The period still accruing. Null when nothing is being billed right now. */
  current: BilledPeriod | null;
};

/**
 * What a team was billed over one period: the plan's own amount, plus the
 * screenshots it consumed beyond the quota.
 *
 * Both halves are taken in the period's own unit rather than brought back to a
 * month, unlike the rate the trial pipeline quotes. This column answers what an
 * invoice came to, and a yearly subscription's invoice covers a year — dividing
 * it by twelve would report a figure Stripe never charged, under a header that
 * says otherwise. The plan and the day count next to it say which unit the row
 * is in.
 *
 * No subscription status to check, either. `billingPeriods` only ever holds the
 * periods Stripe actually invoices — trial periods and periods predating the
 * subscription are dropped server side — so a period being there is itself what
 * says it was billed, and a team with none was billed nothing.
 */
function getPeriodAmount(
  period: BillingPeriod,
  staff: TeamItem["staff"],
  plan: PricedPlan,
): number {
  return (
    getPeriodFlatPrice(staff.flatPrice, plan) + period.additionalScreenshotsCost
  );
}

/**
 * What the team billed over its last two periods, or null when it bills nothing
 * at all — a team off a usage-based plan, on a granted one, or with no
 * subscription.
 */
function getTeamBilling(team: TeamItem): TeamBilling | null {
  const { periodUsage, plan } = team.staff;

  if (!periodUsage) {
    return null;
  }

  // Usage to price means a usage-based plan was resolved to price it against.
  invariant(plan, "a team billed by usage is on a plan");

  const toBilled = (period: BillingPeriod | undefined): BilledPeriod | null =>
    period
      ? { period, amount: getPeriodAmount(period, team.staff, plan) }
      : null;

  const { billingPeriods } = periodUsage;

  return {
    plan,
    previous: toBilled(billingPeriods.find((period) => period.closed)),
    current: toBilled(billingPeriods.find((period) => !period.closed)),
  };
}

/**
 * What the plan costs on this team, spelled out under the amount.
 *
 * The flat half is what the reader cannot check: the overage is computed from
 * screenshots we counted, while the plan's own amount is either read from the
 * contract in Stripe or guessed. Which of the two it is changes how much the
 * figure can be trusted, so it is said rather than implied.
 */
function getAmountHint(team: TeamItem, billing: TeamBilling): string {
  const { plan } = billing;
  const flat = formatPrice(getPeriodFlatPrice(team.staff.flatPrice, plan));
  const unit = plan.interval === PlanInterval.Year ? "year" : "month";
  const source =
    team.staff.flatPrice === null
      ? `a ${flat} guess for ${plan.displayName}, whose own amount is not on file`
      : `${flat} held on the subscription in Stripe`;

  return `Billed by the ${unit}. ${plan.displayName}: ${source}, plus the screenshots consumed beyond the quota over the period.`;
}

/**
 * How much of the running period is left.
 *
 * The running period is partial by construction, so it reads lower than the one
 * before it whatever the team is doing. What is left of it tells a genuine drop
 * from a period that simply opened three days ago — and, unlike a count from the
 * start, it also says when the figure beside it becomes comparable.
 *
 * Read off `endsAt` rather than the period's `to`, which on a running period is
 * only the moment it was read: the real end follows the subscription's
 * anniversary. Neutralized for visual tests — it moves every day, and the table
 * would rebaseline overnight.
 */
function PeriodProgress(props: { period: BillingPeriod }) {
  // Floored: a period read moments past its own end has not rolled over yet,
  // and a negative count reads as a bug rather than as a boundary.
  const remaining = Math.max(
    0,
    diffInCalendarDays(new Date(props.period.endsAt), new Date()),
  );

  return (
    <div className="text-low text-xs" data-visual-test="transparent">
      {remaining === 1 ? "1 day left" : `${remaining} days left`}
    </div>
  );
}

/**
 * What the running period has consumed, against what the subscription includes
 * in each one.
 *
 * The running period rather than the whole history: the quota resets at every
 * period, so a lifetime total has nothing to be read against — and this is the
 * figure that says whether the amount in the next invoice is about to move.
 *
 * Read off the usage rather than off the billing beside it, so a trial reports
 * what it consumes like everyone else. Stripe never invoices trial usage, so no
 * billed period is opened for one — but consumption during a trial is the whole
 * signal for whether it converts, and blanking it was hiding the answer on
 * exactly the rows the question is asked about.
 *
 * The quota is named only where it is worth reading. Pro is nearly every row
 * and always includes the same amount, so printing it there would repeat one
 * number down the whole column. What is left is the contracts, where it was
 * negotiated — and where it is the only thing that makes the count above it
 * mean anything.
 */
function ScreenshotsCell(props: {
  team: TeamItem;
  billing: TeamBilling | null;
}) {
  const { team, billing } = props;
  const { periodUsage } = team.staff;

  // Nothing is metered at all: a team on a flat plan, on a granted one, or with
  // no subscription.
  if (!periodUsage) {
    return <span className="text-low">—</span>;
  }

  // Usage to read means a usage-based plan was resolved to read it against.
  invariant(billing, "a team with period usage is billed on a plan");

  const { includedScreenshots } = team.staff;
  // Pro includes the same amount on every one of its rows, which is nearly all
  // of them, so naming it there would repeat one figure down the column.
  const quota =
    includedScreenshots === null || billing.plan.name === PRO_PLAN_NAME
      ? null
      : includedScreenshots.toLocaleString();

  return (
    <Tooltip content="Consumed since the running period opened, against what the subscription includes in each one. Everything past the quota is billed as overage — except on a trial, whose usage Stripe never bills.">
      <div>
        <div className="font-medium">
          {periodUsage.currentPeriodScreenshotsCount.toLocaleString()}
        </div>
        {quota !== null && <div className="text-low text-xs">/ {quota}</div>}
      </div>
    </Tooltip>
  );
}

/** What a team billed over one period, or an em dash when it billed nothing. */
function BilledAmount(props: {
  team: TeamItem;
  billing: TeamBilling | null;
  /** Which of the two periods to read off the billing above. */
  period: "previous" | "current";
  /** Rendered under the amount — only the running period has one. */
  footnote?: React.ReactNode;
}) {
  const { team, billing, period, footnote } = props;
  // Read here rather than passed in: an amount only ever comes from the billing
  // beside it, and taking the two separately let a caller hand over one without
  // the other — a state the cell then had to guard against for nothing.
  const billed = billing?.[period] ?? null;

  return (
    <div>
      {billing && billed ? (
        <Tooltip content={getAmountHint(team, billing)}>
          <span className="font-medium">{formatPrice(billed.amount)}</span>
        </Tooltip>
      ) : (
        <span className="text-low">—</span>
      )}
      {footnote}
    </div>
  );
}

/**
 * The two period columns, rendered together.
 *
 * Only the running one carries a footnote — how much of it is left, which is
 * what separates a genuine drop from a period that opened three days ago.
 */
function BilledPeriodCells(props: {
  team: TeamItem;
  billing: TeamBilling | null;
}) {
  const { team, billing } = props;
  const current = billing?.current ?? null;
  const footnote = current ? <PeriodProgress period={current.period} /> : null;

  return (
    <>
      <td className="p-4 text-right text-sm tabular-nums">
        <BilledAmount team={team} billing={billing} period="previous" />
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        <BilledAmount
          team={team}
          billing={billing}
          period="current"
          footnote={footnote}
        />
      </td>
    </>
  );
}

/**
 * `trialing_with_payment_method` spelled out is far wider than the column, and
 * the only part that adds anything over "trialing" is that a card is on file —
 * which a credit card icon says just as well.
 */
function SubscriptionLabel(props: { status: string | null | undefined }) {
  const { status } = props;

  if (status === AccountSubscriptionStatus.TrialingWithPaymentMethod) {
    return (
      <span className="whitespace-nowrap">
        trialing
        <Tooltip content="Payment method filled">
          <CreditCardIcon
            className="text-success-low ml-1 inline-block size-4"
            aria-label="Payment method filled"
          />
        </Tooltip>
      </span>
    );
  }

  return <>{status ? status.replaceAll("_", " ") : "none"}</>;
}

function StaffMembersPanel(props: { members: TeamMemberItem[] }) {
  if (props.members.length === 0) {
    return <div className="text-low text-sm">No members found.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* `px-2` matches the padding of the rows below, so the two labels sit
          over the columns they name rather than a border's width outside them. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-2 text-xs font-medium">
        <div>Member / Emails</div>
        <div>Role</div>
      </div>
      {props.members.map((member) => (
        <div
          key={member.id}
          className="bg-app grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-sm border p-2 text-sm"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              {member.user.name || member.user.slug}
            </div>
            <div className="text-low truncate">
              {member.user.emails.length > 0
                ? member.user.emails
                    .map((email) =>
                      email.verified
                        ? email.email
                        : `${email.email} (unverified)`,
                    )
                    .join(", ")
                : "No email"}
            </div>
          </div>
          <div className="text-low">{member.level}</div>
        </div>
      ))}
    </div>
  );
}

function StaffTeamRow(props: {
  team: TeamItem;
  index: number;
  isLast: boolean;
  isOpened: boolean;
  toggleMembers: () => void;
}) {
  const { team, index, isLast, isOpened, toggleMembers } = props;
  const teamURL = getAccountURL({ accountSlug: team.slug });
  const billing = getTeamBilling(team);
  const {
    data: membersData,
    loading: membersLoading,
    error: membersError,
  } = useQuery(StaffTeamMembersQuery, {
    variables: {
      teamAccountId: team.id,
      first: 100,
      after: 0,
    },
    skip: !isOpened,
  });

  const members =
    membersData?.teamById?.__typename === "Team"
      ? membersData.teamById.members.edges
      : [];

  return (
    <>
      <tr
        className={
          index % 2 === 0
            ? `bg-app ${isLast && !isOpened ? "" : "border-b"}`
            : `bg-subtle ${isLast && !isOpened ? "" : "border-b"}`
        }
      >
        <td className="p-4 text-sm">
          <div className="flex min-w-0 items-center gap-3">
            <AccountAvatar avatar={team.avatar} className="size-8 shrink-0" />
            {/* `flex-1` is what pushes the Stripe link to the cell edge: this
                wrapper takes the width the link does not, so the link lands at
                the same offset on every row whatever the name is. */}
            <Link
              href={teamURL}
              className="min-w-0 flex-1 truncate font-medium"
            >
              {team.name || team.slug}
            </Link>
            <StripeCustomerLink stripeCustomerId={team.stripeCustomerId} />
          </div>
        </td>
        <td className="p-4 text-sm">
          <Time date={team.createdAt} format="date" tooltip="title" />
        </td>
        <td className="p-4 text-sm">
          <SubscriptionLabel status={team.subscriptionStatus} />
          {/* The plan belongs next to the status rather than under either
              amount: it qualifies both of them equally, and saying it twice in
              two adjacent columns would only take width from them. */}
          {team.staff.plan ? (
            <div className="text-low truncate text-xs">
              {team.staff.plan.displayName}
            </div>
          ) : null}
        </td>
        <td className="p-4 text-right text-sm tabular-nums">
          {team.membersCount}
        </td>
        {/* Before the two amounts rather than after: the row reads as what the
            team is, then what it consumed, then what that comes to. */}
        <td className="p-4 text-right text-sm tabular-nums">
          <ScreenshotsCell team={team} billing={billing} />
        </td>
        <BilledPeriodCells team={team} billing={billing} />
        <td className="p-4 text-right text-sm">
          <Button variant="secondary" size="small" onClick={toggleMembers}>
            {isOpened ? "Hide members" : "Show members"}
          </Button>
        </td>
      </tr>
      {isOpened ? (
        <tr
          className={
            index % 2 === 0
              ? `bg-subtle ${isLast ? "" : "border-b"}`
              : `bg-app ${isLast ? "" : "border-b"}`
          }
        >
          <td colSpan={8} className="border-t px-4 py-3">
            {membersError ? (
              <div className="text-danger-low text-sm">
                Failed to load team members.
              </div>
            ) : membersLoading ? (
              <div className="text-low text-sm">Loading members…</div>
            ) : (
              <StaffMembersPanel members={members} />
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function StaffTeamsTable(props: {
  teams: TeamItem[];
  openedTeams: Record<string, boolean>;
  setOpenedTeams: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  /** A new page is on its way while the previous one is still on screen. */
  isRefreshing: boolean;
}) {
  const {
    teams,
    openedTeams,
    setOpenedTeams,
    sortKey,
    sortDirection,
    onSort,
    isRefreshing,
  } = props;
  const isBusy = useDelayedFlag(isRefreshing, BUSY_DELAY_MS);

  return (
    // The rows stay put while the next page loads — replacing them with a
    // spinner would make every sort look like a page that had to be rebuilt.
    // Dimmed and marked busy instead, because ordering by an amount prices
    // every billed team and takes long enough to look like nothing happened.
    <div className="relative" aria-busy={isBusy}>
      {isBusy ? (
        <div className="absolute inset-0 z-10 flex items-start justify-center pt-24">
          {/* Uncolored like every other loader in the app — it reports a state,
              it is not an accent. The wait is already past the threshold by the
              time this mounts, so it has nothing left of its own to hold back. */}
          <Loader className="text-low size-8" delay={0} />
        </div>
      ) : null}
      <div
        className={clsx(
          "overflow-x-auto rounded-sm border transition-opacity",
          // Enough to say the figures are no longer current, not so much that
          // they stop being readable — the point of leaving the rows up is that
          // they can still be read. Not `pointer-events-none` either: the table
          // still scrolls sideways and rows still open while the page loads.
          isBusy && "opacity-65",
        )}
      >
        <table className="w-full min-w-256 table-fixed border-collapse">
          {/* Widths live on the headers rather than in a `colgroup`: the
            positional mapping broke silently whenever a column moved. */}
          <thead>
            <tr className="text-low border-b text-xs font-semibold">
              <SortHeader
                label="Team"
                sortKey="team"
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="w-[26%] text-left"
              />
              <SortHeader
                label="Created"
                sortKey="createdAt"
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="w-[12%] text-left"
              />
              <th className="w-[10%] px-4 py-3 text-left">Subscription</th>
              <SortHeader
                label="Members"
                sortKey="members"
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="w-[8%] text-right"
              />
              {/* Not sortable, unlike the amounts beside it: the ordering would
                  have to be computed over every candidate the way theirs is,
                  and nothing has asked to read the directory that way yet. */}
              <th className="w-[9%] px-4 py-3 text-right">
                <Tooltip content="Consumed since the running period opened, against what the subscription includes in each one. It resets when the period closes.">
                  <span className="underline decoration-dotted underline-offset-2">
                    Screenshots
                  </span>
                </Tooltip>
              </th>
              {/* Two periods rather than one: a single settled figure says what a
                team is worth, the pair says which way it is going. */}
              <SortHeader
                label="Last period"
                sortKey="previousPeriod"
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="w-[9%] text-right"
              />
              <SortHeader
                label="Current period"
                sortKey="currentPeriod"
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="w-[12%] text-right"
              />
              <th className="w-[14%] px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => (
              <StaffTeamRow
                key={team.id}
                team={team}
                index={index}
                isLast={index === teams.length - 1}
                isOpened={Boolean(openedTeams[team.id])}
                toggleMembers={() => {
                  setOpenedTeams((state) => ({
                    ...state,
                    [team.id]: !state[team.id],
                  }));
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffTeamsList() {
  const [openedTeams, setOpenedTeams] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const deferredSearch = useDeferredValue(search);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [intervalFilter, setIntervalFilter] = useQueryState(
    "interval",
    parseAsStringEnum<IntervalFilter>([...INTERVAL_FILTER_KEYS]).withDefault(
      "all",
    ),
  );

  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsStringEnum<StatusFilter>([...STATUS_FILTER_KEYS]).withDefault(
      STATUS_FILTER_ALL,
    ),
  );

  const normalizedSearch = deferredSearch.trim();

  const { data, previousData, loading, error } = useQuery(StaffTeamsQuery, {
    variables: {
      after: (page - 1) * PAGE_SIZE,
      first: PAGE_SIZE,
      search: normalizedSearch || null,
      interval: INTERVAL_FILTERS[intervalFilter].interval,
      status: statusFilter === STATUS_FILTER_ALL ? null : statusFilter,
      orderBy: ORDER_BY[sortKey][sortDirection],
    },
  });

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setPage(1);
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setPage(1);
    setSortKey(key);
    setSortDirection(key === "team" || key === "createdAt" ? "asc" : "desc");
  };

  // The page already on screen stays there while the next one loads. Reading
  // `data` alone would empty the table back to a spinner on every sort, search
  // and page change, since each one is a different query.
  const connection = (data ?? previousData)?.staffTeams;
  const teams = useMemo(
    () => (connection?.edges ?? []).map(toStaffTeam),
    [connection?.edges],
  );
  const totalCount = connection?.pageInfo.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const displayFrom = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const displayTo = Math.min(currentPage * PAGE_SIZE, totalCount);

  if (error) {
    const isForbidden =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((error) => error.extensions?.code === "FORBIDDEN");

    if (isForbidden) {
      return (
        <Alert>
          <AlertTitle>Access restricted</AlertTitle>
          <AlertText>This page is only available to staff users.</AlertText>
          <AlertText>
            <Link href="/teams">Go to your teams</Link>
          </AlertText>
        </Alert>
      );
    }

    throw error;
  }

  // Only the very first load has nothing to show. Guarding on `data` instead
  // would replace the whole page — search box included — with a spinner on
  // every sort, filter and page change, since each one is a different query
  // and Apollo empties `data` while it runs.
  if (!connection) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>All Teams</Heading>
          <Text slot="headline">
            Team directory for staff with members, subscriptions, and usage.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions className="items-center">
          <Select
            value={intervalFilter}
            onValueChange={(value) => {
              setPage(1);
              setIntervalFilter(value);
            }}
          >
            {/* On the trigger rather than on `Select`, whose own `aria-label`
                lands on a wrapper with no role and names nothing. */}
            <SelectButton aria-label="Billing interval" className="text-sm">
              {INTERVAL_FILTERS[intervalFilter].label}
            </SelectButton>
            <ListBox>
              {INTERVAL_FILTER_KEYS.map((key) => (
                <ListBoxItem key={key} value={key}>
                  <ListBoxItemLabel>
                    {INTERVAL_FILTERS[key].label}
                  </ListBoxItemLabel>
                </ListBoxItem>
              ))}
            </ListBox>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setPage(1);
              setStatusFilter(value);
            }}
          >
            <SelectButton aria-label="Subscription status" className="text-sm">
              {getStatusFilterLabel(statusFilter)}
            </SelectButton>
            <ListBox>
              {STATUS_FILTER_KEYS.map((key) => (
                <ListBoxItem key={key} value={key}>
                  <ListBoxItemLabel>
                    {getStatusFilterLabel(key)}
                  </ListBoxItemLabel>
                </ListBoxItem>
              ))}
            </ListBox>
          </Select>
          <TextInputGroup className="w-72">
            <TextInputIcon>
              <SearchIcon />
            </TextInputIcon>
            <TextInput
              type="search"
              placeholder="Search teams or members…"
              scale="sm"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
            />
          </TextInputGroup>
        </PageHeaderActions>
      </PageHeader>
      <StaffTeamsTable
        teams={teams}
        openedTeams={openedTeams}
        setOpenedTeams={setOpenedTeams}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
        isRefreshing={loading}
      />
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-low">
          Showing {displayFrom}-{displayTo} of {totalCount} teams
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <div className="text-low px-2 tabular-nums">
            {currentPage} / {totalPages}
          </div>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

export function Component() {
  return (
    <Page>
      <Helmet>
        <title>All Teams</title>
      </Helmet>
      <AuthGuard>{() => <StaffTeamsList />}</AuthGuard>
    </Page>
  );
}
