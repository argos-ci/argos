import { useState } from "react";
import { getStepLabel, getVariantSignature } from "@argos/schemas/journey";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ArrowRightIcon, FileCodeIcon, WaypointsIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import type { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { HeadlessLink } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { capitalize } from "@/util/string";

import { checkDiffNeedsAttention } from "../BuildJourneyDrawer";
import { getBuildURL, useBuildParams, type BuildParams } from "../BuildParams";
import { getJourneyTestKey } from "../journey-hints";
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
          compareScreenshot {
            id
            metadata {
              colorScheme
              browser {
                name
              }
              viewport {
                width
                height
              }
            }
          }
          baseScreenshot {
            id
            metadata {
              colorScheme
              browser {
                name
              }
              viewport {
                width
                height
              }
            }
          }
          ...ScreenshotDiffThumbnail_ScreenshotDiff
        }
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Journey = Build["journeys"][number];
type JourneyDiff = Journey["steps"][number]["diffs"][number];

const COLLAPSED_JOURNEY_COUNT = 5;

type Viewport = { width: number; height: number };

type JourneyScreen = {
  label: string;
  /** The step's screenshot in the variant the run shows. */
  diff: JourneyDiff;
  changed: boolean;
};

type JourneyRun = {
  /** The journey and the variant of it the run shows. */
  key: string;
  journey: Journey;
  viewport: Viewport | null;
  browser: string | null;
  colorScheme: ScreenshotMetadataColorScheme | null;
  screens: JourneyScreen[];
  changedCount: number;
};

type JourneyTest = {
  key: string;
  prefix: string;
  title: string;
  location: Journey["location"];
  /** Smallest viewport first. */
  runs: JourneyRun[];
  changedCount: number;
  /** What tells the runs apart, besides their viewport. */
  showBrowser: boolean;
  showColorScheme: boolean;
};

function getDiffMetadata(diff: JourneyDiff) {
  return (
    diff.compareScreenshot?.metadata ?? diff.baseScreenshot?.metadata ?? null
  );
}

/**
 * The runs of a journey, one per variant. A test takes each screen at several
 * sizes in a single run with Argos's `viewports` option: the sizes are steps
 * of one journey, and each is walked on its own.
 */
function getJourneyRuns(
  journey: Journey,
  context: { isSubsetBuild: boolean },
): JourneyRun[] {
  const signatures = new Set(
    journey.steps.flatMap((step) => step.diffs.map(getVariantSignature)),
  );
  return Array.from(signatures, (signature) => {
    const screens = journey.steps.flatMap((step) => {
      const diff = step.diffs.find(
        (diff) => getVariantSignature(diff) === signature,
      );
      return diff
        ? [
            {
              label: getStepLabel(step.key),
              diff,
              changed: checkDiffNeedsAttention(diff, context),
            },
          ]
        : [];
    });
    const [firstScreen] = screens;
    invariant(firstScreen, "a variant has at least one screen");
    const metadata = getDiffMetadata(firstScreen.diff);
    return {
      key: `${journey.id}${signature}`,
      journey,
      viewport: metadata?.viewport ?? journey.viewport,
      browser: metadata?.browser?.name ?? journey.browser,
      colorScheme: metadata?.colorScheme ?? null,
      screens,
      changedCount: screens.filter((screen) => screen.changed).length,
    };
  });
}

