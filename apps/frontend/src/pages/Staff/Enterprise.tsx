import { useDeferredValue, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { diffInCalendarDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { MailIcon, SearchIcon } from "lucide-react";
import { Helmet } from "react-helmet";

import { AuthGuard } from "@/containers/AuthGuard";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import { Currency, PlanInterval } from "@/gql/graphql";
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
import { PageLoader } from "@/ui/PageLoader";
import { Progress } from "@/ui/Progress";
import { SortHeader, type SortDirection } from "@/ui/SortHeader";
import { Switch } from "@/ui/Switch";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";
import { compactNumberFormatter } from "@/util/intl";

import { getEnterpriseOfferEmail, getRenewalEmail } from "./Enterprise.email";
import { StaffAccessRestricted } from "./StaffAccessRestricted";
import { StaffTeamCell } from "./StaffTeamCell";
import { getMailtoUrl } from "./Trials.email";

const EnterpriseQuery = graphql(`
  query StaffEnterprise_staffEnterprise {
    staffEnterprise {
      candidates {
        id
        currency
        currentPeriodAmount
        previousPeriodAmount
        staffContactedAt
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
      trials {
        id
        includedScreenshots
        periodStart
        periodEnd
        periodScreenshots
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
        }
      }
      contracts {
        id
        currency
        amount
        includedScreenshots
        periodStart
        periodEnd
        periodScreenshots
        previousPeriodAmount
        renewalEmailedAt
        plan {
          id
          interval
        }
        team {
          id
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
  }
`);

const LogRenewalEmailMutation = graphql(`
  mutation StaffEnterprise_logStaffEnterpriseRenewalEmail(
    $subscriptionId: ID!
  ) {
    logStaffEnterpriseRenewalEmail(input: { subscriptionId: $subscriptionId }) {
      id
      renewalEmailedAt
    }
  }
`);

const SetStaffEnterpriseOfferContactMutation = graphql(`
  mutation StaffEnterprise_setStaffEnterpriseOfferContact(
    $subscriptionId: ID!
    $contacted: Boolean!
  ) {
    setStaffEnterpriseOfferContact(
      input: { subscriptionId: $subscriptionId, contacted: $contacted }
    ) {
      id
      staffContactedAt
    }
  }
`);

type EnterpriseData = DocumentType<typeof EnterpriseQuery>["staffEnterprise"];
type CandidateNode = EnterpriseData["candidates"][number];
type Contract = EnterpriseData["contracts"][number];
type Trial = EnterpriseData["trials"][number];

/**
 * A candidate with its team's staff block resolved.
 *
 * `Team.staff` is nullable because non-staff must not read it, but the query
 * behind this page refuses non-staff outright, like the cancellations one.
 */
type Candidate = CandidateNode & {
  team: CandidateNode["team"] & {
    staff: NonNullable<CandidateNode["team"]["staff"]>;
  };
};

function checkHasStaffData(candidate: CandidateNode): candidate is Candidate {
  return candidate.team.staff !== null;
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

function checkMatchesSearch(
  team: { name: string | null; slug: string },
  search: string,
) {
  if (!search) {
    return true;
  }

  const haystack = [team.name, team.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

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

function SectionHeader(props: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-semibold">{props.title}</h2>
      <p className="text-low text-sm">{props.description}</p>
    </div>
  );
}

function EmptyTable(props: { children: React.ReactNode }) {
  return (
    <div className="text-low rounded-sm border p-8 text-center text-sm">
      {props.children}
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
 * Pro subscription the offer is made on.
 */
function ContactCell(props: { candidate: Candidate }) {
  const { candidate } = props;
  const [setContact, { loading }] = useMutation(
    SetStaffEnterpriseOfferContactMutation,
  );
  const { owners } = candidate.team.staff;
  const { subject, body } = getEnterpriseOfferEmail({
    owners,
    teamName: candidate.team.name || candidate.team.slug,
  });
  const mailtoUrl = getMailtoUrl({ owners, subject, body });
  const contactedAt = candidate.staffContactedAt ?? null;

  const markContacted = (contacted: boolean) => {
    // Caught so a failed mark never breaks the draft that just opened, and
    // toasted so it cannot pass for a switch that simply refused to move.
    setContact({
      variables: { subscriptionId: candidate.id, contacted },
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
          disabled={loading}
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

function CandidatesTable(props: { candidates: Candidate[] }) {
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

  if (candidates.length === 0) {
    return (
      <EmptyTable>
        No team on Pro is billed $1,500 or more this period or the last one.
      </EmptyTable>
    );
  }

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
                  amount={candidate.currentPeriodAmount ?? null}
                  currency={candidate.currency}
                  tooltip="The plan, its add-ons and the overage counted so far, before tax."
                />
              </td>
              <td className="p-2 text-right text-sm tabular-nums">
                <Amount
                  amount={candidate.previousPeriodAmount ?? null}
                  currency={candidate.currency}
                  tooltip="Its invoice before tax, or an estimate when Argos does not hold the invoice."
                />
              </td>
              <td className="p-2">
                <ContactCell candidate={candidate} />
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
    includedScreenshots?: number | null;
    periodScreenshots?: number | null;
    periodStart?: string | null;
    periodEnd?: string | null;
  };
}) {
  const { includedScreenshots, periodScreenshots, periodStart, periodEnd } =
    props.usage;

  if (periodScreenshots === null || periodScreenshots === undefined) {
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
  const projected = elapsed > 0 ? periodScreenshots / elapsed : null;
  const projectedShare =
    projected === null ? null : projected / includedScreenshots;

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

/**
 * When the contract renews, with a drafted email to the owners to open the
 * renegotiation before the term ends. Opening the draft records the email, so
 * the cell says when the team was last written to about this renewal.
 */
function RenewalCell(props: { contract: Contract }) {
  const { id, periodEnd, renewalEmailedAt, team } = props.contract;
  const client = useApolloClient();

  if (!periodEnd) {
    return <span className="text-low">-</span>;
  }

  const days = diffInCalendarDays(new Date(periodEnd), new Date());
  // The query behind this page refuses non-staff, so the block is resolved.
  invariant(team.staff, "staff data is resolved on the staff page");
  const { owners } = team.staff;
  const { subject, body } = getRenewalEmail({
    owners,
    teamName: team.name || team.slug,
    renewsOn: new Date(periodEnd),
  });

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="font-medium">
          <Time date={periodEnd} format="longDate" />
        </div>
        <div
          data-visual-test="transparent"
          className={clsx(
            "text-xs",
            days <= RENEWAL_SOON_DAYS ? "text-warning-low" : "text-low",
          )}
        >
          in {days} days
        </div>
        {renewalEmailedAt ? (
          <div className="text-low text-xs">
            Emailed <Time date={renewalEmailedAt} format="monthDay" />
          </div>
        ) : null}
      </div>
      <LinkButton
        href={getMailtoUrl({ owners, subject, body }) || undefined}
        variant="secondary"
        size="small"
        iconOnly
        aria-label="Draft renewal email"
        onClick={() => {
          // Caught so a failed record never breaks the draft that just opened.
          client
            .mutate({
              mutation: LogRenewalEmailMutation,
              variables: { subscriptionId: id },
            })
            .catch((error: unknown) => {
              toast.error(getErrorMessage(error));
            });
        }}
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
        amount={contract.amount ?? null}
        currency={contract.currency}
        tooltip="The contract's price per billing period, before tax, as Stripe states it."
      />
      {contract.amount !== null && contract.amount !== undefined ? (
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

function TrialsTable(props: { trials: Trial[] }) {
  if (props.trials.length === 0) {
    return <EmptyTable>No team on the Enterprise trial plan.</EmptyTable>;
  }

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

function MonthlyContractsTable(props: { contracts: Contract[] }) {
  if (props.contracts.length === 0) {
    return <EmptyTable>No team on a monthly Enterprise plan.</EmptyTable>;
  }

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
                  amount={contract.previousPeriodAmount ?? null}
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

function AnnualContractsTable(props: { contracts: Contract[] }) {
  if (props.contracts.length === 0) {
    return <EmptyTable>No team on a yearly Enterprise plan.</EmptyTable>;
  }

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
                <RenewalCell contract={contract} />
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

/** The contract renewing next comes first: it is the one to renegotiate. */
function compareRenewals(left: Contract, right: Contract) {
  const leftEnd = left.periodEnd
    ? new Date(left.periodEnd).getTime()
    : Infinity;
  const rightEnd = right.periodEnd
    ? new Date(right.periodEnd).getTime()
    : Infinity;
  return leftEnd - rightEnd;
}

function compareAmounts(left: Contract, right: Contract) {
  return (right.amount ?? -1) - (left.amount ?? -1);
}

function StaffEnterpriseList() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data, loading, error } = useQuery(EnterpriseQuery);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const { candidates, trials, monthly, annual } = useMemo(() => {
    const enterprise = data?.staffEnterprise;
    const contracts = (enterprise?.contracts ?? []).filter((contract) =>
      checkMatchesSearch(contract.team, normalizedSearch),
    );
    return {
      candidates: (enterprise?.candidates ?? [])
        .filter(checkHasStaffData)
        .filter((candidate) =>
          checkMatchesSearch(candidate.team, normalizedSearch),
        ),
      trials: (enterprise?.trials ?? [])
        .filter((trial) => checkMatchesSearch(trial.team, normalizedSearch))
        .sort(
          (left, right) => right.periodScreenshots - left.periodScreenshots,
        ),
      monthly: contracts
        .filter((contract) => contract.plan.interval === PlanInterval.Month)
        .sort(compareAmounts),
      annual: contracts
        .filter((contract) => contract.plan.interval === PlanInterval.Year)
        .sort(compareRenewals),
    };
  }, [data?.staffEnterprise, normalizedSearch]);

  if (error) {
    const isForbidden =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((error) => error.extensions?.code === "FORBIDDEN");

    if (isForbidden) {
      return <StaffAccessRestricted />;
    }

    throw error;
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Enterprise</Heading>
          <PageHeaderHeadline>
            The Pro teams to offer Enterprise to, the teams trying it, and the
            teams on an Enterprise plan.
          </PageHeaderHeadline>
        </PageHeaderContent>
        <PageHeaderActions className="items-center">
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
        <div className="flex flex-col gap-10">
          <section>
            <SectionHeader
              title="Candidates"
              description="Pro teams billed $1,500 or more this period or the last one: their Billing page offers Enterprise."
            />
            <CandidatesTable candidates={candidates} />
          </section>
          <section>
            <SectionHeader
              title="Enterprise trials"
              description="Teams granted the Enterprise trial plan. The bar is this month's quota used, the mark how far into the month they are."
            />
            <TrialsTable trials={trials} />
          </section>
          <section>
            <SectionHeader
              title="Monthly contracts"
              description="The bar is this month's quota used, the mark how far into the month they are."
            />
            <MonthlyContractsTable contracts={monthly} />
          </section>
          <section>
            <SectionHeader
              title="Annual contracts"
              description="Next renewal first. The bar is the yearly commitment used, the mark how far into the term they are."
            />
            <AnnualContractsTable contracts={annual} />
          </section>
        </div>
      )}
    </PageContainer>
  );
}

export function Component() {
  return (
    <Page>
      <Helmet>
        <title>Enterprise</title>
      </Helmet>
      <AuthGuard>{() => <StaffEnterpriseList />}</AuthGuard>
    </Page>
  );
}
