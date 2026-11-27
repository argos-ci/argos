import { useMemo, useState } from "react";
import { diffInCalendarDays } from "@argos/util/date";
import clsx from "clsx";
import { MailIcon } from "lucide-react";

import {
  Currency,
  type StaffEnterprise_StaffEnterpriseQuery,
} from "@/gql/graphql";
import { LinkButton } from "@/ui/Button";
import { Progress } from "@/ui/Progress";
import { SortHeader, type SortDirection } from "@/ui/SortHeader";
import { Switch } from "@/ui/Switch";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";
import { compactNumberFormatter } from "@/util/intl";

import { getEnterpriseOfferEmail, getRenewalEmail } from "./Enterprise.email";
import { StaffTeamCell } from "./StaffTeamCell";
import { getMailtoUrl } from "./Trials.email";

type EnterpriseData = StaffEnterprise_StaffEnterpriseQuery["staffEnterprise"];

/**
 * With its team's staff block resolved.
 *
 * `Team.staff` is nullable because non-staff must not read it, but the query
 * behind this page refuses non-staff outright, like the cancellations one.
 */
type WithStaff<T extends { team: { staff: unknown } }> = T & {
  team: T["team"] & { staff: NonNullable<T["team"]["staff"]> };
};

export type Candidate = WithStaff<EnterpriseData["candidates"][number]>;
export type Contract = WithStaff<EnterpriseData["contracts"][number]>;
export type Trial = EnterpriseData["trials"][number];

export function checkHasStaffData<T extends { team: { staff: unknown } }>(
  item: T,
): item is WithStaff<T> {
  return item.team.staff !== null;
}

/**
 * Each amount in the currency its subscription bills in, written the same way
 * for both so a column reads as one.
 */
const PRICE_FORMATS: Record<Currency, Intl.NumberFormat> = {
  [Currency.Usd]: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }),
  [Currency.Eur]: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }),
};

/** A yearly contract renewing within this many days is shown as close. */
const RENEWAL_SOON_DAYS = 90;

/**
 * Share of a period that has to go by before its usage is projected to the
 * end: in its first hours, a little usage would read as many times the quota.
 */
const MIN_ELAPSED_FOR_PROJECTION = 0.1;

const NO_OWNER_EMAIL = "No owner of this team has an email address.";

function Amount(props: {
  amount: number | null;
  currency: Currency;
  tooltip: string;
}) {
  if (props.amount === null) {
    return <span className="text-low">-</span>;
  }

  return (
    <Tooltip content={props.tooltip}>
      <span className="font-medium">
        {PRICE_FORMATS[props.currency].format(props.amount)}
      </span>
    </Tooltip>
  );
}

/**
 * What the page shows in place of its sections when none has a team: an
 * empty section is left out rather than drawn.
 */
export function NoEnterpriseTeam(props: { search: string }) {
  return (
    <div className="text-low rounded-sm border p-8 text-center text-sm">
      {props.search
        ? `No team matches "${props.search}".`
        : "No team on Enterprise, and no Pro team billed $1,500 a period."}
    </div>
  );
}

const ALIGN_CLASS_NAMES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

type CandidateSortKey =
  | "team"
  | "createdAt"
  | "lastActivity"
  | "currentPeriod"
  | "previousPeriod"
  | "contacted";

function getCandidateSortValue(
  candidate: Candidate,
  key: CandidateSortKey,
): string | number {
  switch (key) {
    case "team":
      return (candidate.team.name || candidate.team.slug).toLowerCase();
    case "createdAt":
      return new Date(candidate.team.createdAt).getTime();
    case "lastActivity":
      return candidate.team.lastBuildDate
        ? new Date(candidate.team.lastBuildDate).getTime()
        : 0;
    case "currentPeriod":
      return candidate.currentPeriodAmount ?? -1;
    case "previousPeriod":
      return candidate.previousPeriodAmount ?? -1;
    case "contacted":
      return candidate.staffContactedAt ? 1 : 0;
  }
}

function sortCandidates(
  candidates: Candidate[],
  key: CandidateSortKey,
  direction: SortDirection,
): Candidate[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...candidates].sort((a, b) => {
    const left = getCandidateSortValue(a, key);
    const right = getCandidateSortValue(b, key);

    if (typeof left === "string" && typeof right === "string") {
      return left.localeCompare(right) * factor;
    }

    return ((left as number) - (right as number)) * factor;
  });
}

