import { useDeferredValue, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { diffInCalendarDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import { CreditCardIcon, SearchIcon } from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Helmet } from "react-helmet";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard } from "@/containers/AuthGuard";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import { AccountSubscriptionStatus, PlanInterval } from "@/gql/graphql";
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
import { PageLoader } from "@/ui/PageLoader";
import { Select, SelectButton } from "@/ui/Select";
import { SortHeader, type SortDirection } from "@/ui/SortHeader";
import { Text } from "@/ui/Text";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";

import { getAccountURL } from "../Account/AccountParams";
import { formatPrice, getPeriodFlatPrice, type PricedPlan } from "./pricing";
import { getStripeCustomerURL } from "./stripe";

const StaffTeamsQuery = graphql(`
  query StaffTeams_staffTeams {
    staffTeams {
      id
      createdAt
      slug
      name
      membersCount
      subscriptionStatus
      stripeCustomerId
      staff {
        flatPrice
        plan {
          id
          name
          displayName
          interval
        }
        periodUsage {
          billingPeriods {
            from
            to
            closed
            additionalScreenshotsCost
          }
        }
      }
      avatar {
        ...AccountAvatarFragment
      }
    }
  }
`);

const StaffTeamMembersQuery = graphql(`
  query StaffTeams_teamDetails(
    $teamAccountId: ID!
    $first: Int!
    $after: Int!
  ) {
    teamById(id: $teamAccountId) {
      id
      ... on Team {
        subscriptionStatus
        last30DaysScreenshots
        projects(first: 100, after: 0) {
          pageInfo {
            totalCount
            hasNextPage
          }
          edges {
            id
            name
            buildsCount
          }
        }
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

type TeamNode = DocumentType<typeof StaffTeamsQuery>["staffTeams"][number];

/**
 * A team with its staff block resolved.
 *
 * `Team.staff` is nullable because non-staff must not read it, but this page is
 * only reachable through `staffTeams`, which refuses non-staff outright.
 * Narrowing once here keeps the billing cells below honest instead of defaulting
 * a missing amount to zero, which would render as a real figure.
 */
type TeamItem = TeamNode & { staff: NonNullable<TeamNode["staff"]> };

function checkHasStaffData(team: TeamNode): team is TeamItem {
  return team.staff !== null;
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
type TeamProjectItem = NonNullable<
  Extract<
    DocumentType<typeof StaffTeamMembersQuery>["teamById"],
    { __typename?: "Team" }
  >["projects"]
>["edges"][number];

type SortKey =
  | "team"
  | "createdAt"
  | "members"
  | "previousPeriod"
  | "currentPeriod";

const PAGE_SIZE = 100;

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

/**
 * A team with no plan matches neither interval: the filter is on how a team is
 * billed, and one that is not billed has no interval to match.
 */
function checkTeamMatchesInterval(team: TeamItem, filter: IntervalFilter) {
  const { interval } = INTERVAL_FILTERS[filter];
  return interval === null || team.staff.plan?.interval === interval;
}

/** One period of a team, with what it came to. */
type BilledPeriod = { period: BillingPeriod; amount: number };

/** The two periods this page reports on, priced. */
type TeamBilling = {
  plan: PricedPlan;
  /**
   * The last period that closed. A settled figure — the same whatever day it is
   * read on. Null until the team closes its first one.
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
 * Sortable value per column. Teams that bill nothing sort below every billed one
 * rather than tying with a $0 amount, which no billed team can have — the flat
 * price alone puts a floor under it.
 */
function getSortValue(team: TeamItem, key: SortKey): string | number {
  switch (key) {
    case "team":
      return (team.name || team.slug).toLowerCase();
    case "createdAt":
      return new Date(team.createdAt).getTime();
    case "members":
      return team.membersCount;
    case "previousPeriod":
      return getTeamBilling(team)?.previous?.amount ?? -1;
    case "currentPeriod":
      return getTeamBilling(team)?.current?.amount ?? -1;
  }
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
 * How far into the running period the team is.
 *
 * The running period is partial by construction, so it reads lower than the one
 * before it whatever the team is doing. How far in it is tells a genuine drop
 * from a period that simply opened three days ago.
 *
 * Counted from the period's own start rather than shown as a fraction: a
 * running period's `to` is the moment it was read, and its end is derived server
 * side from a subscription anniversary this page cannot reproduce. Neutralized
 * for visual tests — it moves every day, and the table would rebaseline
 * overnight.
 */
function PeriodProgress(props: { period: BillingPeriod }) {
  const days = diffInCalendarDays(
    new Date(props.period.to),
    new Date(props.period.from),
  );

  return (
    <div className="text-low text-xs" data-visual-test="transparent">
      {days === 1 ? "1 day in" : `${days} days in`}
    </div>
  );
}

/** What a team billed over one period, or an em dash when it billed nothing. */
function BilledAmount(props: {
  team: TeamItem;
  billing: TeamBilling | null;
  billed: BilledPeriod | null;
  /** Rendered under the amount — what makes the two period columns readable. */
  footnote: React.ReactNode;
}) {
  const { team, billing, billed, footnote } = props;

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
 * The two period columns, rendered as a pair.
 *
 * They have to agree on whether a footnote line is there at all: only the
 * running period has one, and a cell one line taller than its neighbour centers
 * differently, so the two amounts stop sitting on the same line. Aligning both
 * cells to the top instead fixes the pair and breaks the row — the amounts then
 * float above the members count and the links, which are centered. So the empty
 * line is kept on the left column whenever the right one has one, and neither
 * on the rows that have no running period.
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
        <BilledAmount
          team={team}
          billing={billing}
          billed={billing?.previous ?? null}
          footnote={footnote ? <div className="text-xs">&nbsp;</div> : null}
        />
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        <BilledAmount
          team={team}
          billing={billing}
          billed={current}
          footnote={footnote}
        />
      </td>
    </>
  );
}

function checkTeamMatchesSearch(team: TeamItem, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [team.name, team.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
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

function StaffProjectsPanel(props: {
  projects: TeamProjectItem[];
  hasMore: boolean;
}) {
  if (props.projects.length === 0) {
    return <div className="text-low text-sm">No projects found.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {props.projects.map((project) => (
        <div
          key={project.id}
          className="bg-app grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-sm border p-2 text-sm"
        >
          <div className="truncate font-medium">{project.name}</div>
          <div className="text-low tabular-nums">
            {project.buildsCount} builds
          </div>
        </div>
      ))}
      {props.hasMore ? (
        <div className="text-low text-xs">
          Showing first 100 projects. Refine data in the team page for full
          list.
        </div>
      ) : null}
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
  const analyticsURL = `${teamURL}/~/analytics`;
  const billing = getTeamBilling(team);
  const {
    data: detailsData,
    loading: detailsLoading,
    error: detailsError,
  } = useQuery(StaffTeamMembersQuery, {
    variables: {
      teamAccountId: team.id,
      first: 100,
      after: 0,
    },
    skip: !isOpened,
  });

  const members =
    detailsData?.teamById?.__typename === "Team"
      ? detailsData.teamById.members.edges
      : [];
  const details =
    detailsData?.teamById?.__typename === "Team" ? detailsData.teamById : null;
  const projects = details?.projects.edges ?? [];
  const projectsCount = details?.projects.pageInfo.totalCount ?? 0;
  const hasMoreProjects = Boolean(details?.projects.pageInfo.hasNextPage);
  const subscriptionStatus = details?.subscriptionStatus ?? null;
  const last30DaysScreenshots = details?.last30DaysScreenshots ?? 0;

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
            <AccountAvatar avatar={team.avatar} className="size-8" />
            <div className="min-w-0">
              <div className="truncate font-medium">
                {team.name || team.slug}
              </div>
              <div className="text-low truncate">{team.slug}</div>
            </div>
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
        <BilledPeriodCells team={team} billing={billing} />
        <td className="p-4 text-right text-sm">
          <div className="flex items-center justify-end gap-3 whitespace-nowrap">
            <Link href={teamURL}>Team</Link>
            <Link href={analyticsURL}>Analytics</Link>
            {/* Only for teams that reached checkout — a link to
                `/customers/null` would only look broken. */}
            {team.stripeCustomerId ? (
              <Link
                href={getStripeCustomerURL(team.stripeCustomerId)}
                target="_blank"
              >
                Stripe
              </Link>
            ) : null}
          </div>
        </td>
        <td className="p-4 text-right text-sm">
          <Button variant="secondary" size="small" onClick={toggleMembers}>
            {isOpened ? "Hide details" : "View details"}
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
            {detailsError ? (
              <div className="text-danger-low text-sm">
                Failed to load team details.
              </div>
            ) : detailsLoading ? (
              <div className="text-low text-sm">Loading details…</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2 text-sm md:grid-cols-3">
                  <div className="bg-app rounded-sm border p-3">
                    <div className="text-low text-xs uppercase">
                      Subscription
                    </div>
                    <div className="font-medium">
                      <SubscriptionLabel status={subscriptionStatus} />
                    </div>
                  </div>
                  <div className="bg-app rounded-sm border p-3">
                    <div className="text-low text-xs uppercase">Projects</div>
                    <div className="font-medium tabular-nums">
                      {projectsCount}
                    </div>
                  </div>
                  <div className="bg-app rounded-sm border p-3">
                    <div className="text-low text-xs uppercase">
                      Screenshots (30d)
                    </div>
                    <div className="font-medium tabular-nums">
                      {last30DaysScreenshots}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium">
                    Builds by project
                  </div>
                  <StaffProjectsPanel
                    projects={projects}
                    hasMore={hasMoreProjects}
                  />
                </div>

                <div>
                  <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs font-medium">
                    <div>Member / Emails</div>
                    <div>Role</div>
                  </div>
                  <StaffMembersPanel members={members} />
                </div>
              </div>
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
}) {
  const { teams, openedTeams, setOpenedTeams, sortKey, sortDirection, onSort } =
    props;

  return (
    <div className="overflow-x-auto rounded-sm border">
      <table className="w-full min-w-300 table-fixed border-collapse">
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
              className="w-[22%] text-left"
            />
            <SortHeader
              label="Created"
              sortKey="createdAt"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[11%] text-left"
            />
            <th className="w-[12%] px-4 py-3 text-left">Subscription</th>
            <SortHeader
              label="Members"
              sortKey="members"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[7%] text-right"
            />
            {/* Two periods rather than one: a single settled figure says what a
                team is worth, the pair says which way it is going. */}
            <SortHeader
              label="Last period"
              sortKey="previousPeriod"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[11%] text-right"
            />
            <SortHeader
              label="Current period"
              sortKey="currentPeriod"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[11%] text-right"
            />
            <th className="w-[16%] px-4 py-3 text-right">Links</th>
            <th className="w-[10%] px-4 py-3 text-right">Actions</th>
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
  );
}

function StaffTeamsList() {
  const { data, loading, error } = useQuery(StaffTeamsQuery);
  const [openedTeams, setOpenedTeams] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
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

  const normalizedSearch = deferredSearch.trim().toLowerCase();

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

  const filteredAndSortedTeams = useMemo(() => {
    const teams = (data?.staffTeams ?? [])
      .filter(checkHasStaffData)
      .filter((team) => checkTeamMatchesInterval(team, intervalFilter))
      .filter((team) => checkTeamMatchesSearch(team, normalizedSearch));

    const directionFactor = sortDirection === "asc" ? 1 : -1;

    teams.sort((a, b) => {
      const left = getSortValue(a, sortKey);
      const right = getSortValue(b, sortKey);

      if (typeof left === "string" && typeof right === "string") {
        return left.localeCompare(right) * directionFactor;
      }

      return (Number(left) - Number(right)) * directionFactor;
    });

    return teams;
  }, [
    data?.staffTeams,
    intervalFilter,
    normalizedSearch,
    sortDirection,
    sortKey,
  ]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedTeams.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);

  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedTeams.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredAndSortedTeams]);
  const displayFrom =
    filteredAndSortedTeams.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const displayTo = Math.min(
    currentPage * PAGE_SIZE,
    filteredAndSortedTeams.length,
  );

  if (loading) {
    return <PageLoader />;
  }

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

  if (!data) {
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
        teams={paginatedTeams}
        openedTeams={openedTeams}
        setOpenedTeams={setOpenedTeams}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
      />
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-low">
          Showing {displayFrom}-{displayTo} of {filteredAndSortedTeams.length}{" "}
          teams
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
