import { useDeferredValue, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { addDays, startOfDay } from "@argos/util/date";
import clsx from "clsx";
import {
  CircleDollarSignIcon,
  CircleXIcon,
  MailIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Helmet } from "react-helmet";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard } from "@/containers/AuthGuard";
import { PeriodSelect, usePeriodState } from "@/containers/PeriodSelect";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import {
  AccountSubscriptionProvider,
  PlanInterval,
  SubscriptionCancellationReason,
  SubscriptionCancelReason,
} from "@/gql/graphql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { LinkButton } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderHeadline,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { SortHeader, type SortDirection } from "@/ui/SortHeader";
import { StatTile, StatTileGroup } from "@/ui/StatTile";
import { Switch } from "@/ui/Switch";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";

import { getAccountURL } from "../Account/AccountParams";
import { getCancellationEmail } from "./Cancellations.email";
import { PRO_MONTHLY_PRICE, PRO_PLAN_NAME } from "./pricing";
import { StripeCustomerLink } from "./stripe";
import { getMailtoUrl } from "./Trials.email";

const CancellationsQuery = graphql(`
  query StaffCancellations_staffCancellations($days: Int!) {
    staffCancellations(days: $days) {
      id
      provider
      canceledAt
      endDate
      cancellationReason
      cancellationFeedback
      cancellationComment
      staffContactedAt
      monthlyRevenue
      lifetimeRevenue
      plan {
        id
        name
        displayName
        interval
      }
      team {
        id
        createdAt
        slug
        name
        stripeCustomerId
        lastBuildDate
        avatar {
          ...AccountAvatarFragment
        }
        staff {
          owners {
            id
            name
            email
          }
        }
      }
    }
  }
`);

const SetStaffCancellationContactMutation = graphql(`
  mutation StaffCancellations_setStaffCancellationContact(
    $subscriptionId: ID!
    $contacted: Boolean!
  ) {
    setStaffCancellationContact(
      input: { subscriptionId: $subscriptionId, contacted: $contacted }
    ) {
      id
      staffContactedAt
    }
  }
`);

type CancellationNode = DocumentType<
  typeof CancellationsQuery
>["staffCancellations"][number];

/**
 * A cancellation with its team's staff block resolved.
 *
 * `Team.staff` is nullable because non-staff must not read it, but the query
 * behind this page refuses non-staff outright, like the trial pipeline's.
 */
type Cancellation = CancellationNode & {
  team: CancellationNode["team"] & {
    staff: NonNullable<CancellationNode["team"]["staff"]>;
  };
};

function checkHasStaffData(
  cancellation: CancellationNode,
): cancellation is Cancellation {
  return cancellation.team.staff !== null;
}

/**
 * Wider than the trial pipeline's: a team cancels far less often than one
 * signs up, and a month of cancellations is too few to read a reason off.
 */
const PERIOD_DAYS = {
  last30Days: 30,
  last90Days: 90,
  last365Days: 365,
} as const;

/** Built per render, like the trial pipeline's, so `from` never goes stale. */
function getCancellationPeriods() {
  return Object.fromEntries(
    Object.entries(PERIOD_DAYS).map(([key, days]) => [
      key,
      {
        from: startOfDay(addDays(new Date(), -days)),
        label: `Last ${days} days`,
      },
    ]),
  ) as Record<keyof typeof PERIOD_DAYS, { from: Date; label: string }>;
}

/**
 * Pinned like the revenue page's: the amounts are euros read off the invoice
 * mirror, the figures that page reports in French notation.
 */
const EUR_PRICE_FORMAT = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * Why a team left, as one key: the survey answer, unless the subscription
 * ended over a payment, which no answer explains.
 */
type ReasonKey =
  | SubscriptionCancelReason
  | SubscriptionCancellationReason.PaymentFailed
  | SubscriptionCancellationReason.PaymentDisputed
  | "no_answer";