/**
 * Opens the drafted offer in the staff member's own mail client, and records
 * that the team was written to: the cancellations page's control, kept on the
 * Pro subscription the offer is made on. Without an owner email there is no
 * draft to open, so nothing is recorded either.
 */
function ContactCell(props: {
  candidate: Candidate;
  onContactChange: (
    candidate: Candidate,
    contacted: boolean,
  ) => Promise<unknown>;
}) {
  const { candidate, onContactChange } = props;
  const [pending, setPending] = useState(false);
  const { owners } = candidate.team.staff;
  const { subject, body } = getEnterpriseOfferEmail({
    owners,
    teamName: candidate.team.name || candidate.team.slug,
  });
  const mailtoUrl = getMailtoUrl({ owners, subject, body });
  const contactedAt = candidate.staffContactedAt;

  const markContacted = (contacted: boolean) => {
    setPending(true);
    // Caught so a failed mark never breaks the draft that just opened, and
    // toasted so it cannot pass for a switch that simply refused to move.
    onContactChange(candidate, contacted)
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error));
      })
      .finally(() => setPending(false));
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <LinkButton
        href={mailtoUrl ?? undefined}
        disabled={!mailtoUrl}
        title={mailtoUrl ? undefined : NO_OWNER_EMAIL}
        variant="secondary"
        size="small"
        iconOnly
        aria-label="Draft Enterprise offer email"
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
          aria-label="Enterprise offer email sent"
          checked={Boolean(contactedAt)}
          disabled={pending}
          onCheckedChange={markContacted}
        />
      </span>
    </div>
  );
}

/** Fixed widths adding up to 100, for the reasons the trial pipeline's give. */
const CANDIDATE_COLUMNS: {
  key: CandidateSortKey;
  label: string;
  align: keyof typeof ALIGN_CLASS_NAMES;
  width: string;
}[] = [
  { key: "team", label: "Team", align: "left", width: "w-[30%]" },
  { key: "createdAt", label: "Created", align: "left", width: "w-[12%]" },
  {
    key: "lastActivity",
    label: "Last activity",
    align: "left",
    width: "w-[12%]",
  },
  {
    key: "currentPeriod",
    label: "This period",
    align: "right",
    width: "w-[16%]",
  },
  {
    key: "previousPeriod",
    label: "Last period",
    align: "right",
    width: "w-[16%]",
  },
  { key: "contacted", label: "Contacted", align: "center", width: "w-[14%]" },
];

