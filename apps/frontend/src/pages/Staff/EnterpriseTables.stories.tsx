import type { Meta, StoryObj } from "@storybook/react-vite";

import { Currency, PlanInterval } from "@/gql/graphql";

import {
  AnnualContractsTable,
  CandidatesTable,
  MonthlyContractsTable,
  TrialsTable,
  type Candidate,
  type Contract,
  type Trial,
} from "./EnterpriseTables";

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY).toISOString();
}

function avatar(initial: string, color: string) {
  return { __typename: "AccountAvatar" as const, url: null, color, initial };
}

const owner = {
  __typename: "TeamStaffOwner" as const,
  id: "1",
  name: "Jane Cooper",
  email: "jane@example.com",
};

/** An owner who signed up without an email address: no draft can open. */
const ownerWithoutEmail = { ...owner, id: "2", email: null };

function team(input: {
  id: string;
  name: string;
  color: string;
  owners?: (typeof owner | typeof ownerWithoutEmail)[];
}) {
  return {
    __typename: "Team" as const,
    id: input.id,
    createdAt: daysFromNow(-120),
    slug: input.name.toLowerCase(),
    name: input.name,
    stripeCustomerId: `cus_${input.id}`,
    lastBuildDate: daysFromNow(-1),
    avatar: avatar(input.name.charAt(0), input.color),
    staff: {
      __typename: "TeamStaffInfo" as const,
      owners: input.owners ?? [owner],
    },
  };
}

const candidates = [
  {
    __typename: "StaffEnterpriseOffer",
    id: "1",
    currency: Currency.Usd,
    currentPeriodAmount: 1500,
    previousPeriodAmount: 100,
    staffContactedAt: null,
    team: team({ id: "1", name: "Acme", color: "#7c3aed" }),
  },
  {
    __typename: "StaffEnterpriseOffer",
    id: "2",
    currency: Currency.Usd,
    currentPeriodAmount: 100,
    previousPeriodAmount: 2200,
    staffContactedAt: daysFromNow(-3),
    team: team({ id: "2", name: "Globex", color: "#0891b2" }),
  },
  {
    __typename: "StaffEnterpriseOffer",
    id: "3",
    currency: Currency.Eur,
    currentPeriodAmount: 1340,
    previousPeriodAmount: 1610,
    staffContactedAt: null,
    team: team({
      id: "3",
      name: "Initech",
      color: "#ea580c",
      owners: [ownerWithoutEmail],
    }),
  },
] satisfies Candidate[];

function trial(input: {
  id: string;
  name: string;
  color: string;
  daysIntoMonth: number;
  screenshots: number;
}): Trial {
  const { staff: _staff, ...trialTeam } = team(input);
  return {
    __typename: "StaffEnterpriseTrial",
    id: input.id,
    includedScreenshots: 300_000,
    periodStart: daysFromNow(-input.daysIntoMonth),
    periodEnd: daysFromNow(30 - input.daysIntoMonth),
    periodScreenshots: input.screenshots,
    team: trialTeam,
  };
}

const trials = [
  trial({
    id: "4",
    name: "Gekko",
    color: "#be123c",
    daysIntoMonth: 18,
    screenshots: 45_000,
  }),
  // Too early in the month to project anything.
  trial({
    id: "5",
    name: "Hooli",
    color: "#15803d",
    daysIntoMonth: 1,
    screenshots: 12_000,
  }),
  trial({
    id: "6",
    name: "Wayne",
    color: "#4338ca",
    daysIntoMonth: 10,
    screenshots: 0,
  }),
];

