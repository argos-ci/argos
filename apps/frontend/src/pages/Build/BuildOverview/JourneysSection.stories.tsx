import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { BuildType } from "@/gql/graphql";

import { EvaluationStatus } from "../EvaluationStatus";
import {
  checkoutDesktop,
  checkoutMobile,
  DESKTOP,
  getChangedDiffIds,
  JOURNEYS,
  journeyFixture,
  signupDesktop,
} from "../journey-testing";
import { getJourneyAnchor, JourneysSectionView } from "./JourneysSection";

type Props = ComponentProps<typeof JourneysSectionView>;
type Build = Props["build"];
type Journey = Build["journeys"][number];

function build(journeys: Journey[], overrides?: Partial<Build>): Build {
  return {
    __typename: "Build",
    branch: "feat/apple-pay",
    type: BuildType.Check,
    mergeQueue: false,
    journeys,
    ...overrides,
  };
}

/** The viewer's marks: `ids` marked `status`. */
function marks(ids: string[], status: EvaluationStatus) {
  return Object.fromEntries(ids.map((id) => [id, status]));
}

const page: Props["page"] = {
  params: { accountSlug: "acme", projectName: "shop", buildNumber: 42 },
  statuses: {},
};

const meta = {
  title: "Pages/Build/JourneysSection",
  component: JourneysSectionView,
  args: {
    build: build(JOURNEYS),
    repoUrl: "https://github.com/acme/shop",
    page,
    hash: "",
  },
  render: (args) => (
    <div className="flex max-w-3xl flex-col gap-10 p-6">
      <JourneysSectionView {...args} />
    </div>
  ),
} satisfies Meta<typeof JourneysSectionView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Journeys to review, by file, the unchanged one folded below. */
export const Changed: Story = {};

/** One changed screen of the desktop checkout marked: the run counts it. */
export const PartlyReviewed: Story = {
  args: {
    page: {
      ...page,
      statuses: marks(
        getChangedDiffIds([checkoutDesktop]).slice(0, 1),
        EvaluationStatus.Accepted,
      ),
    },
  },
};

/** Every changed screen accepted. */
export const Accepted: Story = {
  args: {
    page: {
      ...page,
      statuses: marks(getChangedDiffIds(JOURNEYS), EvaluationStatus.Accepted),
    },
  },
};

/** A rejected screen marks its run and its test as rejected. */
export const Rejected: Story = {
  args: {
    page: {
      ...page,
      statuses: {
        ...marks(getChangedDiffIds(JOURNEYS), EvaluationStatus.Accepted),
        ...marks(
          getChangedDiffIds([checkoutMobile]),
          EvaluationStatus.Rejected,
        ),
      },
    },
  },
};

/** A build of an auto-approved branch: nothing waits for a review. */
export const AutoApproved: Story = {
  args: { build: build(JOURNEYS, { type: BuildType.Reference }) },
};

/** A merge queue build: changed, but not reviewed in it. */
export const MergeQueue: Story = {
  args: { build: build(JOURNEYS, { mergeQueue: true }) },
};

/** Nothing changed: the journeys stay folded, nothing to review. */
export const UnchangedOnly: Story = {
  args: { build: build([signupDesktop]) },
};

/** Back from walking an unchanged journey, its section is open on it. */
export const UnchangedOpen: Story = {
  args: { hash: `#${getJourneyAnchor(signupDesktop.id)}` },
};

const longJourney = journeyFixture({
  id: "c0ffee05",
  file: "features/accounts/organizations/billing-and-invoices.spec.ts",
  describe: ["organization owners", "with a yearly plan"],
  title:
    "downloads every invoice of the past year from the billing page and checks their totals",
  viewport: DESKTOP,
  screens: [
    "billing/index*",
    "billing/plan",
    "invoices/index*",
    "invoices/2026-01*",
    "invoices/2026-02*",
    "invoices/2026-03*",
    "invoices/2026-04*",
    "invoices/2026-05*",
    "invoices/2026-06*",
  ],
});

/**
 * A long path and title wrap; screens sharing the last part of their name
 * show their folder, and the changed screens past six are counted.
 */
export const LongNames: Story = {
  args: { build: build([longJourney]) },
};