const REASON_LABELS: Record<ReasonKey, string> = {
  [SubscriptionCancelReason.TooExpensive]: "Too expensive",
  [SubscriptionCancelReason.MissingFeatures]: "Missing features",
  [SubscriptionCancelReason.SwitchedService]: "Switched to another tool",
  [SubscriptionCancelReason.Unused]: "Not used enough",
  [SubscriptionCancelReason.TooComplex]: "Too hard to set up or use",
  [SubscriptionCancelReason.LowQuality]: "Did not work well enough",
  [SubscriptionCancelReason.CustomerService]: "Support",
  [SubscriptionCancelReason.Other]: "Other",
  [SubscriptionCancellationReason.PaymentFailed]: "Payment failed",
  [SubscriptionCancellationReason.PaymentDisputed]: "Payment disputed",
  no_answer: "No answer",
};

function getReasonKey(cancellation: Cancellation): ReasonKey {
  switch (cancellation.cancellationReason) {
    case SubscriptionCancellationReason.PaymentFailed:
    case SubscriptionCancellationReason.PaymentDisputed:
      return cancellation.cancellationReason;
    default:
      return cancellation.cancellationFeedback ?? "no_answer";
  }
}

function checkIsPaymentReason(key: ReasonKey) {
  return (
    key === SubscriptionCancellationReason.PaymentFailed ||
    key === SubscriptionCancellationReason.PaymentDisputed
  );
}

/** Scheduled to end, so still on its plan and still able to resume. */
function checkIsStillRunning(cancellation: Cancellation) {
  return new Date(cancellation.endDate).getTime() > Date.now();
}

/**
 * Canceled before its trial converted. Only Stripe tells: GitHub shares no
 * invoices, so a Marketplace subscription is never read as one.
 */
function checkWasTrial(cancellation: Cancellation) {
  return (
    cancellation.provider === AccountSubscriptionProvider.Stripe &&
    cancellation.monthlyRevenue === null
  );
}

/**
 * Whether the retention discount can be offered: a Stripe subscription to
 * monthly Pro billed about its flat price, or a trial that never billed.
 *
 * A bigger account's bill is mostly overage, which a discount on the plan
 * barely moves; its price answer gets a call instead. A GitHub subscription is
 * billed by GitHub, which takes no discount of ours.
 */
function checkIsDiscountable(cancellation: Cancellation) {
  return (
    cancellation.provider === AccountSubscriptionProvider.Stripe &&
    cancellation.plan.name === PRO_PLAN_NAME &&
    cancellation.plan.interval === PlanInterval.Month &&
    // In euros against Pro's list price in dollars: at or under it, the bill is
    // the flat price with a few euros of overage at most.
    (cancellation.monthlyRevenue === null ||
      cancellation.monthlyRevenue <= PRO_MONTHLY_PRICE)
  );
}

type SortKey =
  | "team"
  | "createdAt"
  | "canceledAt"
  | "status"
  | "reason"
  | "lastActivity"
  | "monthlyRevenue"
  | "contacted";

/**
 * When a cancellation was asked for, falling back on when it ended for the
 * rows the provider gave no date: an end is never earlier than the ask.
 */
function getCanceledTime(cancellation: Cancellation): number {
  return new Date(cancellation.canceledAt ?? cancellation.endDate).getTime();
}

function getSortValue(
  cancellation: Cancellation,
  key: SortKey,
): string | number {
  switch (key) {
    case "team":
      return (cancellation.team.name || cancellation.team.slug).toLowerCase();
    case "createdAt":
      return new Date(cancellation.team.createdAt).getTime();
    case "canceledAt":
      return getCanceledTime(cancellation);
    // Still running first: those are the ones left to act on.
    case "status":
      return checkIsStillRunning(cancellation) ? 1 : 0;
    case "reason":
      return REASON_LABELS[getReasonKey(cancellation)].toLowerCase();
    case "lastActivity":
      return cancellation.team.lastBuildDate
        ? new Date(cancellation.team.lastBuildDate).getTime()
        : 0;
    case "monthlyRevenue":
      return cancellation.monthlyRevenue ?? -1;
    case "contacted":
      return cancellation.staffContactedAt ? 1 : 0;
  }
}

function sortCancellations(
  cancellations: Cancellation[],
  key: SortKey,
  direction: SortDirection,
): Cancellation[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...cancellations].sort((a, b) => {
    const left = getSortValue(a, key);
    const right = getSortValue(b, key);

    if (typeof left === "string" && typeof right === "string") {
      return left.localeCompare(right) * factor;
    }

    return ((left as number) - (right as number)) * factor;
  });
}

