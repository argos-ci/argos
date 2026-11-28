import { invariant } from "@argos/util/invariant";

import { ScreenshotDiffStatus } from "@/gql/graphql";

import { useBuildReviewState } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import { getRunCapture, groupJourneysByTest } from "./journey-hints";
import {
  groupTestsForReview,
  type JourneyFile,
  type JourneyTestGroups,
} from "./journey-order";

type TestJourney = {
  prefix: string;
  title: string;
  location: { file: string } | null;
};

/**
 * What the title path says about a test besides its file: `describe` blocks,
 * a Playwright project. Cypress leaves the file out of it, Playwright puts it
 * in, relative to its test directory.
 */
export function getTestContext(
  test: Omit<TestJourney, "title">,
  file: JourneyFile<unknown>,
): string | null {
  if (!test.location || !file.path) {
    // The file is named after the title path itself.
    return null;
  }
  const { path } = file;
  const context = test.prefix
    .split(" › ")
    .filter((segment) => segment && !path.endsWith(segment));
  return context.length > 0 ? context.join(" › ") : null;
}

/**
 * Where a journey's review stands, as the snapshot list names its groups:
 * changed until every change is marked, then accepted or rejected.
 */
type JourneyStatus =
  | ScreenshotDiffStatus.Unchanged
  | ScreenshotDiffStatus.Changed
  | EvaluationStatus.Accepted
  | EvaluationStatus.Rejected;

const NO_STATUSES: Record<string, EvaluationStatus> = {};

/** The viewer's marks in the review under way, by diff id. */
export function useReviewStatuses(): Record<string, EvaluationStatus> {
  return useBuildReviewState()?.diffStatuses ?? NO_STATUSES;
}

/** Where the review of a journey stands, from its screens waiting for one. */
export function getJourneyStatus(
  changedDiffIds: readonly string[],
  statuses: Record<string, EvaluationStatus>,
): JourneyStatus {
  if (changedDiffIds.length === 0) {
    return ScreenshotDiffStatus.Unchanged;
  }
  let rejected = false;
  for (const diffId of changedDiffIds) {
    const status = statuses[diffId];
    if (status === EvaluationStatus.Rejected) {
      rejected = true;
    } else if (status !== EvaluationStatus.Accepted) {
      return ScreenshotDiffStatus.Changed;
    }
  }
  return rejected ? EvaluationStatus.Rejected : EvaluationStatus.Accepted;
}

export const JOURNEY_STATUS_LABELS: Record<JourneyStatus, string> = {
  [ScreenshotDiffStatus.Unchanged]: "No changes",
  [ScreenshotDiffStatus.Changed]: "Changed",
  [EvaluationStatus.Accepted]: "Reviewed, every screen accepted",
  [EvaluationStatus.Rejected]: "Reviewed, with a rejected screen",
};

type ReviewedJourney = TestJourney & {
  id: string;
  variants: readonly {
    browser: string | null;
    viewport: { width: number; height: number } | null;
    changedDiffIds: readonly string[];
  }[];
};

/** A test and its runs, a journey per Playwright project, and its review. */
export type ListedJourneyTest<J extends ReviewedJourney> = {
  key: string;
  prefix: string;
  title: string;
  location: J["location"];
  /** Smallest viewport first, as the overview lays the runs out. */
  journeys: J[];
  status: JourneyStatus;
  changedCount: number;
};

export type JourneyTestFiles<J extends ReviewedJourney> = JourneyTestGroups<
  ListedJourneyTest<J>
>;

/**
 * The tests of `journeys` in the overview's order, by file, each with where
 * its review stands.
 */
export function getJourneyTestFiles<J extends ReviewedJourney>(
  journeys: readonly J[],
  statuses: Record<string, EvaluationStatus>,
): JourneyTestFiles<J> {
  const tests = groupJourneysByTest(journeys).map(
    (test): ListedJourneyTest<J> => {
      const [first] = test.journeys;
      invariant(first !== undefined, "a test has a run");
      const changedDiffIds = test.journeys.flatMap((journey) =>
        journey.variants.flatMap((variant) => variant.changedDiffIds),
      );
      return {
        key: test.key,
        prefix: first.prefix,
        title: first.title,
        location: first.location,
        journeys: test.journeys.toSorted(
          (a, b) =>
            (getRunCapture(a).viewport?.width ?? Infinity) -
            (getRunCapture(b).viewport?.width ?? Infinity),
        ),
        status: getJourneyStatus(changedDiffIds, statuses),
        changedCount: changedDiffIds.length,
      };
    },
  );
  return groupTestsForReview(tests);
}
