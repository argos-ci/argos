import { clsx } from "clsx";

import {
  getDiffGroupDefinition,
  type DiffGroupName,
} from "@/containers/Build/BuildDiffGroup";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { lowTextColorClassNames } from "@/util/colors";

import { useBuildDiffState } from "./BuildDiffState";
import { checkDiffNeedsAttention } from "./BuildJourneyDrawer";
import { useBuildReviewState } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import {
  getJourneyRunHints,
  getJourneyTestKey,
  type JourneyRunHint,
} from "./journey-hints";
import { getBrowserLabel } from "./metadata/browser/browserLabels";
import { formatViewport } from "./metadata/viewports/util";
import { getRepositoryPath } from "./sidebar/metadata/LocationChip";

type TestJourney = {
  prefix: string;
  title: string;
  location: { file: string } | null;
};

/** A test and its runs: a journey per Playwright project it ran in. */
type JourneyTest<J extends TestJourney> = {
  key: string;
  prefix: string;
  title: string;
  location: J["location"];
  journeys: J[];
};

/** `journeys` by the test they are runs of, in the order they first come in. */
function groupJourneysByTest<J extends TestJourney>(
  journeys: readonly J[],
): JourneyTest<J>[] {
  const tests = new Map<string, JourneyTest<J>>();
  for (const journey of journeys) {
    const key = getJourneyTestKey(journey);
    const test: JourneyTest<J> = tests.get(key) ?? {
      key,
      prefix: journey.prefix,
      title: journey.title,
      location: journey.location,
      journeys: [],
    };
    tests.set(key, test);
    test.journeys.push(journey);
  }
  return Array.from(tests.values());
}

export type JourneyFile<T> = {
  key: string;
  /** The file's path in the repository, when the test has a location. */
  path: string | null;
  /** The folders before the file name in that path. */
  dir: string | null;
  /** The file name, or the title path when the test has no location. */
  name: string;
  tests: T[];
};

/**
 * `tests` by the file that holds them, the files in the order their first
 * test comes in: the most changed first, when `tests` is sorted that way.
 */
export function groupTestsByFile<T extends Omit<TestJourney, "title">>(
  tests: readonly T[],
): JourneyFile<T>[] {
  const files = new Map<string, JourneyFile<T>>();
  for (const test of tests) {
    const path = test.location ? getRepositoryPath(test.location.file) : null;
    const key = path ?? test.prefix;
    const nameStart = path ? path.lastIndexOf("/") + 1 : 0;
    const file: JourneyFile<T> = files.get(key) ?? {
      key,
      path,
      dir: path && nameStart > 0 ? path.slice(0, nameStart) : null,
      name: path ? path.slice(nameStart) : test.prefix,
      tests: [],
    };
    files.set(key, file);
    file.tests.push(test);
  }
  return Array.from(files.values());
}

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
export type JourneyStatus =
  | ScreenshotDiffStatus.Unchanged
  | ScreenshotDiffStatus.Changed
  | EvaluationStatus.Accepted
  | EvaluationStatus.Rejected;

/** What it takes to say where a journey's review stands. */
export type JourneyStatusContext = {
  isSubsetBuild: boolean;
  /** The viewer's marks in the review under way, by diff id. */
  statuses: Record<string, EvaluationStatus>;
};

const NO_STATUSES: Record<string, EvaluationStatus> = {};

export function useJourneyStatusContext(): JourneyStatusContext {
  const { isSubsetBuild } = useBuildDiffState();
  const statuses = useBuildReviewState()?.diffStatuses ?? NO_STATUSES;
  return { isSubsetBuild, statuses };
}

export function getJourneyStatus(
  diffs: readonly { id: string; status: ScreenshotDiffStatus }[],
  context: JourneyStatusContext,
): JourneyStatus {
  const changed = diffs.filter((diff) =>
    checkDiffNeedsAttention(diff, context),
  );
  if (changed.length === 0) {
    return ScreenshotDiffStatus.Unchanged;
  }
  let rejected = false;
  for (const diff of changed) {
    const status = context.statuses[diff.id];
    if (status === EvaluationStatus.Rejected) {
      rejected = true;
    } else if (status !== EvaluationStatus.Accepted) {
      return ScreenshotDiffStatus.Changed;
    }
  }
  return rejected ? EvaluationStatus.Rejected : EvaluationStatus.Accepted;
}

const STATUS_LABELS: Record<JourneyStatus, string> = {
  [ScreenshotDiffStatus.Unchanged]: "No changes",
  [ScreenshotDiffStatus.Changed]: "Changed",
  [EvaluationStatus.Accepted]: "Reviewed, every screen accepted",
  [EvaluationStatus.Rejected]: "Reviewed, with a rejected screen",
};

/** A journey's status, in the icon and color the snapshot list gives it. */
export function JourneyStatusIcon(props: {
  status: JourneyStatus;
  className?: string;
}) {
  const group: DiffGroupName = props.status;
  const { icon: Icon, color } = getDiffGroupDefinition(group);
  return (
    <Icon
      role="img"
      aria-label={STATUS_LABELS[props.status]}
      className={clsx(lowTextColorClassNames[color], props.className)}
    />
  );
}

type ReviewedJourney = TestJourney & {
  viewport: { width: number } | null;
  steps: readonly {
    diffs: readonly { id: string; status: ScreenshotDiffStatus }[];
  }[];
};

export type ListedJourneyTest<J extends ReviewedJourney> = JourneyTest<J> & {
  status: JourneyStatus;
  changedCount: number;
};

/**
 * The tests of `journeys` in the overview's order, by file: the most changed
 * first, unchanged ones last, each with where its review stands.
 */
export function getJourneyTestFiles<J extends ReviewedJourney>(
  journeys: readonly J[],
  context: Parameters<typeof getJourneyStatus>[1],
): JourneyFile<ListedJourneyTest<J>>[] {
  const tests = groupJourneysByTest(journeys).map(
    (test): ListedJourneyTest<J> => {
      const diffs = test.journeys.flatMap((journey) =>
        journey.steps.flatMap((step) => step.diffs),
      );
      return {
        ...test,
        // Smallest viewport first, as the overview lays the runs out.
        journeys: test.journeys.toSorted(
          (a, b) =>
            (a.viewport?.width ?? Infinity) - (b.viewport?.width ?? Infinity),
        ),
        status: getJourneyStatus(diffs, context),
        changedCount: diffs.filter((diff) =>
          checkDiffNeedsAttention(diff, context),
        ).length,
      };
    },
  );
  tests.sort(
    (a, b) => b.changedCount - a.changedCount || a.key.localeCompare(b.key),
  );
  return groupTestsByFile(tests);
}

/**
 * What a test's row says under its title: the runs it took, told apart by
 * what differs between them, and how many screens changed.
 */
export function getJourneyTestSummary(
  test: ListedJourneyTest<
    ReviewedJourney & Parameters<typeof getJourneyRunHints>[0][number]
  >,
): string {
  const hints = getJourneyRunHints(test.journeys);
  const runs = test.journeys
    .map((journey) => getJourneyRunLabel(hints.get(journey.id)))
    .filter(Boolean);
  return [
    runs.join(", "),
    test.changedCount > 0
      ? `${test.changedCount} changed ${test.changedCount === 1 ? "screen" : "screens"}`
      : "No changes",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** A run named by what tells it from the other runs of its test. */
export function getJourneyRunLabel(hint: JourneyRunHint | undefined): string {
  return [
    hint?.viewport ? formatViewport(hint.viewport) : null,
    hint?.browser ? getBrowserLabel(hint.browser) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