/** The tests of the build, their runs together, the most changed first. */
function getJourneyTests(
  journeys: Journey[],
  context: { isSubsetBuild: boolean },
): JourneyTest[] {
  const runsByTest = new Map<string, JourneyRun[]>();
  for (const journey of journeys) {
    const key = getJourneyTestKey(journey);
    const runs = runsByTest.get(key) ?? [];
    runsByTest.set(key, runs);
    runs.push(...getJourneyRuns(journey, context));
  }
  return Array.from(runsByTest, ([key, runs]): JourneyTest => {
    const [firstRun] = runs;
    invariant(firstRun, "a test has at least one run");
    const { journey } = firstRun;
    return {
      key,
      prefix: journey.prefix,
      title: journey.title,
      location: journey.location,
      runs: runs.toSorted(
        (a, b) =>
          (a.viewport?.width ?? Infinity) - (b.viewport?.width ?? Infinity) ||
          a.key.localeCompare(b.key),
      ),
      changedCount: runs.reduce((count, run) => count + run.changedCount, 0),
      showBrowser: new Set(runs.map((run) => run.browser)).size > 1,
      showColorScheme: new Set(runs.map((run) => run.colorScheme)).size > 1,
    };
  }).sort(
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
  const collapsible = listed.length > COLLAPSED_JOURNEY_COUNT + 1;
  const visible =
    collapsible && !expanded
      ? listed.slice(0, COLLAPSED_JOURNEY_COUNT)
      : listed;
  const hiddenUnchangedCount = listed === changed ? unchanged.length : 0;
  return (
    <Panel elevation={0} className="pb-1">
      <PanelHeader className="mb-2">
        <PanelTitle icon={WaypointsIcon}>Journeys</PanelTitle>
        <span className="text-low text-xs tabular-nums">
          {plural(tests.length, "journey")}
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
              Show {plural(listed.length - visible.length, "more journey")}
            </SectionButton>
          ) : null}
          {hiddenUnchangedCount > 0 ? (
            <SectionButton onClick={() => setShowUnchanged(true)}>
              Show {plural(hiddenUnchangedCount, "unchanged journey")}
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
    <li className="border-t-thin px-4 pt-3 pb-2.5 first:border-t-0 first:pt-1">
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
                  className="border-thin bg-app hover:bg-hover focus-ring text-xxs max-w-full truncate rounded-full px-1.5 transition"
                >
                  {screen.label}
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
      {/* Runs side by side as long as each keeps its text beside its
          screens. */}
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-3">
        {test.runs.map((run) => (
          <JourneyRunItem key={run.key} run={run} test={test} />
        ))}
      </ul>
    </li>
  );
}

const STACKED_SCREEN_COUNT = 3;
const STACK_OFFSET = 8;

/** The front screen of a run's stack, at the viewport's shape. */
function getFrontScreenSize(viewport: Viewport | null): Viewport {
  const ratio = viewport ? viewport.width / viewport.height : 1.5;
  return ratio < 1
    ? { width: Math.round(116 * ratio), height: 116 }
    : { width: 104, height: Math.round(104 / ratio) };
}

/**
 * A run's first screens of interest, the first one in front and the next ones
 * peeking out above it, smaller, like a deck.
 */
function ScreenStack(props: {
  screens: JourneyScreen[];
  viewport: Viewport | null;
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
              // A top crop at 2x the box: the screen as it first showed,
              // sharpened, as shrinking a whole page blurs its text.
              transformations={[
                `w-${width * 2}`,
                `h-${height * 2}`,
                "fo-top",
                "e-sharpen",
              ]}
            />
          </span>
        );
      })}
    </span>
  );
}

function getRunLabel(run: JourneyRun, test: JourneyTest): string {
  return [
    run.viewport ? formatViewport(run.viewport) : null,
    test.showColorScheme && run.colorScheme
      ? capitalize(run.colorScheme)
      : null,
    test.showBrowser && run.browser ? getBrowserLabel(run.browser) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function JourneyRunItem(props: { run: JourneyRun; test: JourneyTest }) {
  const { run, test } = props;
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const { journey, screens, changedCount, viewport, browser } = run;
  const [firstScreen] = screens;
  invariant(firstScreen, "a journey has at least one screen");
  const ViewportIcon = viewport
    ? viewportIcons[getViewportIconKind(viewport.width)]
    : null;
  const label = getRunLabel(run, test);
  // What changed, the first screens of it: the walk shows the rest. A run
  // that changed nothing shows how it starts.
  const changed = screens.filter((screen) => screen.changed);
  return (
    <li className="bg-ui hover:bg-hover relative flex items-center gap-4 rounded-lg px-4 py-3.5 transition">
      <ScreenStack
        screens={changed.length > 0 ? changed : screens}
        viewport={viewport}
      />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="text-low flex min-w-0 items-center gap-1.5 text-xs tabular-nums">
          {test.showBrowser && browser ? (
            <BrowserIcon
              browser={{ name: browser }}
              className="size-3.5 shrink-0"
            />
          ) : null}
          {ViewportIcon ? <ViewportIcon className="size-3.5 shrink-0" /> : null}
          <span className="truncate">{label || "Run"}</span>
        </span>
        <span
          className={clsx(
            "text-[0.8125rem]/5 font-medium",
            changedCount > 0 ? "text-warning-low" : "text-low",
          )}
        >
          {changedCount > 0
            ? `${changedCount} of ${screens.length} changed`
            : plural(screens.length, "screen")}
        </span>
        {/* The whole block walks the journey from its start. */}
        <HeadlessLink
          href={getJourneyScreenURL(params, journey, firstScreen.diff)}
          aria-label={`Walk “${test.title}”${label ? ` at ${label}` : ""}`}
          className="text-primary-low mt-0.5 inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-(--ring-color-default)"
        >
          Walk the journey
          <ArrowRightIcon className="size-3.5" />
        </HeadlessLink>
      </div>
    </li>
  );
}
