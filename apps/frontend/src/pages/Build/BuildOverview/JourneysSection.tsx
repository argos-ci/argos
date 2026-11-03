import { useState } from "react";
import { getStepLabel, getVariantSignature } from "@argos/schemas/journey";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ChevronRightIcon, FileCodeIcon, WaypointsIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { HeadlessLink } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Tooltip } from "@/ui/Tooltip";

import { checkDiffNeedsAttention } from "../BuildJourneyDrawer";
import { getBuildURL, useBuildParams } from "../BuildParams";
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

function JourneyTestItem(props: { test: JourneyTest; href: string | null }) {
  const { test, href } = props;
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
        </div>
        {test.changedCount > 0 ? (
          <span className="text-low shrink-0 pt-4 text-xs tabular-nums">
            {plural(test.changedCount, "change")}
          </span>
        ) : null}
      </div>
      <ul className="mt-2 flex flex-col gap-0.5">
        {test.runs.map((run) => (
          <JourneyRunRow key={run.journey.id} run={run} title={test.title} />
        ))}
      </ul>
    </li>
  );
}

/**
 * A screen's box in the strip: the first screen as the run saw it, at the
 * viewport's shape, so a phone run reads as phone screens.
 */
function getScreenSize(viewport: Journey["viewport"]): {
  width: number;
  height: number;
} {
  if (!viewport) {
    return { width: 48, height: 32 };
  }
  const height = viewport.height > viewport.width ? 68 : 32;
  return {
    width: Math.round((height * viewport.width) / viewport.height),
    height,
  };
}

function JourneyRunRow(props: { run: JourneyRun; title: string }) {
  const { run, title } = props;
  const params = useBuildParams();
  invariant(params, "a journey is rendered on a build page");
  const { journey, screens, changedCount, browser } = run;
  const getHref = (diff: JourneyDiff) =>
    serializeJourneySearch(getBuildURL({ ...params, diffId: diff.id }), {
      journey: new Set([journey.id]),
    });
  const [firstScreen] = screens;
  invariant(firstScreen, "a journey has at least one screen");
  const ViewportIcon = journey.viewport
    ? viewportIcons[getViewportIconKind(journey.viewport.width)]
    : null;
  const size = getScreenSize(journey.viewport);
  return (
    <li className="hover:bg-subtle relative -mx-2 grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1 transition">
      {/* The whole row walks the journey from its start; each screen is a
          link of its own, above it. */}
      <HeadlessLink
        href={getHref(firstScreen.diff)}
        aria-label={`Walk “${title}”${journey.viewport ? ` at ${formatViewport(journey.viewport)}` : ""}`}
        className="text-low flex min-w-0 items-center gap-1.5 text-xs tabular-nums outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-(--ring-color-default)"
      >
        {browser ? (
          <BrowserIcon
            browser={{ name: browser }}
            className="size-3.5 shrink-0"
            title={getBrowserLabel(browser)}
          />
        ) : null}
        {ViewportIcon ? <ViewportIcon className="size-3.5 shrink-0" /> : null}
        <span className="truncate">
          {journey.viewport
            ? formatViewport(journey.viewport)
            : browser
              ? getBrowserLabel(browser)
              : "Run"}
        </span>
      </HeadlessLink>
      <div className="flex min-w-0 [scrollbar-width:none] items-end gap-1.5 overflow-x-auto pt-1.5 pr-1.5 pb-0.5">
        {screens.map((screen, index) => (
          <Tooltip
            key={screen.diff.id}
            content={`${index + 1} · ${screen.label}`}
          >
            <HeadlessLink
              href={getHref(screen.diff)}
              aria-label={`Screen ${index + 1}, ${screen.label}${screen.changed ? ", changed" : ""}`}
              className="focus-ring relative z-1 block shrink-0 rounded-sm"
              style={size}
            >
              <ScreenshotDiffThumbnail
                screenshotDiff={screen.diff}
                className={clsx("size-full", !screen.changed && "opacity-50")}
                iconClassName="m-auto size-4"
                fit="cover"
                // A top crop at 2x the box: the screen as it first showed.
                transformations={[
                  `w-${size.width * 2}`,
                  `h-${size.height * 2}`,
                  "fo-top",
                ]}
              />
              {screen.changed ? (
                <span className="bg-warning-solid absolute -top-1 -right-1 size-2 rounded-full ring-2 ring-(--background-color-app)" />
              ) : null}
            </HeadlessLink>
          </Tooltip>
        ))}
      </div>
      <span
        className={clsx(
          "flex items-center gap-1 text-xs font-medium whitespace-nowrap tabular-nums",
          changedCount > 0 ? "text-warning-low" : "text-low",
        )}
      >
        {changedCount > 0
          ? `${changedCount} of ${screens.length} changed`
          : plural(screens.length, "screen")}
        <ChevronRightIcon className="text-low size-3.5" />
      </span>
    </li>
  );
}
