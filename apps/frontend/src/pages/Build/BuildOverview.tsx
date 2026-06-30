import { useMemo, useState } from "react";
import { LightBulbIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import {
  ClockIcon,
  ComponentIcon,
  FlaskConicalIcon,
  GitPullRequestArrowIcon,
  ImagesIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
  SunMoonIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Button as RACButton } from "react-aria-components";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";
import {
  BuildMode,
  BuildStatus,
  BuildType,
  DeploymentStatus,
} from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Kbd } from "@/ui/Kbd";
import { Link } from "@/ui/Link";
import { Time } from "@/ui/Time";
import { getBuildDescriptor } from "@/util/build";
import { lowTextColorClassNames, type UIColor } from "@/util/colors";

import { getProjectURL } from "../Project/ProjectParams";
import { useBuildDiffState, useGoToNextDiff } from "./BuildDiffState";
import { useBuildParams } from "./BuildParams";
import { AutomationLibraryIcon } from "./metadata/automationLibrary/AutomationLibraryIcon";
import { BrowserIcon } from "./metadata/browser/BrowserIcon";
import { ReviewActivitySection } from "./sidebar/ReviewActivitySection";

const _BuildFragment = graphql(`
  fragment BuildOverview_Build on Build {
    ...ReviewActivitySection_Build
    id
    type
    status
    mode
    storybook
    createdAt
    baseBranch
    baseBuild {
      id
      number
    }
    stats {
      total
    }
    impactAnalysis {
      changedCount
      uniqueChangeCount
      changedBrowsers
      buildBrowsers
      changedColorSchemes
      buildColorSchemes
      buildViewports
      buildAutomationLibraries
      affectedComponents {
        name
        count
      }
      affectedTests {
        name
        count
      }
    }
    deployment {
      id
      url
      status
      environment
      createdAt
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type ImpactAnalysis = NonNullable<Build["impactAnalysis"]>;

const uiBgColorClassNames: Record<UIColor, string> = {
  primary: "bg-primary-ui",
  info: "bg-info-ui",
  success: "bg-success-ui",
  storybook: "bg-storybook-ui",
  neutral: "bg-ui",
  pending: "bg-pending-ui",
  danger: "bg-danger-ui",
  warning: "bg-warning-ui",
};

export function BuildOverview(props: { build: Build }) {
  const { build } = props;
  const goToFirstDiff = useGoToNextDiff();
  useBuildHotkey("goToNextDiff", goToFirstDiff);
  useBuildHotkey("acceptDiff", goToFirstDiff);
  useBuildHotkey("rejectDiff", goToFirstDiff);
  useBuildHotkey("startReview", goToFirstDiff, {
    ignoreInteractiveTarget: true,
  });
  const analysis = build.impactAnalysis;
  const components = analysis?.affectedComponents ?? [];
  const tests = analysis?.affectedTests ?? [];
  const showComponents = components.length > 0;
  const showTests = !showComponents && tests.length > 0;
  const showDeployment = Boolean(build.deployment) || build.storybook;
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 p-6 lg:flex-row lg:gap-8">
        <main className="flex min-w-0 flex-1 flex-col gap-10">
          <ReviewBriefing build={build} />
          {showComponents ? (
            <AffectedComponentsSection components={components} />
          ) : showTests ? (
            <AffectedTestsSection tests={tests} />
          ) : null}
        </main>
        <aside className="flex shrink-0 flex-col lg:w-96 lg:border-l-thin lg:pl-8">
          <ContextSection build={build} />
          {showDeployment ? (
            <div className="border-t-thin mt-8 pt-8">
              <DeploymentSection build={build} />
            </div>
          ) : null}
          <div className="border-t-thin mt-8 pt-8">
            <ReviewActivitySection build={build} variant="page" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Emphasis(props: { children: React.ReactNode }) {
  return <strong className="text-default font-medium">{props.children}</strong>;
}

/** Small uppercase label introducing a flat section, in the brand accent. */
function SectionHeader(props: { children: React.ReactNode }) {
  return (
    <h2 className="text-primary-low mb-4 text-xs font-semibold tracking-wider uppercase">
      {props.children}
    </h2>
  );
}

/**
 * The takeaway one-liner shown under the title, colored by the build status —
 * what the build means, with an emphasis on baseline eligibility.
 */
function getBuildHeadline(build: Build): string | null {
  if (build.type === BuildType.Reference) {
    return "Used as the baseline for future builds.";
  }
  switch (build.status) {
    case BuildStatus.Accepted:
      return "Approved — now the baseline for future builds.";
    case BuildStatus.Rejected:
      return "Changes were rejected.";
    case BuildStatus.NoChanges:
      return (build.stats?.total ?? 0) > 0
        ? "Everything matches the baseline."
        : null;
    default:
      return null;
  }
}

function ReviewBriefing(props: { build: Build }) {
  const { build } = props;
  const { stats, firstDiff } = useBuildDiffState();
  const goToFirstDiff = useGoToNextDiff();
  const descriptor = getBuildDescriptor(build.type, build.status);
  const isOrphan = build.type === BuildType.Orphan;
  const hasChangesToReview = stats
    ? stats.changed + stats.added + stats.removed + stats.failure > 0
    : false;
  const headline = isOrphan || hasChangesToReview ? null : getBuildHeadline(build);
  const label = isOrphan
    ? "Getting started"
    : hasChangesToReview
      ? "Review briefing"
      : "Build summary";
  const title = isOrphan
    ? "No baseline yet"
    : hasChangesToReview
      ? "Review required"
      : descriptor.label;
  return (
    <section>
      <SectionHeader>{label}</SectionHeader>
      <div className="flex items-center gap-4">
        <div
          className={clsx(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            uiBgColorClassNames[descriptor.color],
            lowTextColorClassNames[descriptor.color],
          )}
        >
          <descriptor.icon className="size-5.5" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {headline ? (
        <p
          className={clsx(
            "mt-3 text-sm font-semibold",
            lowTextColorClassNames[descriptor.color],
          )}
        >
          {headline}
        </p>
      ) : null}
      <div className="text-low mt-3 max-w-xl text-sm text-balance">
        {isOrphan ? (
          <>
            Argos has nothing to compare this build against yet — common on a
            project&apos;s first builds, or when the base branch hasn&apos;t been
            built yet.
          </>
        ) : (
          <BuildStatusDescription build={build} />
        )}
      </div>
      {isOrphan ? (
        <div className="mt-6">
          <OrphanNextSteps build={build} />
        </div>
      ) : hasChangesToReview ? (
        <>
          <ReviewConsequences />
          <ReviewScope
            build={build}
            isDisabled={!firstDiff}
            onStart={() => goToFirstDiff()}
          />
        </>
      ) : (
        <div className="mt-6">
          <Button
            autoFocus
            isDisabled={!firstDiff}
            onPress={() => goToFirstDiff()}
          >
            Browse screenshots
            <Kbd className="ml-2 bg-white/25 text-white">↵</Kbd>
          </Button>
        </div>
      )}
    </section>
  );
}

function ConsequenceList(props: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <props.icon className={clsx("size-4.5", props.iconClassName)} />
        <h3 className="text-sm font-semibold">{props.title}</h3>
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {props.items.map((item) => (
          <li key={item} className="text-low flex items-start gap-2 text-sm">
            <CheckIcon className="text-low mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewConsequences() {
  return (
    <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
      <ConsequenceList
        icon={CircleCheckIcon}
        iconClassName="text-success-low"
        title="Approving this build will"
        items={[
          "Validate the visual changes",
          "Update the approved baseline",
          "Mark the status check as successful",
        ]}
      />
      <ConsequenceList
        icon={CircleXIcon}
        iconClassName="text-danger-low"
        title="Rejecting this build will"
        items={["Keep the current baseline", "Keep the status check failing"]}
      />
    </div>
  );
}

type ReviewDifficulty = {
  label: string;
  timeEstimate: string;
  bars: number;
};

function getReviewDifficulty(uniqueChangeCount: number): ReviewDifficulty {
  if (uniqueChangeCount <= 3) {
    return { label: "Quick review", timeEstimate: "< 2 min", bars: 1 };
  }
  if (uniqueChangeCount <= 15) {
    return { label: "Medium review", timeEstimate: "2–5 min", bars: 2 };
  }
  if (uniqueChangeCount <= 40) {
    return { label: "Heavy review", timeEstimate: "5–15 min", bars: 3 };
  }
  if (uniqueChangeCount <= 80) {
    return { label: "Large review", timeEstimate: "15–30 min", bars: 4 };
  }
  return { label: "Extensive review", timeEstimate: "30+ min", bars: 5 };
}

function DifficultyBars(props: { filled: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            "h-1.5 w-4 rounded-full",
            i < props.filled ? "bg-primary" : "bg-primary-ui",
          )}
        />
      ))}
    </div>
  );
}

function ScopeStat(props: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 first:pl-0">
      <props.icon className="text-primary-low size-5" strokeWidth={1.5} />
      <div className="text-default mt-0.5 text-lg font-bold tabular-nums leading-none">
        {props.value}
      </div>
      <div className="text-low text-xs">{props.label}</div>
    </div>
  );
}

function ReviewScope(props: {
  build: Build;
  isDisabled: boolean;
  onStart: () => void;
}) {
  const { build, isDisabled, onStart } = props;
  const analysis = build.impactAnalysis;
  const componentCount = analysis?.affectedComponents.length ?? 0;
  const testCount = analysis?.affectedTests.length ?? 0;
  const affectedCount = componentCount > 0 ? componentCount : testCount;
  const affectedLabel =
    componentCount > 0 ? "Affected components" : "Affected tests";
  const difficulty = analysis
    ? getReviewDifficulty(analysis.uniqueChangeCount)
    : null;
  return (
    <div className="bg-ui mt-6 rounded-xl p-5">
      <div className="flex items-start gap-0">
        {difficulty ? (
          <div className="border-r-thin flex shrink-0 flex-col gap-2 pr-6">
            <span className="text-primary-low text-xs font-bold tracking-wider uppercase">
              Review scope
            </span>
            <span className="text-default font-bold">{difficulty.label}</span>
            <DifficultyBars filled={difficulty.bars} />
          </div>
        ) : null}
        {analysis ? (
          <div className="divide-x-thin flex flex-1 items-start overflow-x-auto">
            <ScopeStat
              icon={ImagesIcon}
              value={analysis.changedCount}
              label="Screenshots"
            />
            {analysis.uniqueChangeCount > 0 ? (
              <ScopeStat
                icon={SparklesIcon}
                value={analysis.uniqueChangeCount}
                label="Unique changes"
              />
            ) : null}
            {affectedCount > 0 ? (
              <ScopeStat
                icon={ComponentIcon}
                value={affectedCount}
                label={affectedLabel}
              />
            ) : null}
            {difficulty ? (
              <ScopeStat
                icon={ClockIcon}
                value={difficulty.timeEstimate}
                label="Estimated time"
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {failureCount > 0 ? (
        <p className="text-danger-low mt-4 flex items-center gap-2 text-sm">
          <TriangleAlertIcon className="size-4 shrink-0" />
          <span>
            {failureCount} screenshot{failureCount > 1 ? "s" : ""} failed — this
            build can&apos;t be used as a baseline.
          </span>
        </p>
      ) : null}
      <div className="mt-5 flex items-center gap-3">
        <Button autoFocus isDisabled={isDisabled} onPress={onStart}>
          Start review
          <ArrowRightIcon className="ml-1 size-4" />
        </Button>
        <span className="text-low flex items-center gap-1.5 text-xs">
          <Kbd>R</Kbd>
          Shortcut
        </span>
      </div>
    </div>
  );
}

const COLLAPSED_ITEM_COUNT = 5;

/**
 * Strip the leading and trailing words shared by every name so only the
 * distinguishing part remains. Parameterized tests often share boilerplate
 * (e.g. `"<x>" page should match visual baseline`); this surfaces just `"<x>"`.
 * Trims whole words only and bails out if it would empty any name.
 */
function stripCommonWords(names: string[]): string[] {
  if (names.length < 2) {
    return names;
  }
  const rows = names.map((name) => name.split(" "));
  const minLength = Math.min(...rows.map((row) => row.length));
  let prefix = 0;
  while (
    prefix < minLength &&
    rows.every((row) => row[prefix] === rows[0]![prefix])
  ) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < minLength - prefix &&
    rows.every(
      (row) =>
        row[row.length - 1 - suffix] === rows[0]![rows[0]!.length - 1 - suffix],
    )
  ) {
    suffix++;
  }
  if (prefix === 0 && suffix === 0) {
    return names;
  }
  const trimmed = rows.map((row) =>
    row.slice(prefix, row.length - suffix).join(" "),
  );
  return trimmed.some((name) => name === "") ? names : trimmed;
}

/**
 * Flat list of entities impacted by the build's visual changes (Storybook
 * components or end-to-end tests), most affected first. Collapsed to the most
 * affected ones by default since each name takes a full row.
 */
function AffectedItemsSection(props: {
  items: ImpactAnalysis["affectedComponents"];
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  seeAllLabel: (count: number) => string;
  /** Strip the prefix/suffix shared by all names (useful for test titles). */
  trimNames?: boolean;
}) {
  const { items, trimNames } = props;
  const [expanded, setExpanded] = useState(false);
  const collapsible = items.length > COLLAPSED_ITEM_COUNT + 1;
  const visibleItems =
    collapsible && !expanded ? items.slice(0, COLLAPSED_ITEM_COUNT) : items;
  // Computed over all items (not just the visible ones) so the trimmed labels
  // stay stable when the list is expanded.
  const displayNames = useMemo(
    () =>
      trimNames
        ? stripCommonWords(items.map((item) => item.name))
        : items.map((item) => item.name),
    [items, trimNames],
  );
  return (
    <section>
      <SectionHeader>{props.title}</SectionHeader>
      <ul className="flex flex-col">
        {visibleItems.map((item, index) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-3 border-b py-3 first:pt-0 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-primary-ui text-primary-low flex size-8 shrink-0 items-center justify-center rounded-lg">
                <props.icon className="size-4" strokeWidth={1.75} />
              </div>
              <span
                className="text-default min-w-0 truncate text-sm font-semibold"
                title={item.name}
              >
                {displayNames[index]}
              </span>
              {index === 0 && items.length > 1 ? (
                <span className="bg-primary-ui text-primary-low shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                  Most impacted
                </span>
              ) : null}
            </div>
            <span className="text-low shrink-0 text-sm tabular-nums">
              {item.count} screenshot{item.count > 1 ? "s" : ""}
            </span>
          </li>
        ))}
      </ul>
      {collapsible ? (
        <RACButton
          onPress={() => setExpanded((value) => !value)}
          className="rac-focus text-low data-hovered:text-default mt-3 cursor-default text-left text-sm font-medium transition"
        >
          {expanded ? "Show less" : props.seeAllLabel(items.length)}
        </RACButton>
      ) : null}
    </section>
  );
}

function AffectedComponentsSection(props: {
  components: ImpactAnalysis["affectedComponents"];
}) {
  return (
    <AffectedItemsSection
      items={props.components}
      icon={ComponentIcon}
      title="Affected components"
      seeAllLabel={(count) => `View all ${count} components`}
    />
  );
}

function AffectedTestsSection(props: {
  tests: ImpactAnalysis["affectedTests"];
}) {
  return (
    <AffectedItemsSection
      items={props.tests}
      icon={FlaskConicalIcon}
      title="Affected tests"
      seeAllLabel={(count) => `View all ${count} tests`}
      trimNames
    />
  );
}

function GuidanceStep(props: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="bg-info-ui text-info-low flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
        {props.index}
      </span>
      <span className="text-low min-w-0 flex-1 text-balance">
        {props.children}
      </span>
    </li>
  );
}

/**
 * Onboarding guidance shown in the briefing of an orphan build — a build with
 * no baseline to compare against (typically a project's first builds), since
 * setting up a baseline is the main expected action. Replaces the former modal.
 */
function OrphanNextSteps(props: { build: Build }) {
  const { build } = props;
  const params = useBuildParams();
  if (build.mode === BuildMode.Monitoring) {
    return (
      <div className="max-w-xl">
        <h3 className="text-default mb-3 text-sm font-semibold">Next step</h3>
        <p className="text-low text-sm text-balance">
          Approve this build to use it as the <Emphasis>baseline</Emphasis> for
          future comparisons.
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-xl">
      <h3 className="text-default mb-3 text-sm font-semibold">Next steps</h3>
      <ol className="flex flex-col gap-3 text-sm">
        <GuidanceStep index={1}>
          <Emphasis>Build your comparison baseline.</Emphasis> Run Argos in CI on
          your baseline branch so it records a baseline.
        </GuidanceStep>
        <GuidanceStep index={2}>
          <Emphasis>Open a pull request.</Emphasis> Following builds will
          automatically compare against that baseline.
        </GuidanceStep>
      </ol>
      <p className="text-low mt-4 text-sm">
        {params ? (
          <>
            <LightBulbIcon className="text-low mr-2 inline-block size-4" />
            You can configure baseline branch in the{" "}
            <Link href={`${getProjectURL(params)}/settings/baseline-builds`}>
              project settings
            </Link>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}

const browserLabels: Record<string, string> = {
  chrome: "Chrome",
  chromium: "Chromium",
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari",
  webkit: "WebKit",
};

function getBrowserLabel(browser: string): string {
  return (
    browserLabels[browser.toLowerCase()] ??
    browser.charAt(0).toUpperCase() + browser.slice(1)
  );
}

const automationLibraryLabels: Record<string, string> = {
  storybook: "Storybook",
  "@storybook/test-runner": "Storybook",
  "@storybook/addon-vitest": "Storybook",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  "playwright-core": "Playwright",
  cypress: "Cypress",
  puppeteer: "Puppeteer",
  webdriverio: "WebdriverIO",
  selenium: "Selenium",
};

function getAutomationLibraryLabel(library: string): string {
  return (
    automationLibraryLabels[library.toLowerCase()] ??
    library.charAt(0).toUpperCase() + library.slice(1)
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Single icon representing the color schemes covered by the build. */
function ColorSchemeIcon(props: {
  colorSchemes: string[];
  className?: string;
}) {
  const { colorSchemes, className } = props;
  const Icon =
    colorSchemes.length === 1
      ? colorSchemes[0] === "dark"
        ? MoonIcon
        : SunIcon
      : SunMoonIcon;
  return <Icon className={className} />;
}

const deploymentStatusChips: Record<
  DeploymentStatus,
  { label: string; color: "success" | "pending" | "danger" }
> = {
  [DeploymentStatus.Ready]: { label: "Deployed", color: "success" },
  [DeploymentStatus.Pending]: { label: "Deploying", color: "pending" },
  [DeploymentStatus.Error]: { label: "Failed", color: "danger" },
};

function DefinitionRow(props: {
  label: string;
  labelIcon?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-center gap-4 text-sm">
      <span className="text-low flex items-center gap-1.5">
        {props.labelIcon ? (
          <span className="flex size-3.5 shrink-0 items-center justify-center">
            {props.labelIcon}
          </span>
        ) : null}
        {props.label}
      </span>
      <span className="text-default flex min-w-0 items-center gap-2 font-medium">
        {props.icon ? (
          <span className="flex size-4 shrink-0 items-center justify-center">
            {props.icon}
          </span>
        ) : null}
        <span className="min-w-0 truncate">{props.children}</span>
      </span>
    </div>
  );
}

function ContextSection(props: { build: Build }) {
  const { build } = props;
  const { baseBranch, baseBuild, impactAnalysis: analysis } = build;
  const browsers = analysis?.buildBrowsers ?? [];
  const viewports = analysis?.buildViewports ?? [];
  const colorSchemes = analysis?.buildColorSchemes ?? [];
  const automationLibraries = analysis?.buildAutomationLibraries ?? [];
  const frameworkName =
    automationLibraries[0] ?? (build.storybook ? "storybook" : null);
  const frameworkLabel =
    automationLibraries.length > 0
      ? automationLibraries.map(getAutomationLibraryLabel).join(", ")
      : build.storybook
        ? "Storybook"
        : null;
  return (
    <section>
      <SectionHeader>Context</SectionHeader>
      <div className="flex flex-col gap-3.5">
        {frameworkLabel && frameworkName ? (
          <DefinitionRow
            label="Framework"
            labelIcon={<ComponentIcon className="text-low size-3.5" />}
            icon={
              <AutomationLibraryIcon
                name={frameworkName}
                className="text-low size-4 shrink-0"
              />
            }
          >
            {frameworkLabel}
          </DefinitionRow>
        ) : null}
        {browsers.length > 0 ? (
          <DefinitionRow
            label="Browser"
            labelIcon={<GlobeIcon className="text-low size-3.5" />}
            icon={
              <BrowserIcon
                browser={{ name: browsers[0]! }}
                className="size-4 shrink-0"
              />
            }
          >
            {browsers.map(getBrowserLabel).join(", ")}
          </DefinitionRow>
        ) : null}
        {viewports.length > 0 ? (
          <DefinitionRow
            label="Viewports"
            labelIcon={<MonitorSmartphoneIcon className="text-low size-3.5" />}
            icon={<MonitorSmartphoneIcon className="text-low size-4" />}
          >
            {viewports.join(", ")}
          </DefinitionRow>
        ) : null}
        {colorSchemes.length > 0 ? (
          <DefinitionRow
            label="Color schemes"
            labelIcon={
              <ColorSchemeIcon
                colorSchemes={colorSchemes}
                className="text-low size-3.5"
              />
            }
            icon={
              <ColorSchemeIcon
                colorSchemes={colorSchemes}
                className="text-low size-4"
              />
            }
          >
            {colorSchemes.map(capitalize).join(", ")}
          </DefinitionRow>
        ) : null}
        {build.stats ? (
          <DefinitionRow
            label="Screenshots"
            labelIcon={<ImagesIcon className="text-low size-3.5" />}
            icon={<ImagesIcon className="text-low size-4" />}
          >
            <span className="tabular-nums">{build.stats.total}</span>
          </DefinitionRow>
        ) : null}
        {build.type === BuildType.Orphan ? (
          <DefinitionRow
            label="Compared to"
            labelIcon={<GitPullRequestArrowIcon className="text-low size-3.5" />}
            icon={<GitPullRequestArrowIcon className="text-low size-4" />}
          >
            <span className="text-low">No baseline yet</span>
          </DefinitionRow>
        ) : baseBranch || baseBuild ? (
          <DefinitionRow
            label="Compared to"
            labelIcon={<GitPullRequestArrowIcon className="text-low size-3.5" />}
            icon={<GitPullRequestArrowIcon className="text-low size-4" />}
          >
            {baseBranch ?? `Build #${baseBuild!.number}`}
            {baseBranch && baseBuild ? (
              <span className="text-low"> · #{baseBuild.number}</span>
            ) : null}
          </DefinitionRow>
        ) : null}
        <DefinitionRow
          label="Created"
          labelIcon={<ClockIcon className="text-low size-3.5" />}
          icon={<ClockIcon className="text-low size-4" />}
        >
          <Time date={build.createdAt} />
        </DefinitionRow>
      </div>
    </section>
  );
}

function DeploymentSection(props: { build: Build }) {
  const { deployment } = props.build;
  return (
    <section>
      <SectionHeader>Deployment</SectionHeader>
      {deployment ? (
        <div className="flex flex-col items-start gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Chip
              scale="xs"
              color={deploymentStatusChips[deployment.status].color}
            >
              {deploymentStatusChips[deployment.status].label}
            </Chip>
            <span className="text-low">
              {deployment.environment === "production"
                ? "Production"
                : "Preview"}
            </span>
          </div>
          <div className="max-w-full min-w-0 truncate">
            <Link href={deployment.url} target="_blank">
              {deployment.url}
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-sm">
          <Link
            href="https://argos-ci.com/docs/learn/deployments"
            target="_blank"
          >
            Set up Storybook deployments
          </Link>
        </p>
      )}
    </section>
  );
}
