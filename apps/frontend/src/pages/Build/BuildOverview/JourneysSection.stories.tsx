import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  BuildType,
  ScreenshotDiffStatus,
  ScreenshotMetadataColorScheme,
} from "@/gql/graphql";

import { EvaluationStatus } from "../EvaluationStatus";
import { getJourneyAnchor, JourneysSectionView } from "./JourneysSection";

type Props = ComponentProps<typeof JourneysSectionView>;
type Build = Props["build"];
type Journey = Build["journeys"][number];
type JourneyDiff = Journey["steps"][number]["diffs"][number];

type Viewport = { width: number; height: number };

/** A page drawn at the viewport's shape, with the screen's name on it. */
function getScreenImage(name: string, viewport: Viewport, changed: boolean) {
  const { width, height } = viewport;
  const accent = changed ? "#8b5cf6" : "#94a3b8";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#ffffff"/>
<rect width="100%" height="56" fill="#f1f5f9"/>
<rect x="24" y="18" width="96" height="20" rx="4" fill="${accent}"/>
<text x="24" y="120" font-family="sans-serif" font-size="32" font-weight="600" fill="#0f172a">${name}</text>
<rect x="24" y="160" width="${width - 48}" height="${Math.round(height * 0.25)}" rx="8" fill="#e2e8f0"/>
<rect x="24" y="${180 + Math.round(height * 0.25)}" width="${Math.round((width - 48) * 0.6)}" height="16" rx="4" fill="#cbd5e1"/>
<rect x="24" y="${210 + Math.round(height * 0.25)}" width="${Math.round((width - 48) * 0.4)}" height="16" rx="4" fill="#cbd5e1"/>
<rect x="24" y="${height - 72}" width="160" height="44" rx="8" fill="${accent}"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

let nextId = 0;

function screen(input: {
  name: string;
  variantKey?: string;
  viewport: Viewport;
  changed?: boolean;
  colorScheme?: ScreenshotMetadataColorScheme;
}): JourneyDiff {
  nextId++;
  const changed = input.changed ?? false;
  const metadata = {
    __typename: "ScreenshotMetadata" as const,
    colorScheme: input.colorScheme ?? ScreenshotMetadataColorScheme.Light,
    browser: {
      __typename: "ScreenshotMetadataBrowser" as const,
      name: "chromium",
    },
    viewport: {
      __typename: "ScreenshotMetadataViewport" as const,
      ...input.viewport,
    },
  };
  const screenshot = {
    __typename: "Screenshot" as const,
    id: `screenshot-${nextId}`,
    url: getScreenImage(
      input.name.split("/").at(-1) ?? input.name,
      input.viewport,
      changed,
    ),
    contentType: "image/svg+xml",
    metadata,
  };
  return {
    __typename: "ScreenshotDiff",
    id: `diff-${nextId}`,
    name: input.name,
    variantKey: input.variantKey ?? input.name,
    status: changed
      ? ScreenshotDiffStatus.Changed
      : ScreenshotDiffStatus.Unchanged,
    compareScreenshot: screenshot,
    baseScreenshot: { ...screenshot, id: `base-${nextId}` },
  };
}

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
    viewport: {
      __typename: "ScreenshotMetadataViewport",
      ...input.viewport,
    },
    location: {
      __typename: "ScreenshotMetadataLocation",
      file: `e2e/${input.file}`,
      line: 12,
      column: 3,
    },
    steps: input.screens.map((name) => {
      const key = name.replace("*", "");
      return {
        __typename: "BuildJourneyStep",
        key,
        diffs: [
          screen({
            name: `${input.project}/${key}.png`,
            variantKey: key,
            viewport: input.viewport,
            changed: name.endsWith("*"),
          }),
        ],
      };
    }),
  };
}

const CHECKOUT_SCREENS = [
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
  screens: CHECKOUT_SCREENS,
});

const checkoutMobile = journey({
  id: "c0ffee02",
  file: "checkout.spec.ts",
  title: "complete a purchase",
  project: "mobile",
  viewport: MOBILE,
  screens: [
    "checkout/cart",
    "checkout/shipping",
    "checkout/payment",
    "checkout/confirmation*",
  ],
});

const searchDesktop = journey({
  id: "c0ffee03",
  file: "search.spec.ts",
  title: "finds a product",
  project: "desktop",
  viewport: DESKTOP,
  screens: ["search/results", "search/product*"],
});

const signupDesktop = journey({
  id: "c0ffee04",
  file: "signup.spec.ts",
  title: "create an account",
  project: "desktop",
  viewport: DESKTOP,
  screens: ["signup/form", "signup/welcome"],
});

function build(journeys: Journey[], overrides?: Partial<Build>): Build {
  return {
    __typename: "Build",
    subset: false,
    branch: "feat/apple-pay",
    type: BuildType.Check,
    mergeQueue: false,
    journeys,
    ...overrides,
  };
}

const JOURNEYS = [
  checkoutDesktop,
  checkoutMobile,
  searchDesktop,
  signupDesktop,
];

/** The viewer's marks: `ids` marked `status`. */
function marks(ids: string[], status: EvaluationStatus) {
  return Object.fromEntries(ids.map((id) => [id, status]));
}

function getChangedDiffIds(journeys: Journey[]): string[] {
  return journeys.flatMap((journey) =>
    journey.steps.flatMap((step) =>
      step.diffs
        .filter((diff) => diff.status === ScreenshotDiffStatus.Changed)
        .map((diff) => diff.id),
    ),
  );
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

const longJourney = journey({
  id: "c0ffee05",
  file: "features/accounts/organizations/billing-and-invoices.spec.ts",
  describe: ["organization owners", "with a yearly plan"],
  title:
    "downloads every invoice of the past year from the billing page and checks their totals",
  project: "desktop",
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