function contract(
  input: {
    id: string;
    name: string;
    color: string;
    interval: PlanInterval;
    owners?: (typeof owner | typeof ownerWithoutEmail)[];
  } & Partial<
    Pick<
      Contract,
      | "currency"
      | "amount"
      | "includedScreenshots"
      | "periodStart"
      | "periodEnd"
      | "endDate"
      | "periodScreenshots"
      | "previousPeriodAmount"
      | "renewalEmailedAt"
    >
  >,
): Contract {
  const { createdAt: _createdAt, ...contractTeam } = team(input);
  return {
    __typename: "StaffEnterpriseContract",
    id: input.id,
    currency: input.currency ?? Currency.Usd,
    amount: input.amount === undefined ? 900 : input.amount,
    includedScreenshots:
      input.includedScreenshots === undefined
        ? 35_000
        : input.includedScreenshots,
    periodStart: input.periodStart ?? daysFromNow(-10),
    periodEnd: input.periodEnd ?? daysFromNow(20),
    endDate: input.endDate ?? null,
    periodScreenshots:
      input.periodScreenshots === undefined ? 21_000 : input.periodScreenshots,
    previousPeriodAmount:
      input.previousPeriodAmount === undefined
        ? 900
        : input.previousPeriodAmount,
    renewalEmailedAt: input.renewalEmailedAt ?? null,
    plan: { __typename: "Plan", id: input.interval, interval: input.interval },
    team: contractTeam,
  };
}

const monthlyContracts = [
  contract({
    id: "7",
    name: "Wonka",
    color: "#a16207",
    interval: PlanInterval.Month,
  }),
  // Past its quota, billed in euros.
  contract({
    id: "8",
    name: "Tyrell",
    color: "#0f766e",
    interval: PlanInterval.Month,
    currency: Currency.Eur,
    amount: 1200,
    periodScreenshots: 52_000,
    previousPeriodAmount: 1480,
  }),
  // An amount Stripe has not stated, on a plan with no quota.
  contract({
    id: "9",
    name: "Vandelay",
    color: "#6d28d9",
    interval: PlanInterval.Month,
    amount: null,
    includedScreenshots: null,
    previousPeriodAmount: null,
  }),
];

const year = {
  interval: PlanInterval.Year,
  amount: 10_800,
  includedScreenshots: 3_600_000,
};

const annualContracts = [
  // Renews within 90 days, already written to.
  contract({
    id: "10",
    name: "Umbrella",
    color: "#b91c1c",
    ...year,
    periodStart: daysFromNow(-325),
    periodEnd: daysFromNow(40),
    periodScreenshots: 2_900_000,
    renewalEmailedAt: daysFromNow(-2),
  }),
  contract({
    id: "11",
    name: "Oscorp",
    color: "#047857",
    ...year,
    periodStart: daysFromNow(-100),
    periodEnd: daysFromNow(265),
    periodScreenshots: 1_400_000,
  }),
  // Set to end at the end of its term: it does not renew.
  contract({
    id: "12",
    name: "Cyberdyne",
    color: "#1d4ed8",
    ...year,
    periodStart: daysFromNow(-305),
    periodEnd: daysFromNow(60),
    endDate: daysFromNow(60),
    periodScreenshots: 900_000,
  }),
  // No owner with an email: the renewal email cannot be drafted.
  contract({
    id: "13",
    name: "Stark",
    color: "#c2410c",
    ...year,
    periodStart: daysFromNow(-200),
    periodEnd: daysFromNow(165),
    periodScreenshots: 2_000_000,
    owners: [ownerWithoutEmail],
  }),
];

const meta = {
  title: "Pages/Staff/EnterpriseTables",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function setContact() {}
function logRenewalEmail() {}

export const Candidates: Story = {
  render: () => (
    <CandidatesTable candidates={candidates} onContactChange={setContact} />
  ),
};

export const Trials: Story = {
  render: () => <TrialsTable trials={trials} />,
};

export const MonthlyContracts: Story = {
  render: () => <MonthlyContractsTable contracts={monthlyContracts} />,
};

export const AnnualContracts: Story = {
  render: () => (
    <AnnualContractsTable
      contracts={annualContracts}
      onRenewalEmail={logRenewalEmail}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <CandidatesTable candidates={[]} onContactChange={setContact} />
      <TrialsTable trials={[]} />
      <MonthlyContractsTable contracts={[]} />
      <AnnualContractsTable contracts={[]} onRenewalEmail={logRenewalEmail} />
    </div>
  ),
};
