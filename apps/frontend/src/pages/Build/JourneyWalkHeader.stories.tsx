import type { ComponentProps } from "react";
import { invariant } from "@argos/util/invariant";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";

import { ScreenshotDiffStatus } from "@/gql/graphql";
import { openOverlayParameters } from "@/ui/storyOverlay";

import { JourneyWalkHeaderView } from "./JourneyWalkHeader";

type Props = ComponentProps<typeof JourneyWalkHeaderView>;
type Journey = Props["journeys"][number];

type Viewport = { width: number; height: number };

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 375, height: 812 };

/** A run of a test in one Playwright project, a step per screen. */
function journey(input: {
  id: string;
  file: string;
  title: string;
  /** `describe` blocks between the file and the title. */
  describe?: string[];
  project: string;
  viewport: Viewport;
  /** The screens, the changed ones marked with a `*`. */
  screens: string[];
}): Journey {
  return {
    __typename: "BuildJourney",
    id: input.id,
    prefix: [input.file, ...(input.describe ?? [])].join(" › "),
    title: input.title,
    browser: "chromium",
    viewport: { __typename: "ScreenshotMetadataViewport", ...input.viewport },
    location: {
      __typename: "ScreenshotMetadataLocation",
      file: `e2e/${input.file}`,
    },
    steps: input.screens.map((name) => {
      const key = name.replace("*", "");
      return {
        __typename: "BuildJourneyStep",
        key,
        diffs: [
          {
            __typename: "ScreenshotDiff",
            id: `${input.id}-${key}`,
            name: `${input.project}/${key}.png`,
            variantKey: key,
            status: name.endsWith("*")
              ? ScreenshotDiffStatus.Changed
              : ScreenshotDiffStatus.Unchanged,
          },
        ],
      };
    }),
  };
}

const CHECKOUT = [
  "checkout/cart",
  "checkout/shipping*",
  "checkout/payment",
  "checkout/confirmation*",
];

const checkoutDesktop = journey({
  id: "c0ffee01",
  file: "checkout.spec.ts",
  title: "complete a purchase",
  project: "desktop",
  viewport: DESKTOP,
  screens: CHECKOUT,
});

const checkoutMobile = journey({
  id: "c0ffee02",
  file: "checkout.spec.ts",
  title: "complete a purchase",
  project: "mobile",
  viewport: MOBILE,
  screens: CHECKOUT,
});

const search = journey({
  id: "c0ffee03",
  file: "search.spec.ts",
  title: "finds a product",
  project: "desktop",
  viewport: DESKTOP,
  screens: ["search/results", "search/product*"],
});

const signup = journey({
  id: "c0ffee04",
  file: "signup.spec.ts",
  title: "create an account",
  project: "desktop",
  viewport: DESKTOP,
  screens: ["signup/form", "signup/welcome"],
});

const billing = journey({
  id: "c0ffee05",
  file: "features/accounts/billing.spec.ts",
  describe: ["organization owners", "with a yearly plan"],
  title:
    "downloads every invoice of the past year from the billing page and checks their totals",
  project: "desktop",
  viewport: DESKTOP,
  screens: ["billing/index*", "invoices/index"],
});

const JOURNEYS = [checkoutDesktop, checkoutMobile, search, signup];

/** The review on the first screen of `journey`. */
function activeOn(journey: Journey, viewport: Viewport) {
  const diff = journey.steps[0]?.diffs[0];
  invariant(diff, "a journey has a screen");
  return { diffId: diff.id, viewport, browser: "chromium" };
}

const meta = {
  title: "Pages/Build/JourneyWalkHeader",
  component: JourneyWalkHeaderView,
  args: {
    journeys: JOURNEYS,
    walkedJourneys: [checkoutDesktop],
    active: activeOn(checkoutDesktop, DESKTOP),
    statusContext: { isSubsetBuild: false, statuses: {} },
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
    walkedJourneys: [search],
    active: activeOn(search, DESKTOP),
  },
};

/** The last journey: no next one. */
export const LastJourney: Story = {
  args: {
    walkedJourneys: [signup],
    active: activeOn(signup, DESKTOP),
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
