import type { ComponentProps } from "react";
import { invariant } from "@argos/util/invariant";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";

import { openOverlayParameters } from "@/ui/storyOverlay";

import {
  checkoutDesktop,
  DESKTOP,
  JOURNEYS,
  journeyFixture,
  searchDesktop,
  signupDesktop,
} from "./journey-testing";
import { JourneyWalkHeaderView } from "./JourneyWalkHeader";

type Props = ComponentProps<typeof JourneyWalkHeaderView>;
type Journey = Props["journeys"][number];

type Viewport = { width: number; height: number };

const billing = journeyFixture({
  id: "c0ffee05",
  file: "features/accounts/billing.spec.ts",
  describe: ["organization owners", "with a yearly plan"],
  title:
    "downloads every invoice of the past year from the billing page and checks their totals",
  viewport: DESKTOP,
  screens: ["billing/index*", "invoices/index"],
});

/** The review on the first screen of `journey`. */
function activeOn(journey: Journey, viewport: Viewport) {
  const diffId = journey.variants[0]?.diffIds[0];
  invariant(diffId, "a journey has a screen");
  return { diffId, viewport, browser: "chromium" };
}

const meta = {
  title: "Pages/Build/JourneyWalkHeader",
  component: JourneyWalkHeaderView,
  args: {
    journeys: JOURNEYS,
    walkedJourneys: [checkoutDesktop],
    active: activeOn(checkoutDesktop, DESKTOP),
    statuses: {},
    params: { accountSlug: "acme", projectName: "shop", buildNumber: 42 },
  },
  // As wide as the build's list, which it sits above.
  render: (args) => (
    <div className="w-[295px] border-r">
      <JourneyWalkHeaderView {...args} />
    </div>
  ),
} satisfies Meta<typeof JourneyWalkHeaderView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A test run by two projects: a switch between its runs. */
export const TwoRuns: Story = {};

/** A test run once: its viewport and browser, nothing to switch. */
export const SingleRun: Story = {
  args: {
    walkedJourneys: [searchDesktop],
    active: activeOn(searchDesktop, DESKTOP),
  },
};

/** The last journey: no next one. */
export const LastJourney: Story = {
  args: {
    walkedJourneys: [signupDesktop],
    active: activeOn(signupDesktop, DESKTOP),
  },
};

/** A long path and title wrap rather than being cut. */
export const LongTitle: Story = {
  args: {
    journeys: [...JOURNEYS, billing],
    walkedJourneys: [billing],
    active: activeOn(billing, DESKTOP),
  },
};

/** The title opens the build's journeys, the unchanged ones after a line. */
export const MenuOpen: Story = {
  parameters: openOverlayParameters,
  render: (args) => (
    <div className="h-screen w-[295px] border-r">
      <JourneyWalkHeaderView {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "complete a purchase" }),
    );
  },
};
