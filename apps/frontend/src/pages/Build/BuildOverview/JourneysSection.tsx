import { useState } from "react";
import { getStepLabel, getVariantSignature } from "@argos/schemas/journey";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ArrowRightIcon, FileCodeIcon, WaypointsIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { HeadlessLink } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";

import { checkDiffNeedsAttention } from "../BuildJourneyDrawer";
import { getBuildURL, useBuildParams, type BuildParams } from "../BuildParams";
import { getJourneyRunHints, getJourneyTestKey } from "../journey-hints";
import { BrowserIcon } from "../metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../metadata/browser/browserLabels";
import { serializeJourneySearch } from "../metadata/filters/util";
import { getViewportIconKind, viewportIcons } from "../metadata/metadataIcons";
import { formatViewport } from "../metadata/viewports/util";
import { getLocationURL } from "../sidebar/metadata/LocationChip";
import { ScreenshotDiffThumbnail } from "../sidebar/ScreenshotDiffThumbnail";

const _BuildFragment = graphql(`
  fragment JourneysSection_Build on Build {
    subset
    branch
    journeys {
      id
      prefix
      title
      browser
      viewport {
        width
        height
      }
      location {
        file
        line
        column
      }
      steps {
        key
        diffs {
          id
          name
          variantKey
          status
          ...ScreenshotDiffThumbnail_ScreenshotDiff
        }
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Journey = Build["journeys"][number];
type JourneyDiff = Journey["steps"][number]["diffs"][number];

const COLLAPSED_TEST_COUNT = 5;

type JourneyScreen = {
  label: string;
  /** The step's screenshot in the variant the run shows. */
  diff: JourneyDiff;
  changed: boolean;
};

type JourneyRun = {
  journey: Journey;
  screens: JourneyScreen[];
  changedCount: number;
  /** The browser, when the other runs of the test use another one. */
  browser: string | null;
};

type JourneyTest = {
  key: string;
  prefix: string;
  title: string;
  location: Journey["location"];
  runs: JourneyRun[];
  changedCount: number;
};

function getJourneyRun(
  journey: Journey,
  context: { isSubsetBuild: boolean; browser: string | null },
): JourneyRun {
  const needsAttention = (diff: JourneyDiff) =>
    checkDiffNeedsAttention(diff, context);
  const steps = journey.steps.map((step) => ({
    step,
    changed: step.diffs.some(needsAttention),
  }));
  // One variant all along, the one of the first change, so the strip reads
  // as the screens a user went through.
  const reference =
    journey.steps.flatMap((step) => step.diffs).find(needsAttention) ??
    journey.steps[0]?.diffs[0];
  invariant(reference, "a journey has at least one screenshot");
  const signature = getVariantSignature(reference);
  const screens = steps.map(({ step, changed }) => {
    const diff =
      step.diffs.find((diff) => getVariantSignature(diff) === signature) ??
      step.diffs[0];
    invariant(diff, "a journey step has at least one screenshot");
    return { label: getStepLabel(step.key), diff, changed };
  });
  return {
    journey,
    screens,
    changedCount: screens.filter((screen) => screen.changed).length,
    browser: context.browser,
  };
}

/** The tests of the build, their runs together, the most changed first. */
function getJourneyTests(
  journeys: Journey[],
  context: { isSubsetBuild: boolean },
): JourneyTest[] {
  const hints = getJourneyRunHints(journeys);
  const tests = new Map<string, JourneyTest>();
  for (const journey of journeys) {
    const key = getJourneyTestKey(journey);
    const test = tests.get(key) ?? {
      key,
      prefix: journey.prefix,
      title: journey.title,
      location: journey.location,
      runs: [],
      changedCount: 0,
    };
    tests.set(key, test);
    const run = getJourneyRun(journey, {
      ...context,
      browser: hints.get(journey.id)?.browser ?? null,
    });
    test.runs.push(run);
    test.changedCount += run.changedCount;
  }
  return Array.from(tests.values()).sort(
    (a, b) => b.changedCount - a.changedCount || a.key.localeCompare(b.key),
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * The build's end-to-end tests that walk several screens, each run as a strip
 * of its screens. A run opens the build on its first screen with the journey
 * filter on, a screen opens it on that screen: the review then walks the
 * journey screen by screen, the way a user clicks through the app.
 */
export function JourneysSection(props: {
  build: Build;
  repoUrl: string | null;
}) {
  const { build, repoUrl } = props;
  const [expanded, setExpanded] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);
  if (build.journeys.length === 0) {
    return null;
  }
  const tests = getJourneyTests(build.journeys, {
    isSubsetBuild: build.subset,
  });
  const changed = tests.filter((test) => test.changedCount > 0);
  const unchanged = tests.filter((test) => test.changedCount === 0);
  // With nothing changed, the unchanged journeys are all there is to walk.
  const listed = showUnchanged || changed.length === 0 ? tests : changed;
  const collapsible = listed.length > COLLAPSED_TEST_COUNT + 1;
  const visible =
    collapsible && !expanded ? listed.slice(0, COLLAPSED_TEST_COUNT) : listed;
  const hiddenUnchangedCount = listed === changed ? unchanged.length : 0;
  return (
    <Panel elevation={0} className="pb-1">
      <PanelHeader className="mb-2">
        <PanelTitle icon={WaypointsIcon}>Journeys</PanelTitle>
        <span className="text-low text-xs tabular-nums">
          {plural(tests.length, "test")}
          {build.journeys.length > tests.length
            ? ` · ${plural(build.journeys.length, "run")}`
            : null}
        </span>
      </PanelHeader>
      <ul>
        {visible.map((test) => (
          <JourneyTestItem
            key={test.key}
            test={test}
            href={getLocationURL({
              location: test.location,
              repoUrl,
              branch: build.branch,
            })}
          />
        ))}
      </ul>
      {(collapsible && !expanded) || hiddenUnchangedCount > 0 ? (
        <div className="border-t-thin flex flex-wrap gap-2 px-2 pt-2.5 pb-2">
          {collapsible && !expanded ? (
            <SectionButton onClick={() => setExpanded(true)}>
              Show {plural(listed.length - visible.length, "more test")}
            </SectionButton>
          ) : null}
          {hiddenUnchangedCount > 0 ? (
            <SectionButton onClick={() => setShowUnchanged(true)}>
              Show {plural(hiddenUnchangedCount, "unchanged test")}
            </SectionButton>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

function SectionButton(props: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="focus-ring text-low hover:bg-ui hover:text-default cursor-default rounded-full px-2 py-0.5 text-sm transition"
    >
      {props.children}
    </button>
  );
}

const MAX_CHANGED_SCREEN_NAMES = 6;

/** A screen of a journey, opened with the journey filter on. */
function getJourneyScreenURL(
  params: BuildParams,
  journey: Journey,
  diff: JourneyDiff,
): string {
  return serializeJourneySearch(getBuildURL({ ...params, diffId: diff.id }), {
    journey: new Set([journey.id]),
  });
}

type NamedScreen = JourneyScreen & { index: number; journey: Journey };

/**
 * The screens that changed in any run of a test, once each, in journey order:
 * the runs of a test take the same screens, at another viewport.
 */
function getChangedScreens(test: JourneyTest): NamedScreen[] {
  const byLabel = new Map<string, NamedScreen>();
  for (const run of test.runs) {
    run.screens.forEach((screen, index) => {
      if (screen.changed && !byLabel.has(screen.label)) {
        byLabel.set(screen.label, { ...screen, index, journey: run.journey });
      }
    });
  }
  return Array.from(byLabel.values()).sort((a, b) => a.index - b.index);
}

function JourneyTestItem(props: { test: JourneyTest; href: string | null }) {
  const { test, href } = props;
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const changedScreens = getChangedScreens(test);
  const namedScreens = changedScreens.slice(0, MAX_CHANGED_SCREEN_NAMES);
  return (
    <li className="border-t-thin px-4 pt-3 pb-2.5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {test.prefix ? (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-low hover:text-default inline-flex max-w-full items-center gap-1 text-xs transition"
              >
                <FileCodeIcon className="size-3.5 shrink-0" />
                <span className="truncate">{test.prefix}</span>
              </a>
            ) : (
              <div className="text-low truncate text-xs">{test.prefix}</div>
            )
          ) : null}
          <h3 className="mt-0.5 text-sm/snug font-medium">{test.title}</h3>
          {namedScreens.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {namedScreens.map((screen) => (
                <HeadlessLink
                  key={screen.label}
                  href={getJourneyScreenURL(
                    params,
                    screen.journey,
                    screen.diff,
                  )}
                  aria-label={`Screen ${screen.index + 1}, ${screen.label}, changed`}
                  className="border-thin bg-app hover:bg-hover focus-ring text-xxs flex max-w-full items-center gap-1 rounded-full px-1.5 transition"
                >
                  <span className="bg-warning-solid size-1.5 shrink-0 rounded-full" />
                  <span className="truncate">{screen.label}</span>
                </HeadlessLink>
              ))}
              {changedScreens.length > namedScreens.length ? (
                <span className="text-low text-xxs px-0.5 tabular-nums">
                  +{changedScreens.length - namedScreens.length}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {test.runs.map((run) => (
          <JourneyRunItem key={run.journey.id} run={run} title={test.title} />
        ))}
      </ul>
    </li>
  );
}

const STACKED_SCREEN_COUNT = 3;
const STACK_OFFSET = 8;

/** The front screen of a run's stack, at the viewport's shape. */
function getFrontScreenSize(viewport: Journey["viewport"]): {
  width: number;
  height: number;
} {
  const ratio = viewport ? viewport.width / viewport.height : 1.5;
  return ratio < 1
    ? { width: Math.round(134 * ratio), height: 134 }
    : { width: 150, height: Math.round(150 / ratio) };
}

/**
 * A run's first screens of interest, the first one in front and the next ones
 * peeking out above it, smaller, like a deck.
 */
function ScreenStack(props: {
  screens: JourneyScreen[];
  viewport: Journey["viewport"];
}) {
  const front = getFrontScreenSize(props.viewport);
  const layers = props.screens.slice(0, STACKED_SCREEN_COUNT);
  const depth = layers.length - 1;
  return (
    <span
      className="relative block shrink-0"
      style={{
        width: front.width,
        height: front.height + STACK_OFFSET * depth,
      }}
    >
      {layers.map((screen, index) => {
        const scale = 1 - index * 0.1;
        const width = Math.round(front.width * scale);
        const height = Math.round(front.height * scale);
        return (
          <span
            key={screen.diff.id}
            className={clsx(
              "absolute block rounded-sm",
              index === 0 && "shadow-md",
            )}
            style={{
              left: Math.round((front.width - width) / 2),
              top: STACK_OFFSET * (depth - index),
              width,
              height,
              zIndex: layers.length - index,
            }}
          >
            <ScreenshotDiffThumbnail
              screenshotDiff={screen.diff}
              className="size-full"
              iconClassName="m-auto size-4"
              fit="cover"
              // A top crop at 2x the box: the screen as it first showed.
              transformations={[`w-${width * 2}`, `h-${height * 2}`, "fo-top"]}
            />
          </span>
        );
      })}
    </span>
  );
}

function JourneyRunItem(props: { run: JourneyRun; title: string }) {
  const { run, title } = props;
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const { journey, screens, changedCount, browser } = run;
  const [firstScreen] = screens;
  invariant(firstScreen, "a journey has at least one screen");
  const ViewportIcon = journey.viewport
    ? viewportIcons[getViewportIconKind(journey.viewport.width)]
    : null;
  // What changed, the first screens of it: the walk shows the rest. A run
  // that changed nothing shows how it starts.
  const changed = screens.filter((screen) => screen.changed);
  return (
    // A narrow run puts its screens above its text rather than squeeze it.
    <li className="bg-subtle hover:bg-ui @container relative rounded-lg px-4 py-3.5 transition">
      {/* Stacked, the screens take the room left so the text of runs side
          by side lines up at the bottom. */}
      <div className="flex h-full flex-col items-start gap-3 @xs:flex-row @xs:items-center @xs:gap-4">
        <div className="flex flex-1 items-end @xs:flex-none">
          <ScreenStack
            screens={changed.length > 0 ? changed : screens}
            viewport={journey.viewport}
          />
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1.5 @xs:flex-1">
          <span className="text-low flex min-w-0 items-center gap-1.5 text-xs tabular-nums">
            {browser ? (
              <BrowserIcon
                browser={{ name: browser }}
                className="size-3.5 shrink-0"
                title={getBrowserLabel(browser)}
              />
            ) : null}
            {ViewportIcon ? (
              <ViewportIcon className="size-3.5 shrink-0" />
            ) : null}
            <span className="truncate">
              {journey.viewport
                ? formatViewport(journey.viewport)
                : browser
                  ? getBrowserLabel(browser)
                  : "Run"}
            </span>
          </span>
          <span
            className={clsx(
              "text-sm font-medium",
              changedCount > 0 ? "text-warning-low" : "text-low",
            )}
          >
            {changedCount > 0
              ? `${changedCount} of ${plural(screens.length, "screen")} changed`
              : plural(screens.length, "screen")}
          </span>
          {/* The whole block walks the journey from its start. */}
          <HeadlessLink
            href={getJourneyScreenURL(params, journey, firstScreen.diff)}
            aria-label={`Walk “${title}”${journey.viewport ? ` at ${formatViewport(journey.viewport)}` : ""}`}
            className="text-primary-low mt-0.5 inline-flex items-center gap-1 text-xs font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-(--ring-color-default)"
          >
            Walk the journey
            <ArrowRightIcon className="size-3.5" />
          </HeadlessLink>
        </div>
      </div>
    </li>
  );
}
