import { Fragment, useMemo, type ComponentProps, type ReactNode } from "react";
import { invariant } from "@argos/util/invariant";

import { DiffStatusIcon } from "@/containers/Build/BuildDiffGroup";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { MenuHeading, MenuItem, MenuSeparator } from "@/ui/menu-kit";

import { useBuildReviewState } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import {
  getJourneyRunHints,
  getRunCapture,
  groupJourneysByTest,
  type JourneyRunHint,
} from "./journey-hints";
import {
  groupTestsForReview,
  listJourneyTestFiles,
  type JourneyFile,
  type JourneyTestGroups,
} from "./journey-order";
import { getBrowserLabel } from "./metadata/browser/browserLabels";
import { formatViewport } from "./metadata/viewports/util";

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

/** A journey's status, in the icon and color the snapshot list gives it. */
function JourneyStatusIcon(props: { status: JourneyStatus }) {
  return (
    <DiffStatusIcon
      group={props.status}
      aria-label={JOURNEY_STATUS_LABELS[props.status]}
      className="ml-1.5 inline size-3.5 align-[-0.125em]"
    />
  );
}

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

/** The tests of `journeys`, computed again only when they or the marks change. */
export function useJourneyTestFiles<J extends ReviewedJourney>(
  journeys: readonly J[],
) {
  const statuses = useReviewStatuses();
  return useMemo(
    () => getJourneyTestFiles(journeys, statuses),
    [journeys, statuses],
  );
}

/**
 * What a test's row says under its title: the runs it took, told apart by
 * what differs between them, and how many screens changed.
 */
function getJourneyTestSummary(
  test: ListedJourneyTest<ReviewedJourney>,
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

/**
 * A menu row per test of `groups`, under its file, the unchanged tests after
 * a separator. A plain function rather than a component: menu-kit reads the
 * rows it is given.
 */
export function getJourneyTestMenuItems<J extends ReviewedJourney>(
  groups: JourneyTestFiles<J>,
  getItemProps: (
    test: ListedJourneyTest<J>,
  ) => Omit<ComponentProps<typeof MenuItem>, "children">,
): ReactNode[] {
  return listJourneyTestFiles(groups).map(({ key, file, separated }) => (
    <Fragment key={key}>
      {separated ? <MenuSeparator /> : null}
      <MenuHeading>{file.path ?? file.name}</MenuHeading>
      {file.tests.map((test) => {
        const context = getTestContext(test, file);
        return (
          <MenuItem
            key={test.key}
            wrap
            textValue={[context, test.title].filter(Boolean).join(" › ")}
            keywords={[file.path ?? file.name]}
            subtitle={getJourneyTestSummary(test)}
            {...getItemProps(test)}
          >
            {context ? <span className="text-low">{context} › </span> : null}
            {test.title}
            <JourneyStatusIcon status={test.status} />
          </MenuItem>
        );
      })}
    </Fragment>
  ));
}