export function CandidatesTable(props: {
  candidates: Candidate[];
  onContactChange: (
    candidate: Candidate,
    contacted: boolean,
  ) => Promise<unknown>;
}) {
  const [sortKey, setSortKey] = useState<CandidateSortKey>("currentPeriod");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const candidates = useMemo(
    () => sortCandidates(props.candidates, sortKey, sortDirection),
    [props.candidates, sortKey, sortDirection],
  );

  const onSort = (key: CandidateSortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    // Names read best A→Z; everything else highest-first.
    setSortDirection(key === "team" ? "asc" : "desc");
  };

  return (
    <div className="relative overflow-x-auto rounded-sm border">
      <table className="w-full min-w-240 table-fixed border-collapse">
        <thead>
          <tr className="text-low border-b text-xs font-semibold">
            {CANDIDATE_COLUMNS.map((column) => (
              <SortHeader
                key={column.key}
                label={column.label}
                sortKey={column.key}
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className={clsx(column.width, ALIGN_CLASS_NAMES[column.align])}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate, index) => (
            <tr
              key={candidate.id}
              className={clsx(
                "border-b",
                index % 2 === 0 ? "bg-app" : "bg-subtle",
              )}
            >
              <td className="p-2 text-sm">
                <StaffTeamCell team={candidate.team} />
              </td>
              <td className="truncate p-2 text-sm">
                <Time date={candidate.team.createdAt} />
              </td>
              <td className="truncate p-2 text-sm">
                {candidate.team.lastBuildDate && (
                  <Time date={candidate.team.lastBuildDate} />
                )}
              </td>
              <td className="p-2 text-right text-sm tabular-nums">
                <Amount
                  amount={candidate.currentPeriodAmount}
                  currency={candidate.currency}
                  tooltip="The plan, its add-ons and the overage counted so far, before tax."
                />
              </td>
              <td className="p-2 text-right text-sm tabular-nums">
                <Amount
                  amount={candidate.previousPeriodAmount}
                  currency={candidate.currency}
                  tooltip="Its invoice before tax, or an estimate when Argos does not hold the invoice."
                />
              </td>
              <td className="p-2">
                <ContactCell
                  candidate={candidate}
                  onContactChange={props.onContactChange}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The screenshots a running period has used against its quota, with a mark at
 * how far into the period it is: a bar ahead of the mark is on course to go
 * over, one behind it to fall short.
 *
 * Everything that moves with the calendar (the mark, the projection) is hidden
 * from Argos captures, like a `Time`: the length of a month would change them
 * from one run to the next.
 */
function QuotaCell(props: {
  usage: {
    includedScreenshots: number | null;
    periodScreenshots: number | null;
    periodStart: string | null;
    periodEnd: string | null;
  };
}) {
  const { includedScreenshots, periodScreenshots, periodStart, periodEnd } =
    props.usage;

  if (periodScreenshots === null) {
    return <span className="text-low">-</span>;
  }

  const used = compactNumberFormatter.format(periodScreenshots);

  if (!includedScreenshots || !periodStart || !periodEnd) {
    return <span className="font-medium">{used}</span>;
  }

  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  const elapsed = Math.min(
    1,
    Math.max(0, (Date.now() - start) / (end - start)),
  );
  const projectedShare =
    elapsed >= MIN_ELAPSED_FOR_PROJECTION
      ? periodScreenshots / elapsed / includedScreenshots
      : null;

  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-2 text-sm">
        <span className="font-medium">
          {used} of {compactNumberFormatter.format(includedScreenshots)}
        </span>
        {projectedShare === null ? null : (
          <Tooltip content="What it comes to by the end of the period if usage carries on at this rate.">
            <span
              data-visual-test="transparent"
              className={clsx(
                "font-medium",
                projectedShare < 0.7
                  ? "text-warning-low"
                  : projectedShare > 1
                    ? "text-primary-low"
                    : "text-success-low",
              )}
            >
              On course for {Math.round(projectedShare * 100)}%
            </span>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        <Progress
          value={periodScreenshots}
          max={includedScreenshots}
          min={0}
          className="w-full"
        />
        <div
          data-visual-test="transparent"
          className="absolute -top-1 -bottom-1 w-0.5 bg-(--text-color-default)"
          style={{ left: `${elapsed * 100}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function DaysLeft(props: { date: string; className?: string }) {
  const days = diffInCalendarDays(new Date(props.date), new Date());
  return (
    <div
      data-visual-test="transparent"
      className={clsx(
        "text-xs",
        props.className ??
          (days <= RENEWAL_SOON_DAYS ? "text-warning-low" : "text-low"),
      )}
    >
      in {days} days
    </div>
  );
}

/**
 * When the contract renews, with a drafted email to the owners to open the
 * renegotiation before the term ends. Opening the draft records the email, so
 * the cell says when the team was last written to about this renewal.
 *
 * A contract set to end does not renew: the cell says when it ends instead,
 * and offers no renewal email, whose draft would say it renews.
 */
function RenewalCell(props: {
  contract: Contract;
  onRenewalEmail: (contract: Contract) => void;
}) {
  const { contract, onRenewalEmail } = props;
  const { endDate, periodEnd, renewalEmailedAt, team } = contract;

  if (endDate) {
    return (
      <div>
        <div className="text-danger-low font-medium">
          Ends <Time date={endDate} format="longDate" />
        </div>
        <DaysLeft date={endDate} className="text-danger-low" />
      </div>
    );
  }

  if (!periodEnd) {
    return <span className="text-low">-</span>;
  }

  const { owners } = team.staff;
  const { subject, body } = getRenewalEmail({
    owners,
    teamName: team.name || team.slug,
    renewsOn: new Date(periodEnd),
  });
  const mailtoUrl = getMailtoUrl({ owners, subject, body });

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="font-medium">
          <Time date={periodEnd} format="longDate" />
        </div>
        <DaysLeft date={periodEnd} />
        {renewalEmailedAt ? (
          <div className="text-low text-xs">
            Emailed <Time date={renewalEmailedAt} format="monthDay" />
          </div>
        ) : null}
      </div>
      <LinkButton
        href={mailtoUrl ?? undefined}
        disabled={!mailtoUrl}
        title={mailtoUrl ? undefined : NO_OWNER_EMAIL}
        variant="secondary"
        size="small"
        iconOnly
        aria-label="Draft renewal email"
        onClick={() => onRenewalEmail(contract)}
      >
        <MailIcon />
      </LinkButton>
    </div>
  );
}

function ContractAmount(props: { contract: Contract; per: string }) {
  const { contract } = props;
  return (
    <div>
      <Amount
        amount={contract.amount}
        currency={contract.currency}
        tooltip="The contract's price per billing period, before tax, as Stripe states it."
      />
      {contract.amount !== null ? (
        <span className="text-low"> / {props.per}</span>
      ) : null}
      {contract.includedScreenshots ? (
        <div className="text-low text-xs">
          {compactNumberFormatter.format(contract.includedScreenshots)}{" "}
          screenshots included
        </div>
      ) : null}
    </div>
  );
}

export function TrialsTable(props: { trials: Trial[] }) {
  return (
    <div className="relative overflow-x-auto rounded-sm border">
      <table className="w-full min-w-240 table-fixed border-collapse">
        <thead>
          <tr className="text-low border-b text-left text-xs font-semibold">
            <th className="w-[30%] p-2">Team</th>
            <th className="w-[16%] p-2">Created</th>
            <th className="w-[28%] p-2">Quota used this month</th>
            <th className="w-[26%] p-2">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {props.trials.map((trial, index) => (
            <tr
              key={trial.id}
              className={clsx(
                "border-b",
                index % 2 === 0 ? "bg-app" : "bg-subtle",
              )}
            >
              <td className="p-2 text-sm">
                <StaffTeamCell team={trial.team} />
              </td>
              <td className="truncate p-2 text-sm">
                <Time date={trial.team.createdAt} />
              </td>
              <td className="p-2">
                <QuotaCell usage={trial} />
              </td>
              <td className="truncate p-2 text-sm">
                {trial.team.lastBuildDate && (
                  <Time date={trial.team.lastBuildDate} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthlyContractsTable(props: { contracts: Contract[] }) {
  return (
    <div className="relative overflow-x-auto rounded-sm border">
      <table className="w-full min-w-240 table-fixed border-collapse">
        <thead>
          <tr className="text-low border-b text-left text-xs font-semibold">
            <th className="w-[30%] p-2">Team</th>
            <th className="w-[16%] p-2">Contract</th>
            <th className="w-[28%] p-2">Quota used this month</th>
            <th className="w-[13%] p-2 text-right">Last month</th>
            <th className="w-[13%] p-2">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {props.contracts.map((contract, index) => (
            <tr
              key={contract.id}
              className={clsx(
                "border-b",
                index % 2 === 0 ? "bg-app" : "bg-subtle",
              )}
            >
              <td className="p-2 text-sm">
                <StaffTeamCell team={contract.team} />
              </td>
              <td className="p-2 text-sm">
                <ContractAmount contract={contract} per="month" />
              </td>
              <td className="p-2">
                <QuotaCell usage={contract} />
              </td>
              <td className="p-2 text-right text-sm tabular-nums">
                <Amount
                  amount={contract.previousPeriodAmount}
                  currency={contract.currency}
                  tooltip="Its invoice before tax, or an estimate when Argos does not hold the invoice."
                />
              </td>
              <td className="truncate p-2 text-sm">
                {contract.team.lastBuildDate && (
                  <Time date={contract.team.lastBuildDate} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnnualContractsTable(props: {
  contracts: Contract[];
  onRenewalEmail: (contract: Contract) => void;
}) {
  return (
    <div className="relative overflow-x-auto rounded-sm border">
      <table className="w-full min-w-240 table-fixed border-collapse">
        <thead>
          <tr className="text-low border-b text-left text-xs font-semibold">
            <th className="w-[30%] p-2">Team</th>
            <th className="w-[16%] p-2">Contract</th>
            <th className="w-[28%] p-2">Commitment used</th>
            <th className="w-[16%] p-2">Renewal</th>
            <th className="w-[10%] p-2">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {props.contracts.map((contract, index) => (
            <tr
              key={contract.id}
              className={clsx(
                "border-b",
                index % 2 === 0 ? "bg-app" : "bg-subtle",
              )}
            >
              <td className="p-2 text-sm">
                <StaffTeamCell team={contract.team} />
              </td>
              <td className="p-2 text-sm">
                <ContractAmount contract={contract} per="year" />
              </td>
              <td className="p-2">
                <QuotaCell usage={contract} />
              </td>
              <td className="p-2 text-sm">
                <RenewalCell
                  contract={contract}
                  onRenewalEmail={props.onRenewalEmail}
                />
              </td>
              <td className="truncate p-2 text-sm">
                {contract.team.lastBuildDate && (
                  <Time date={contract.team.lastBuildDate} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