function checkMatchesSearch(cancellation: Cancellation, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [cancellation.team.name, cancellation.team.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

/** The plan under the team name, silent on monthly Pro, which nearly all are. */
function PlanLine(props: { plan: Cancellation["plan"] }) {
  const { plan } = props;
  const isYearly = plan.interval === PlanInterval.Year;

  if (plan.name === PRO_PLAN_NAME && !isYearly) {
    return null;
  }

  return (
    <div className="text-low truncate text-xs">
      {plan.displayName}
      {isYearly ? ", yearly" : null}
    </div>
  );
}

function StatusCell(props: { cancellation: Cancellation }) {
  const { cancellation } = props;
  const { endDate } = cancellation;

  if (checkIsStillRunning(cancellation)) {
    return (
      <div className="whitespace-nowrap">
        <Tooltip content="Still on its plan until then, and able to resume without going through checkout again.">
          <span className="text-warning-low font-medium">ending</span>
        </Tooltip>
        <div className="text-low text-xs">
          <Time date={endDate} />
        </div>
      </div>
    );
  }

  return (
    <div className="whitespace-nowrap">
      <span className="text-danger-low font-medium">ended</span>
      <div className="text-low text-xs">
        <Time date={endDate} />
      </div>
    </div>
  );
}

function ReasonCell(props: { cancellation: Cancellation }) {
  const { cancellation } = props;
  const key = getReasonKey(cancellation);
  const comment = cancellation.cancellationComment;

  return (
    <div className="min-w-0">
      <div
        className={clsx(
          "font-medium",
          key === "no_answer" && "text-low",
          checkIsPaymentReason(key) &&
            "text-danger-low inline-flex items-center gap-1",
        )}
      >
        {checkIsPaymentReason(key) ? (
          <TriangleAlertIcon className="size-4 shrink-0" />
        ) : null}
        {REASON_LABELS[key]}
      </div>
      {comment ? (
        <Tooltip content={<div className="max-w-sm">{comment}</div>}>
          <div className="text-low line-clamp-2 text-xs">“{comment}”</div>
        </Tooltip>
      ) : null}
    </div>
  );
}

/** What the team paid a month, with what it paid in all under it. */
function RevenueCell(props: { cancellation: Cancellation }) {
  const { monthlyRevenue, lifetimeRevenue } = props.cancellation;

  if (monthlyRevenue === null) {
    return (
      <div>
        <span className="text-low">—</span>
        {checkWasTrial(props.cancellation) ? (
          <div className="text-low text-xs">trial</div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <Tooltip content="Its last paid cycle bill, tax excluded. A yearly bill counts a twelfth, and dollars are converted at the revenue page's fixed rate.">
        <span className="font-medium">
          {EUR_PRICE_FORMAT.format(monthlyRevenue)}
        </span>
      </Tooltip>
      {lifetimeRevenue !== null ? (
        <div className="text-low text-xs">
          {EUR_PRICE_FORMAT.format(lifetimeRevenue)} in all
        </div>
      ) : null}
    </div>
  );
}

/**
 * Opens a drafted email in the staff member's own mail client, and records that
 * the team was reached out to: the trial pipeline's control, kept on the
 * cancellation instead of the team.
 */
function ContactCell(props: { cancellation: Cancellation }) {
  const { cancellation } = props;
  const [setContact, { loading }] = useMutation(
    SetStaffCancellationContactMutation,
  );
  const { owners } = cancellation.team.staff;
  const { subject, body } = getCancellationEmail({
    owners,
    reason: cancellation.cancellationReason ?? null,
    feedback: cancellation.cancellationFeedback ?? null,
    runsUntil:
      checkIsStillRunning(cancellation) && cancellation.endDate
        ? new Date(cancellation.endDate)
        : null,
    resumable: cancellation.provider === AccountSubscriptionProvider.Stripe,
    wasTrial: checkWasTrial(cancellation),
    discountable: checkIsDiscountable(cancellation),
  });
  const mailtoUrl = getMailtoUrl({ owners, subject, body });
  const contactedAt = cancellation.staffContactedAt ?? null;

  const markContacted = (contacted: boolean) => {
    // Caught so a failed mark never breaks the draft that just opened, and
    // toasted so it cannot pass for a switch that simply refused to move.
    setContact({
      variables: { subscriptionId: cancellation.id, contacted },
    }).catch((error: unknown) => {
      toast.error(getErrorMessage(error));
    });
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <LinkButton
        href={mailtoUrl || undefined}
        variant="secondary"
        size="small"
        iconOnly
        aria-label="Draft follow-up email"
        onClick={() => {
          if (!contactedAt) {
            markContacted(true);
          }
        }}
      >
        <MailIcon />
      </LinkButton>

      <span
        title={
          contactedAt
            ? `Contacted on ${new Date(contactedAt).toLocaleDateString()}`
            : "Not contacted yet"
        }
      >
        <Switch
          size="sm"
          aria-label="Follow-up email sent"
          checked={Boolean(contactedAt)}
          disabled={loading}
          onCheckedChange={markContacted}
        />
      </span>
    </div>
  );
}

function CancellationRow(props: { cancellation: Cancellation; index: number }) {
  const { cancellation, index } = props;
  const { team } = cancellation;

  return (
    <tr className={clsx("border-b", index % 2 === 0 ? "bg-app" : "bg-subtle")}>
      <td className="p-2 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          <AccountAvatar avatar={team.avatar} className="size-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <Link
              href={getAccountURL({ accountSlug: team.slug })}
              className="block truncate font-medium"
            >
              {team.name || team.slug}
            </Link>
            <PlanLine plan={cancellation.plan} />
          </div>
          <StripeCustomerLink stripeCustomerId={team.stripeCustomerId} />
        </div>
      </td>
      <td className="truncate p-2 text-sm">
        <Time date={team.createdAt} />
      </td>
      <td className="truncate p-2 text-sm">
        {cancellation.canceledAt ? (
          <Time date={cancellation.canceledAt} />
        ) : (
          <span className="text-low">—</span>
        )}
      </td>
      <td className="p-2 text-sm">
        <StatusCell cancellation={cancellation} />
      </td>
      <td className="p-2 text-sm">
        <ReasonCell cancellation={cancellation} />
      </td>
      <td className="truncate p-2 text-sm">
        {team.lastBuildDate && <Time date={team.lastBuildDate} />}
      </td>
      <td className="p-2 text-right text-sm tabular-nums">
        <RevenueCell cancellation={cancellation} />
      </td>
      <td className="p-2">
        <ContactCell cancellation={cancellation} />
      </td>
    </tr>
  );
}

const ALIGN_CLASS_NAMES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * Fixed widths adding up to 100, for the reasons the trial pipeline's columns
 * spell out. The reason gets the widest slice: it is the column the page is
 * read for, and the only one carrying free text.
 */
const COLUMNS: {
  key: SortKey;
  label: string;
  align: keyof typeof ALIGN_CLASS_NAMES;
  width: string;
}[] = [
  { key: "team", label: "Team", align: "left", width: "w-[19%]" },
  { key: "createdAt", label: "Created", align: "left", width: "w-[9%]" },
  { key: "canceledAt", label: "Canceled", align: "left", width: "w-[9%]" },
  { key: "status", label: "Status", align: "left", width: "w-[10%]" },
  { key: "reason", label: "Reason", align: "left", width: "w-[24%]" },
  {
    key: "lastActivity",
    label: "Last activity",
    align: "left",
    width: "w-[9%]",
  },
  {
    key: "monthlyRevenue",
    label: "Monthly",
    align: "right",
    width: "w-[10%]",
  },
  { key: "contacted", label: "Contacted", align: "center", width: "w-[10%]" },
];

function CancellationsTable(props: {
  cancellations: Cancellation[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  if (props.cancellations.length === 0) {
    return (
      <div className="text-low rounded-sm border p-8 text-center text-sm">
        No cancellation in this window.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto rounded-sm border">
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
          {props.cancellations.map((cancellation, index) => (
            <CancellationRow
              key={cancellation.id}
              cancellation={cancellation}
              index={index}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DottedHint(props: { tooltip: string; children: React.ReactNode }) {
  return (
    <Tooltip content={props.tooltip}>
      <span className="underline decoration-dotted underline-offset-2">
        {props.children}
      </span>
    </Tooltip>
  );
}

/**
 * The money the window walked away with: the Monthly column added up, rounded
 * per row like the column.
 */
function getLostMonthlyRevenue(cancellations: Cancellation[]) {
  return cancellations.reduce(
    (acc, cancellation) => {
      if (cancellation.monthlyRevenue === null) {
        return acc;
      }
      return {
        total: acc.total + Math.round(cancellation.monthlyRevenue),
        payingTeams: acc.payingTeams + 1,
      };
    },
    { total: 0, payingTeams: 0 },
  );
}

function CancellationsSummary(props: { cancellations: Cancellation[] }) {
  const { cancellations } = props;
  const stillRunning = cancellations.filter(checkIsStillRunning).length;
  const contacted = cancellations.filter(
    (cancellation) => cancellation.staffContactedAt,
  ).length;
  const lost = getLostMonthlyRevenue(cancellations);

  return (
    <StatTileGroup className="mb-6 grid-cols-2 lg:grid-cols-3">
      <StatTile
        data-visual-test="transparent"
        icon={CircleXIcon}
        color="warning"
        label="Cancellations"
        value={cancellations.length}
        hint={
          <DottedHint tooltip="Scheduled to end and still on their plan: they can resume from their billing settings until the end date, which makes them the ones to write to first.">
            {stillRunning} still running
          </DottedHint>
        }
      />
      <StatTile
        data-visual-test="transparent"
        icon={CircleDollarSignIcon}
        color="warning"
        label="MRR lost"
        value={lost.total}
        format="currency"
        currency="EUR"
        locales="fr-FR"
        hint={
          <DottedHint tooltip="The Monthly column added up. Trials canceled before they converted count nothing.">
            from {lost.payingTeams} paying teams
          </DottedHint>
        }
      />
      <StatTile
        data-visual-test="transparent"
        icon={MailIcon}
        color="primary"
        label="Contacted"
        value={contacted}
        hint={`${cancellations.length - contacted} left to contact`}
      />
    </StatTileGroup>
  );
}

function StaffCancellationsList() {
  const periodState = usePeriodState({
    defaultValue: "last90Days",
    definition: getCancellationPeriods(),
    paramName: "period",
  });
  const days = PERIOD_DAYS[periodState.value];
  const [sortKey, setSortKey] = useState<SortKey>("canceledAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data, loading, error } = useQuery(CancellationsQuery, {
    variables: { days },
  });

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    // Names and reasons read best A→Z; everything else highest-first.
    setSortDirection(key === "team" || key === "reason" ? "asc" : "desc");
  };

  const normalizedSearch = deferredSearch.trim().toLowerCase();

  // The summary describes the window, so it stays on every cancellation in it
  // whatever the search narrows the table to.
  const allCancellations = useMemo(
    () =>
      sortCancellations(
        (data?.staffCancellations ?? []).filter(checkHasStaffData),
        sortKey,
        sortDirection,
      ),
    [data?.staffCancellations, sortKey, sortDirection],
  );

  const visibleCancellations = useMemo(
    () =>
      allCancellations.filter((cancellation) =>
        checkMatchesSearch(cancellation, normalizedSearch),
      ),
    [allCancellations, normalizedSearch],
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
          <Heading>Cancellations</Heading>
          <PageHeaderHeadline>
            Teams that canceled a subscription, why they said they left, and
            whether someone wrote to them.
          </PageHeaderHeadline>
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
          <CancellationsSummary cancellations={allCancellations} />
          <CancellationsTable
            cancellations={visibleCancellations}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          {normalizedSearch ? (
            <div
              className="text-low mt-3 text-sm"
              data-visual-test="transparent"
            >
              Showing {visibleCancellations.length} of {allCancellations.length}{" "}
              teams
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
        <title>Cancellations</title>
      </Helmet>
      <AuthGuard>{() => <StaffCancellationsList />}</AuthGuard>
    </Page>
  );
}
