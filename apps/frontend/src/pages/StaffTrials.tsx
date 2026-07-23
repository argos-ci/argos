import { useDeferredValue, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { checkIsTrialingSubscriptionStatus } from "@argos/schemas/subscription-status";
import clsx from "clsx";
import {
  CheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  ImagesIcon,
  MailIcon,
  MinusIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import moment from "moment";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard } from "@/containers/AuthGuard";
import { PeriodSelect, usePeriodState } from "@/containers/PeriodSelect";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import { AccountSubscriptionStatus } from "@/gql/graphql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { LinkButton } from "@/ui/Button";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { SortHeader, type SortDirection } from "@/ui/SortHeader";
import { StatTile } from "@/ui/StatTile";
import { Switch } from "@/ui/Switch";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

import { getAccountURL } from "./Account/AccountParams";
import { getMailtoUrl, getOnboardingEmail } from "./StaffTrials.email";

const TrialPipelineQuery = graphql(`
  query StaffTrials_staffTrialPipeline($days: Int!) {
    staffTrialPipeline(days: $days) {
      id
      createdAt
      slug
      name
      subscriptionStatus
      lastBuildDate
      staff {
        buildsCount
        screenshotsCount
        firstComparisonAt
        owners {
          id
          name
          email
        }
        contact {
          id
          date
        }
      }
      avatar {
        ...AccountAvatarFragment
      }
      subscription {
        id
        provider
        trialDaysRemaining
        paymentMethodFilled
      }
    }
  }
`);

const SetTeamStaffContactMutation = graphql(`
  mutation StaffTrials_setTeamStaffContact(
    $teamAccountId: ID!
    $contacted: Boolean!
  ) {
    setTeamStaffContact(
      input: { teamAccountId: $teamAccountId, contacted: $contacted }
    ) {
      id
      staff {
        contact {
          id
          date
        }
      }
    }
  }
`);

type PipelineTeamNode = DocumentType<
  typeof TrialPipelineQuery
>["staffTrialPipeline"][number];

/**
 * A team with its staff block resolved.
 *
 * `Team.staff` is nullable because non-staff must not read it, but this page
 * is only reachable through `staffTrialPipeline`, which refuses non-staff
 * outright. Narrowing once here keeps every cell below honest instead of
 * defaulting missing counts to zero, which would render as real data.
 */
type PipelineTeam = PipelineTeamNode & {
  staff: NonNullable<PipelineTeamNode["staff"]>;
};

function checkHasStaffData(team: PipelineTeamNode): team is PipelineTeam {
  return team.staff !== null;
}

/**
 * The resolver takes a day count, the picker works on named periods — so the
 * day count is the source, and the picker definition is derived from it.
 * Holding the two side by side let them drift apart silently.
 */
const PERIOD_DAYS = {
  last7Days: 7,
  last30Days: 30,
  last90Days: 90,
} as const;

/**
 * Built per render rather than once at module load: `from` is a date relative
 * to now, and a tab left open overnight would otherwise keep resolving the
 * window against the day it was first opened.
 */
function getTrialPeriods() {
  return Object.fromEntries(
    Object.entries(PERIOD_DAYS).map(([key, days]) => [
      key,
      {
        from: moment().subtract(days, "days").startOf("day").toDate(),
        label: `Last ${days} days`,
      },
    ]),
  ) as Record<keyof typeof PERIOD_DAYS, { from: Date; label: string }>;
}

type SortKey =
  | "team"
  | "createdAt"
  | "status"
  | "lastActivity"
  | "bankInfo"
  | "checkBuild"
  | "builds"
  | "screenshots"
  | "contacted";

/**
 * Sortable value per column. Booleans and dates collapse to numbers so a single
 * comparator covers every column; teams that never reached a step sort together
 * at one end, which is the point of sorting on it.
 */
function getSortValue(team: PipelineTeam, key: SortKey): string | number {
  switch (key) {
    case "team":
      return (team.name || team.slug).toLowerCase();
    case "createdAt":
      return new Date(team.createdAt).getTime();
    case "status":
      return team.subscriptionStatus ?? "";
    case "bankInfo":
      return team.subscription?.paymentMethodFilled ? 1 : 0;
    // Ranked worst-first so sorting ascending surfaces the teams that build
    // without ever producing a comparison.
    case "checkBuild":
      if (team.staff.firstComparisonAt) {
        return 2;
      }
      return team.staff.buildsCount > 0 ? 0 : 1;
    case "lastActivity":
      return team.lastBuildDate ? new Date(team.lastBuildDate).getTime() : 0;
    case "builds":
      return team.staff.buildsCount;
    case "screenshots":
      return team.staff.screenshotsCount;
    case "contacted":
      return team.staff.contact ? 1 : 0;
  }
}

function checkTeamMatchesSearch(team: PipelineTeam, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [team.name, team.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function sortTeams(
  teams: PipelineTeam[],
  key: SortKey,
  direction: SortDirection,
): PipelineTeam[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...teams].sort((a, b) => {
    const left = getSortValue(a, key);
    const right = getSortValue(b, key);

    if (typeof left === "string" && typeof right === "string") {
      return left.localeCompare(right) * factor;
    }

    return ((left as number) - (right as number)) * factor;
  });
}

function StatusCell(props: { team: PipelineTeam }) {
  const { team } = props;
  const { subscriptionStatus } = team;
  const daysRemaining = team.subscription?.trialDaysRemaining;

  // A running trial reads as "trial" whether or not its countdown has synced
  // back from Stripe. Falling through would print the raw status, which is far
  // wider than the column.
  if (checkIsTrialingSubscriptionStatus(subscriptionStatus)) {
    // A trial about to end with no card on file is the one that needs a nudge;
    // one that already has a card will convert on its own.
    const isEndingUnpaid =
      daysRemaining != null &&
      daysRemaining <= 3 &&
      subscriptionStatus !==
        AccountSubscriptionStatus.TrialingWithPaymentMethod;

    return (
      <div className="whitespace-nowrap">
        <span className="font-medium">trial</span>
        {daysRemaining != null && (
          <span className={isEndingUnpaid ? "text-warning-low" : "text-low"}>
            {" "}
            · {daysRemaining}d left
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className={clsx(
        "font-medium whitespace-nowrap",
        checkIsLost(team) && "text-danger-low",
        subscriptionStatus === AccountSubscriptionStatus.Active &&
          "text-success-low",
      )}
    >
      {(subscriptionStatus ?? "none").replaceAll("_", " ")}
    </span>
  );
}

/**
 * A funnel step: reached or not. The hint rides on the native `title` rather
 * than a rich tooltip — the latter makes its target focusable, which would add
 * a tab stop per icon across the whole table.
 */
function StepIcon(props: { reached: boolean; label: string; title?: string }) {
  const Icon = props.reached ? CheckIcon : MinusIcon;

  return (
    <div className="flex justify-center" title={props.title}>
      <Icon
        className={clsx(
          "size-4",
          props.reached ? "text-success-low" : "text-low",
        )}
        aria-label={props.reached ? props.label : `No ${props.label}`}
      />
    </div>
  );
}

/**
 * Whether the team ever got a check build. Building repeatedly without ever
 * producing one is a failure, not a blank: something is misconfigured and no
 * diff will ever come out of it. Having built nothing yet is just silence.
 */
function CheckBuildCell(props: { team: PipelineTeam }) {
  const { team } = props;

  if (team.staff.firstComparisonAt) {
    return (
      <StepIcon
        reached
        label="Check build"
        title={new Date(team.staff.firstComparisonAt).toLocaleString()}
      />
    );
  }

  if (team.staff.buildsCount > 0) {
    return (
      <div
        className="flex justify-center"
        title={`${team.staff.buildsCount} builds, none compared to a baseline`}
      >
        <XIcon className="text-danger-low size-4" aria-label="No check build" />
      </div>
    );
  }

  return <StepIcon reached={false} label="Check build" />;
}

function PaymentCell(props: { team: PipelineTeam }) {
  const { subscription } = props.team;

  if (!subscription) {
    return (
      <div className="flex justify-center">
        <span className="text-low" title="No subscription">
          ·
        </span>
      </div>
    );
  }

  // GitHub Marketplace subscriptions are created with the flag forced on, so a
  // check there means "billed through GitHub", not "entered a card".
  const isGithub = subscription.provider !== "stripe";

  return (
    <StepIcon
      reached={subscription.paymentMethodFilled}
      label="Payment method"
      title={isGithub ? "Billed through GitHub Marketplace" : undefined}
    />
  );
}

/**
 * When the team last built. Cumulative counters say how much a team did, never
 * when — so a team that ran twelve builds three weeks ago and one that ran
 * twelve today read identically without this.
 */
function LastActivityCell(props: { date: string | null | undefined }) {
  if (!props.date) {
    return <span className="text-low">Never</span>;
  }

  return (
    <>
      <div className="truncate">
        <Time date={props.date} format="ll" tooltip="title" />
      </div>
      <div className="text-low truncate text-xs">
        <Time date={props.date} tooltip="none" />
      </div>
    </>
  );
}

/**
 * Opens a drafted onboarding email in the staff member's own mail client, and
 * records that the team was reached out to.
 *
 * The mark is set on click rather than on send — the browser cannot know
 * whether the draft was actually sent — so it stays a toggle: clicking the
 * marker again clears it if the draft was abandoned.
 */
function ContactCell(props: { team: PipelineTeam }) {
  const { team } = props;
  const [setContact, { loading }] = useMutation(SetTeamStaffContactMutation);
  const { subject, body } = getOnboardingEmail({
    owners: team.staff.owners,
    buildsCount: team.staff.buildsCount,
    hasCheckBuild: Boolean(team.staff.firstComparisonAt),
  });
  const mailtoUrl = getMailtoUrl({
    owners: team.staff.owners,
    subject,
    body,
  });
  const contactedAt = team.staff.contact?.date ?? null;

  const markContacted = (contacted: boolean) => {
    // Caught so a failed mark never breaks the draft that just opened, and
    // toasted so it cannot pass for a switch that simply refused to move.
    setContact({ variables: { teamAccountId: team.id, contacted } }).catch(
      (error: unknown) => {
        toast.error(getErrorMessage(error));
      },
    );
  };

  return (
    <div className="flex items-center justify-center gap-1">
      {mailtoUrl ? (
        <LinkButton
          href={mailtoUrl}
          variant="secondary"
          size="small"
          iconOnly
          aria-label="Draft onboarding email"
          onPress={() => {
            if (!contactedAt) {
              markContacted(true);
            }
          }}
        >
          <MailIcon />
        </LinkButton>
      ) : (
        <span className="text-low text-sm" title="No owner email on file">
          —
        </span>
      )}
      <span
        title={
          contactedAt
            ? `Contacted on ${new Date(contactedAt).toLocaleDateString()}`
            : "Not contacted yet"
        }
      >
        <Switch
          size="sm"
          aria-label="Onboarding email sent"
          isSelected={Boolean(contactedAt)}
          isDisabled={loading}
          onChange={markContacted}
        />
      </span>
    </div>
  );
}

function PipelineRow(props: { team: PipelineTeam; index: number }) {
  const { team, index } = props;
  const teamURL = getAccountURL({ accountSlug: team.slug });

  return (
    <tr className={clsx("border-b", index % 2 === 0 ? "bg-app" : "bg-subtle")}>
      <td className="p-4 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          <AccountAvatar avatar={team.avatar} className="size-8" />
          <div className="min-w-0">
            <Link href={teamURL} className="truncate font-medium">
              {team.name || team.slug}
            </Link>
            <div className="text-low truncate">{team.slug}</div>
          </div>
        </div>
      </td>
      <td className="p-4 text-sm">
        <div className="truncate">
          <Time date={team.createdAt} format="ll" tooltip="title" />
        </div>
        <div className="text-low truncate text-xs">
          <Time date={team.createdAt} tooltip="none" />
        </div>
      </td>
      <td className="p-4 text-sm">
        <LastActivityCell date={team.lastBuildDate} />
      </td>
      <td className="p-4 text-sm">
        <StatusCell team={team} />
      </td>
      <td className="p-4">
        <PaymentCell team={team} />
      </td>
      <td className="text-low p-4 text-right text-sm tabular-nums">
        {team.staff.buildsCount.toLocaleString()}
      </td>
      <td className="p-4">
        <CheckBuildCell team={team} />
      </td>
      <td className="text-low p-4 text-right text-sm tabular-nums">
        {team.staff.screenshotsCount.toLocaleString()}
      </td>
      <td className="p-4">
        <ContactCell team={team} />
      </td>
    </tr>
  );
}

// Written out rather than interpolated: Tailwind only emits classes it can find
// as complete strings in the source.
const ALIGN_CLASS_NAMES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * Widths are fixed rather than left to the content: the two date columns render
 * a formatted date, so their natural width follows the calendar — every column
 * after them would shift on the day a month name gets longer.
 */
const COLUMNS: {
  key: SortKey;
  label: string;
  align: keyof typeof ALIGN_CLASS_NAMES;
  width: string;
}[] = [
  { key: "team", label: "Team", align: "left", width: "w-[17%]" },
  { key: "createdAt", label: "Created", align: "left", width: "w-[11%]" },
  {
    key: "lastActivity",
    label: "Last activity",
    align: "left",
    width: "w-[12%]",
  },
  { key: "status", label: "Status", align: "left", width: "w-[12%]" },
  { key: "bankInfo", label: "Bank info", align: "center", width: "w-[9%]" },
  { key: "builds", label: "Builds", align: "right", width: "w-[9%]" },
  {
    key: "checkBuild",
    label: "Check build",
    align: "center",
    width: "w-[10%]",
  },
  {
    key: "screenshots",
    label: "Screenshots",
    align: "right",
    width: "w-[11%]",
  },
  { key: "contacted", label: "Contacted", align: "center", width: "w-[9%]" },
];

function PipelineTable(props: {
  teams: PipelineTeam[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  if (props.teams.length === 0) {
    return (
      <div className="text-low rounded-sm border p-8 text-center text-sm">
        No team created in this window.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border">
      <table className="w-full min-w-300 table-fixed border-collapse">
        <thead>
          <tr className="text-low border-b text-xs font-semibold">
            {COLUMNS.map((column) => (
              <SortHeader
                key={column.key}
                label={column.label}
                sortKey={column.key}
                activeSortKey={props.sortKey}
                direction={props.sortDirection}
                onSort={props.onSort}
                className={clsx(column.width, ALIGN_CLASS_NAMES[column.align])}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {props.teams.map((team, index) => (
            <PipelineRow key={team.id} team={team} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A trial that quietly ran out is as much a loss as an explicit cancelation. */
function checkIsLost(team: PipelineTeam) {
  return (
    team.subscriptionStatus === AccountSubscriptionStatus.Canceled ||
    team.subscriptionStatus === AccountSubscriptionStatus.TrialExpired
  );
}

function formatShare(value: number, total: number) {
  if (total === 0) {
    return "—";
  }
  return `${Math.round((value / total) * 100)}% of ${total}`;
}

function PipelineSummary(props: { teams: PipelineTeam[] }) {
  const { teams } = props;
  const activated = teams.filter((team) => team.staff.firstComparisonAt).length;
  const lost = teams.filter(checkIsLost).length;
  // Within this window every team starts on a trial, so an active subscription
  // means the trial converted. A carded trial is not one yet: it reports as
  // `trialing_with_payment_method` until it actually ends.
  const converted = teams.filter(
    (team) => team.subscriptionStatus === AccountSubscriptionStatus.Active,
  ).length;

  // Teams still trialing have neither converted nor churned yet. Counting them
  // in the denominator would drag both rates down for no reason other than
  // being recent — the rates only mean something over decided trials.
  const decided = converted + lost;

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        data-visual-test="transparent"
        icon={UsersIcon}
        color="primary"
        label="New teams"
        value={teams.length}
        hint={`${teams.length - decided} still trialing`}
      />
      <StatTile
        data-visual-test="transparent"
        icon={ImagesIcon}
        color="storybook"
        label="Reached check build"
        value={activated}
        hint={formatShare(activated, teams.length)}
      />
      <StatTile
        data-visual-test="transparent"
        icon={CircleCheckIcon}
        color="success"
        label="Converted"
        value={converted}
        hint={`${formatShare(converted, decided)} decided trials`}
      />
      <StatTile
        data-visual-test="transparent"
        icon={CircleXIcon}
        color="warning"
        label="Canceled or expired"
        value={lost}
        hint={`${formatShare(lost, decided)} decided trials`}
      />
    </div>
  );
}

function StaffTrialsList() {
  const periodState = usePeriodState({
    defaultValue: "last30Days",
    definition: getTrialPeriods(),
    paramName: "period",
  });
  const days = PERIOD_DAYS[periodState.value];
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data, loading, error } = useQuery(TrialPipelineQuery, {
    variables: { days },
  });

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    // Names read best A→Z; everything else is most useful highest-first.
    setSortDirection(key === "team" ? "asc" : "desc");
  };

  const normalizedSearch = deferredSearch.trim().toLowerCase();

  // The summary describes the window, so it stays on every team in it: an
  // activation rate computed over search results would mean nothing.
  const allTeams = useMemo(
    () =>
      sortTeams(
        (data?.staffTrialPipeline ?? []).filter(checkHasStaffData),
        sortKey,
        sortDirection,
      ),
    [data?.staffTrialPipeline, sortKey, sortDirection],
  );

  const visibleTeams = useMemo(
    () =>
      allTeams.filter((team) => checkTeamMatchesSearch(team, normalizedSearch)),
    [allTeams, normalizedSearch],
  );

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

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Trial pipeline</Heading>
          <Text slot="headline">
            Teams created recently, what they built, and whether they ever got a
            check build.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions className="items-center">
          <PeriodSelect state={periodState} />
          <TextInputGroup className="w-72">
            <TextInputIcon>
              <SearchIcon />
            </TextInputIcon>
            <TextInput
              type="search"
              placeholder="Search teams…"
              scale="sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </TextInputGroup>
        </PageHeaderActions>
      </PageHeader>
      {loading && !data ? (
        <PageLoader />
      ) : (
        <>
          <PipelineSummary teams={allTeams} />
          <PipelineTable
            teams={visibleTeams}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          {normalizedSearch ? (
            <div
              className="text-low mt-3 text-sm"
              data-visual-test="transparent"
            >
              Showing {visibleTeams.length} of {allTeams.length} teams
            </div>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}

export function Component() {
  return (
    <Page>
      <Helmet>
        <title>Trial pipeline</title>
      </Helmet>
      <AuthGuard>{() => <StaffTrialsList />}</AuthGuard>
    </Page>
  );
}
