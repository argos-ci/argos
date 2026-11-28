import type { ComponentProps } from "react";
import { invariant } from "@argos/util/invariant";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";

import type { JourneysSectionView } from "./BuildOverview/JourneysSection";

/**
 * Journey fixtures for the stories of the journeys section, with what the
 * section reads.
 */
type Journey = ComponentProps<
  typeof JourneysSectionView
>["build"]["journeys"][number];

type Viewport = { width: number; height: number };

export const DESKTOP: Viewport = { width: 1280, height: 720 };
const MOBILE: Viewport = { width: 375, height: 812 };

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

/** A run of a test in one Playwright project, a step per screen. */
export function journeyFixture(input: {
  id: string;
  file: string;
  title: string;
  /** `describe` blocks between the file and the title. */
  describe?: string[];
  viewport: Viewport;
  /** The screens, the changed ones marked with a trailing `*`. */
  screens: string[];
}): Journey {
  const steps = input.screens.map((name) => {
    const changed = name.endsWith("*");
    const key = changed ? name.slice(0, -1) : name;
    return { key, diffId: `${input.id}-${key}`, changed };
  });
  const [first] = steps;
  invariant(first, "a journey has a screen");
  const shown = steps.find((step) => step.changed) ?? first;
  const screenshot = {
    __typename: "Screenshot" as const,
    id: `screenshot-${shown.diffId}`,
    url: getScreenImage(
      shown.key.split("/").at(-1) ?? shown.key,
      input.viewport,
      shown.changed,
    ),
    contentType: "image/svg+xml",
  };
  return {
    __typename: "BuildJourney",
    id: input.id,
    prefix: [input.file, ...(input.describe ?? [])].join(" › "),
    title: input.title,
    location: {
      __typename: "ScreenshotMetadataLocation",
      file: `e2e/${input.file}`,
    },
    stepKeys: steps.map((step) => step.key),
    variants: [
      {
        __typename: "BuildJourneyVariant",
        browser: "chromium",
        colorScheme: ScreenshotMetadataColorScheme.Light,
        viewport: {
          __typename: "ScreenshotMetadataViewport",
          ...input.viewport,
        },
        diffIds: steps.map((step) => step.diffId),
        changedDiffIds: steps
          .filter((step) => step.changed)
          .map((step) => step.diffId),
        cover: {
          __typename: "ScreenshotDiff",
          id: shown.diffId,
          compareScreenshot: screenshot,
          baseScreenshot: { ...screenshot, id: `base-${shown.diffId}` },
        },
      },
    ],
  };
}

export const checkoutDesktop = journeyFixture({
  id: "c0ffee01",
  file: "checkout.spec.ts",
  title: "complete a purchase",
  viewport: DESKTOP,
  screens: [
    "checkout/cart",
    "checkout/shipping*",
    "checkout/payment",
    "checkout/confirmation*",
  ],
});

export const checkoutMobile = journeyFixture({
  id: "c0ffee02",
  file: "checkout.spec.ts",
  title: "complete a purchase",
  viewport: MOBILE,
  screens: [
    "checkout/cart",
    "checkout/shipping",
    "checkout/payment",
    "checkout/confirmation*",
  ],
});

const searchDesktop = journeyFixture({
  id: "c0ffee03",
  file: "search.spec.ts",
  title: "finds a product",
  viewport: DESKTOP,
  screens: ["search/results", "search/product*"],
});

export const signupDesktop = journeyFixture({
  id: "c0ffee04",
  file: "signup.spec.ts",
  title: "create an account",
  viewport: DESKTOP,
  screens: ["signup/form", "signup/welcome"],
});

/** The journeys of a build with a changed checkout, search and an unchanged sign-up. */
export const JOURNEYS = [
  checkoutDesktop,
  checkoutMobile,
  searchDesktop,
  signupDesktop,
];

export function getChangedDiffIds(journeys: Journey[]): string[] {
  return journeys.flatMap((journey) =>
    journey.variants.flatMap((variant) => variant.changedDiffIds),
  );
}
