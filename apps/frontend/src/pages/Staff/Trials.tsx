import { useDeferredValue, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { checkIsTrialingSubscriptionStatus } from "@argos/schemas/subscription-status";
import clsx from "clsx";
import {
  CheckIcon,
  CircleCheckIcon,
  CircleDollarSignIcon,
  CircleXIcon,
  CreditCardIcon,
  ImagesIcon,
  MailIcon,
  MinusIcon,
  SearchIcon,
  TriangleAlertIcon,
  UsersIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import moment from "moment";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard } from "@/containers/AuthGuard";
import { PeriodSelect, usePeriodState } from "@/containers/PeriodSelect";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import { AccountSubscriptionStatus, SignupSource } from "@/gql/graphql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { LinkButton } from "@/ui/Button";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { HeadlessLink, Link } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { SortHeader, type SortDirection } from "@/ui/SortHeader";
import { StatTile } from "@/ui/StatTile";
import { Switch } from "@/ui/Switch";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";

import { getAccountURL } from "../Account/AccountParams";
import { getStripeCustomerURL } from "./stripe";
import stripeLogo from "./stripe.svg";
import { getMailtoUrl, getOutreachEmail } from "./Trials.email";

const TrialPipelineQuery = graphql(`
  query StaffTrials_staffTrialPipeline($days: Int!) {
    staffTrialPipeline(days: $days) {
      id
      createdAt
      slug
      name
      subscriptionStatus
      lastBuildDate
      stripeCustomerId
      staff {
        buildsCount
        screenshotsCount
        firstComparisonAt
        periodUsage {
          additionalScreenshotsCost
          storybookRatio
          storybookScreenshotsCount
        }
        owners {
          id
          name
          email
          signupSource
          signupSourceDetail
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
  | "checkBuild"
  | "builds"
  | "screenshots"
  | "estimatedPrice"
  | "contacted";

/**
 * Flat monthly price of the Pro plan, in dollars.
 *
 * Hardcoded because the flat price is the one part of the pricing that is not
 * persisted: the Stripe sync keeps `includedScreenshots` and the per-screenshot
 * prices on the subscription, but not the plan's own amount. Pro is the only
 * usage-based plan a self-serve trial can land on, so the constant holds for
 * this page — it does not for a negotiated enterprise subscription, nor for a
 * customer billed in euros. Hence "estimated".
 */
const PRO_FLAT_PRICE = 100;

const PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * What the team would be invoiced if its period closed right now, or null when
 * it would be invoiced nothing at all.
 *
 * What is owed depends on where the team sits in its lifecycle, not only on
 * what it consumed:
 *
 * - Active: billing has started, so the flat price plus the overage accrued
 *   since the period opened. The period opened when the subscription did, which
 *   for a converted trial is the conversion itself, so that overage is real.
 * - Trialing with a card: Stripe never bills usage consumed during a trial, and
 *   a trial that goes over quota with a card on file is converted to active on
 *   the next build. Whatever it consumed, it owes the flat price and no more.
 * - Trialing with no card: committed to nothing, and a build would be rejected
 *   before it could owe anything.
 * - Anything else: canceled, expired, or never subscribed.
 *
 * A team off a usage-based plan is null throughout — there is no flat price of
 * ours to quote for it.
 */
function getEstimatedPrice(team: PipelineTeam): number | null {
  const { periodUsage } = team.staff;

  if (!periodUsage) {
    return null;
  }

  switch (team.subscriptionStatus) {
    case AccountSubscriptionStatus.Active:
      return PRO_FLAT_PRICE + periodUsage.additionalScreenshotsCost;

    case AccountSubscriptionStatus.TrialingWithPaymentMethod:
      return PRO_FLAT_PRICE;

    default:
      return null;
  }
}

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
    // Teams with nothing to bill sort below every paying one rather than tying
    // with a $0 estimate, which no billed team can have.
    case "estimatedPrice":
      return getEstimatedPrice(team) ?? -1;
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
        <span className="font-medium">trialing</span>
        {subscriptionStatus ===
          AccountSubscriptionStatus.TrialingWithPaymentMethod && (
          <Tooltip content="Payment method filled">
            <CreditCardIcon
              className="text-success-low ml-1 inline-block size-4"
              aria-label="Payment method filled"
            />
          </Tooltip>
        )}

        {daysRemaining != null && (
          <div
            className={clsx(
              "text-xs",
              isEndingUnpaid ? "text-warning-low" : "text-low",
            )}
          >
            {daysRemaining}d left
          </div>
        )}
      </div>
    );
  }

  // A failed payment is the one state that has to be caught at a glance. The
  // team is still on a paid plan and still building, so nothing else on the row
  // looks wrong — only the money stopped arriving. Printed in the default color
  // like every other status, it disappears into the list.
  if (subscriptionStatus === AccountSubscriptionStatus.PastDue) {
    return (
      <Tooltip content="Payment failed. The subscription is still running while Stripe retries the charge.">
        <span className="text-danger-low inline-flex items-center gap-1 font-medium whitespace-nowrap">
          <TriangleAlertIcon className="size-4 shrink-0" />
          past due
        </span>
      </Tooltip>
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
 * Whether the team ever got a check build. Building repeatedly without ever
 * producing one is a failure, not a blank: something is misconfigured and no
 * diff will ever come out of it. Having built nothing yet is just silence.
 */
function getCheckBuildState(staff: PipelineTeam["staff"]): {
  Icon: LucideIcon;
  className: string;
  label: string;
  hint?: string;
} {
  if (staff.firstComparisonAt) {
    return {
      Icon: CheckIcon,
      className: "text-success-low",
      label: "Check build",
    };
  }

  if (staff.buildsCount > 0) {
    return {
      Icon: XIcon,
      className: "text-danger-low",
      label: "No check build",
      hint: `${staff.buildsCount} builds, none compared to a baseline`,
    };
  }

  return { Icon: MinusIcon, className: "text-low", label: "No check build" };
}

function CheckBuildCell(props: { team: PipelineTeam }) {
  const { Icon, className, label, hint } = getCheckBuildState(props.team.staff);
  const icon = (
    <Icon className={clsx("size-4", className)} aria-label={label} />
  );

  return (
    <div className="flex justify-center">
      {hint ? <Tooltip content={hint}>{icon}</Tooltip> : icon}
    </div>
  );
}

/**
 * Screenshots uploaded, with the Storybook share of them underneath.
 *
 * The share is what explains an overage that looks too cheap for its volume:
 * Storybook screenshots bill at their own, lower rate. It is a property of the
 * mix rather than a slice of the number above it — the total counts build
 * stats, the share is measured on the buckets that billing actually reads — so
 * it is shown as a percentage, which invites no subtraction.
 *
 * Silent below one percent: a team with a handful of Storybook screenshots is
 * not a Storybook team, and rounding it to `0%` would say the opposite of what
 * a blank line says.
 */
function ScreenshotsCell(props: { team: PipelineTeam }) {
  const { team } = props;
  const { periodUsage } = team.staff;
  const ratio = periodUsage?.storybookRatio ?? null;

  return (
    <div className="inline-block text-right">
      <div className="text-low">
        {team.staff.screenshotsCount.toLocaleString()}
      </div>
      {ratio !== null && ratio >= 0.01 ? (
        <Tooltip
          content={`${periodUsage?.storybookScreenshotsCount.toLocaleString()} Storybook screenshots since signup. Storybook bills at its own, lower rate, which is why a large volume can still cost little.`}
        >
          <div className="text-low text-xs">
            {Math.round(ratio * 100)}% Storybook
          </div>
        </Tooltip>
      ) : null}
    </div>
  );
}

function EstimatedPriceCell(props: { team: PipelineTeam }) {
  const price = getEstimatedPrice(props.team);

  if (price === null) {
    return <span className="text-low">—</span>;
  }

  return (
    <Tooltip content="Flat Pro plan, plus the overage accrued this period once billing has started. A running trial owes the flat price only: trial usage is never billed.">
      <span className="font-medium">{PRICE_FORMAT.format(price)}</span>
    </Tooltip>
  );
}

/**
 * Opens a drafted email in the staff member's own mail client, and records that
 * the team was reached out to.
 *
 * The mark is set on click rather than on send — the browser cannot know
 * whether the draft was actually sent — so it stays a toggle: clicking the
 * marker again clears it if the draft was abandoned.
 */
function ContactCell(props: { team: PipelineTeam }) {
  const { team } = props;
  const [setContact, { loading }] = useMutation(SetTeamStaffContactMutation);
  const { subject, body } = getOutreachEmail({
    owners: team.staff.owners,
    buildsCount: team.staff.buildsCount,
    hasCheckBuild: Boolean(team.staff.firstComparisonAt),
    isLost: checkIsLost(team),
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
      <LinkButton
        href={mailtoUrl || undefined}
        variant="secondary"
        size="small"
        iconOnly
        aria-label="Draft outreach email"
        onPress={() => {
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
          aria-label="Outreach email sent"
          isSelected={Boolean(contactedAt)}
          isDisabled={loading}
          onChange={markContacted}
        />
      </span>
    </div>
  );
}

/**
 * Jumps straight to the customer in Stripe.
 *
 * Nothing is rendered without a customer id: a team that never reached checkout
 * has no Stripe page, and a link to `/customers/null` would only look broken.
 */
function StripeCustomerLink(props: { stripeCustomerId: string | null }) {
  const { stripeCustomerId } = props;

  if (!stripeCustomerId) {
    return null;
  }

  return (
    <Tooltip content="Open customer in Stripe">
      <HeadlessLink
        href={getStripeCustomerURL(stripeCustomerId)}
        target="_blank"
        // The generic external arrow would compete with the logo that already
        // says "this leaves Argos for Stripe".
        external={false}
        aria-label="Open customer in Stripe"
        // Pushed to the cell edge: next to the name the tile reads as a tag on
        // the team rather than as a way out to Stripe, and following a
        // variable-width name it lands somewhere different on every row. The
        // logo carries its own brand color, so hover dims the whole tile rather
        // than re-tinting it the way a monochrome icon would.
        className="ml-auto shrink-0 opacity-75 transition hover:opacity-100"
      >
        <img src={stripeLogo} alt="" className="size-4 rounded-xs" />
      </HeadlessLink>
    </Tooltip>
  );
}

const SIGNUP_SOURCE_LABELS: Record<SignupSource, string> = {
  [SignupSource.SearchEngine]: "search engine",
  [SignupSource.AiAssistant]: "AI assistant",
  [SignupSource.SocialMedia]: "social media",
  [SignupSource.Github]: "GitHub",
  [SignupSource.WordOfMouth]: "word of mouth",
  [SignupSource.Other]: "other",
};

/**
 * How the owners said they found Argos, on one line under the team name.
 *
 * Deduplicated and joined rather than listed per owner: co-owners nearly always
 * answer the same thing, and this is a hint next to the name, not a column.
 * Owners who skipped the question contribute nothing — a blank line reads
 * better here than "unknown".
 */
function FoundViaLine(props: { owners: PipelineTeam["staff"]["owners"] }) {
  const answers = [
    ...new Set(
      props.owners.flatMap((owner) => {
        const { signupSource } = owner;
        if (!signupSource) {
          return [];
        }
        // The free-text answer is the whole point of `other`, so it wins over
        // the label whenever it was filled in.
        if (signupSource === SignupSource.Other) {
          return [
            owner.signupSourceDetail?.trim() ||
              SIGNUP_SOURCE_LABELS[signupSource],
          ];
        }
        return [SIGNUP_SOURCE_LABELS[signupSource]];
      }),
    ),
  ];

  if (answers.length === 0) {
    return null;
  }

  return (
    <div className="text-low truncate text-xs">
      Found via {answers.join(", ")}
    </div>
  );
}

function PipelineRow(props: { team: PipelineTeam; index: number }) {
  const { team, index } = props;
  const teamURL = getAccountURL({ accountSlug: team.slug });

  return (
    <tr className={clsx("border-b", index % 2 === 0 ? "bg-app" : "bg-subtle")}>
      <td className="p-2 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          <AccountAvatar avatar={team.avatar} className="size-8 shrink-0" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={teamURL} className="truncate font-medium">
                {team.name || team.slug}
              </Link>
              <StripeCustomerLink stripeCustomerId={team.stripeCustomerId} />
            </div>
            <FoundViaLine owners={team.staff.owners} />
          </div>
        </div>
      </td>
      <td className="truncate p-2 text-sm">
        <Time date={team.createdAt} />
      </td>
      <td className="truncate p-2 text-sm">
        {team.lastBuildDate && <Time date={team.lastBuildDate} />}
      </td>
      <td className="p-2 text-sm">
        <StatusCell team={team} />
      </td>
      <td className="text-low p-2 text-right text-sm tabular-nums">
        {team.staff.buildsCount.toLocaleString()}
      </td>
      <td className="p-2 text-right">
        <CheckBuildCell team={team} />
      </td>
      <td className="p-2 text-right text-sm tabular-nums">
        <ScreenshotsCell team={team} />
      </td>
      <td className="p-2 text-right text-sm tabular-nums">
        <EstimatedPriceCell team={team} />
      </td>
      <td className="p-2">
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
 * a relative time, so their natural width follows how long ago it was — every
 * column after them would shift as rows age.
 *
 * They add up to 100 on purpose. `table-fixed` splits whatever the table is
 * wide between them, so a total under 100 does not shrink the table, it only
 * hands the remainder back out — which makes the numbers read as if they were
 * doing something they are not. The table's real width is its `min-w`.
 *
 * `status` gets the widest slice of the narrow ones: it is the only cell with
 * `whitespace-nowrap` text, so it overflows rather than wraps when squeezed.
 */
const COLUMNS: {
  key: SortKey;
  label: string;
  align: keyof typeof ALIGN_CLASS_NAMES;
  width: string;
}[] = [
  { key: "team", label: "Team", align: "left", width: "w-[25%]" },
  { key: "createdAt", label: "Created", align: "left", width: "w-[9%]" },
  {
    key: "lastActivity",
    label: "Last activity",
    align: "left",
    width: "w-[9%]",
  },
  { key: "status", label: "Status", align: "left", width: "w-[12%]" },
  { key: "builds", label: "Builds", align: "right", width: "w-[7%]" },
  {
    key: "checkBuild",
    label: "Check build",
    align: "center",
    width: "w-[6%]",
  },
  {
    key: "screenshots",
    label: "Screenshots",
    align: "right",
    width: "w-[11%]",
  },
  {
    key: "estimatedPrice",
    label: "Est. price",
    align: "right",
    width: "w-[10%]",
  },
  { key: "contacted", label: "Contacted", align: "center", width: "w-[11%]" },
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

/**
 * Within this window every team starts on a trial, so an active subscription
 * means the trial converted. A payment method counts too: it is the commitment,
 * and the subscription bills itself when the trial ends — waiting for that to
 * happen would only park the team in the undecided pile in the meantime.
 */
function checkIsConverted(team: PipelineTeam) {
  return (
    team.subscriptionStatus === AccountSubscriptionStatus.Active ||
    team.subscriptionStatus ===
      AccountSubscriptionStatus.TrialingWithPaymentMethod
  );
}

function formatShare(value: number, total: number) {
  if (total === 0) {
    return "—";
  }
  return `${Math.round((value / total) * 100)}% of ${total}`;
}

/**
 * The denominator of both rates, glossed because the rule that fills it is not
 * visible anywhere else: a payment method counts as converted right away, so a
 * trial can be decided while its status column still reads `trialing`.
 */
function DecidedTrialsHint() {
  return (
    <Tooltip content="Converted or lost. A payment method counts as converted, even mid-trial.">
      <span className="underline decoration-dotted underline-offset-2">
        decided trials
      </span>
    </Tooltip>
  );
}

/**
 * What the window is worth per month: the Est. price column, added up.
 *
 * Deliberately nothing more than that sum — no separate notion of who counts.
 * The rule for who owes what lives in `getEstimatedPrice` alone, so the tile
 * and the column cannot drift into disagreeing, and the tile stays a figure a
 * reader can check by adding up what is on screen.
 *
 * The overage half is usage to date rather than a settled month, so the total
 * is a floor: it can only be revised upwards as the periods close.
 */
function getEstimatedMrr(teams: PipelineTeam[]): {
  total: number;
  billedTeams: number;
} {
  return teams.reduce(
    (acc, team) => {
      const price = getEstimatedPrice(team);
      if (price === null) {
        return acc;
      }
      // Rounded per team, exactly as each cell rounds itself. Summing the exact
      // amounts and rounding once at the end would be marginally more accurate
      // and would break the promise above: three teams at $100.50 would print
      // $101 three times over a total of $302.
      return {
        total: acc.total + Math.round(price),
        billedTeams: acc.billedTeams + 1,
      };
    },
    { total: 0, billedTeams: 0 },
  );
}

function PipelineSummary(props: { teams: PipelineTeam[] }) {
  const { teams } = props;
  const activated = teams.filter((team) => team.staff.firstComparisonAt).length;
  const lost = teams.filter(checkIsLost).length;
  const converted = teams.filter(checkIsConverted).length;
  const estimatedMrr = getEstimatedMrr(teams);

  // Teams whose outcome is still open would drag both rates down for no reason
  // other than being recent — the rates only mean something over decided
  // trials.
  const decided = converted + lost;

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatTile
        data-visual-test="transparent"
        icon={UsersIcon}
        color="primary"
        label="New teams"
        value={teams.length}
        // Not "still trialing": a trial with a payment method is still running
        // yet already decided, so that wording would contradict the status
        // column.
        hint={`${teams.length - decided} undecided`}
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
        hint={
          <>
            {formatShare(converted, decided)} <DecidedTrialsHint />
          </>
        }
      />
      <StatTile
        data-visual-test="transparent"
        icon={CircleXIcon}
        color="warning"
        label="Canceled or expired"
        value={lost}
        hint={
          <>
            {formatShare(lost, decided)} <DecidedTrialsHint />
          </>
        }
      />
      <StatTile
        data-visual-test="transparent"
        icon={CircleDollarSignIcon}
        color="success"
        label="Est. MRR"
        value={estimatedMrr.total}
        format="currency"
        hint={
          <Tooltip content="The Est. price column added up. Active teams count their overage, running trials count the flat price only, and everything else counts nothing. Periods are still open, so this is a floor.">
            <span className="underline decoration-dotted underline-offset-2">
              from {estimatedMrr.billedTeams} billed
            </span>
          </Tooltip>
        }
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
