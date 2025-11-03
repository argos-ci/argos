import { memo } from "react";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { generatePath, Link, useMatch } from "react-router-dom";

import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import { BuildFlakyIndicator } from "@/containers/Build/BuildFlakyIndicator";
import { AriaSnapshotToggle } from "@/containers/Build/toolbar/AriaSnapshotToggle";
import { IgnoreButton } from "@/containers/Build/toolbar/IgnoreButton";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import {
  BuildType,
  ScreenshotDiffStatus,
  ScreenshotMetadataColorScheme,
} from "@/gql/graphql";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";
import { canParseURL } from "@/util/url";

import { useProjectParams } from "../Project/ProjectParams";
import { getTestURL } from "../Test/TestParams";
import {
  checkDiffCanBeReviewed,
  Diff,
  useGoToNextDiff,
  useGoToPreviousDiff,
  useHasNextDiff,
  useHasPreviousDiff,
} from "./BuildDiffState";
import {
  EvaluationStatus,
  useAcknowledgeMarkedDiff,
  useBuildDiffStatusState,
} from "./BuildReviewState";
import { AnnotationIndicator } from "./metadata/AnnotationIndicator";
import { AutomationLibraryIndicator } from "./metadata/automationLibrary/AutomationLibraryIndicator";
import {
  BrowserIndicator,
  BrowserIndicatorLink,
} from "./metadata/browser/BrowserIndicator";
import {
  ColorSchemeIndicator,
  ColorSchemeIndicatorLink,
} from "./metadata/ColorSchemeIndicator";
import { MediaTypeIndicator } from "./metadata/MediaTypeIndicator";
import { RepeatIndicator } from "./metadata/RepeatIndicator";
import { RetryIndicator } from "./metadata/RetryIndicator";
import { SdkIndicator } from "./metadata/SdkIndicator";
import { TestIndicator } from "./metadata/TestIndicator";
import { ThresholdIndicator } from "./metadata/ThresholdIndicator";
import { TraceIndicator } from "./metadata/TraceIndicator";
import { UrlIndicator } from "./metadata/UrlIndicator";
import {
  ViewportIndicator,
  ViewportIndicatorLink,
} from "./metadata/ViewportIndicator";
import { TrackButtons } from "./TrackButtons";

export const BuildDetailHeader = memo(function BuildDetailHeader(props: {
  diff: Diff;
  siblingDiffs: Diff[];
  repoUrl: string | null;
  baseBranch: string | null;
  compareBranch: string | null | undefined;
  prMerged: boolean;
  buildType: BuildType | null;
}) {
  const {
    diff,
    siblingDiffs,
    baseBranch,
    compareBranch,
    repoUrl,
    prMerged,
    buildType,
  } = props;
  const metadata = resolveDiffMetadata(diff);
  const automationLibrary = metadata?.automationLibrary ?? null;
  const sdk = metadata?.sdk ?? null;
  const url = metadata?.url ?? null;
  const previewUrl = metadata?.previewUrl ?? null;
  const mediaType = metadata?.mediaType ?? null;
  const test = metadata?.test ?? null;
  const retry = test?.retry ?? null;
  const retries = test?.retries ?? null;
  const repeat = test?.repeat ?? null;
  const threshold = diff.threshold ?? null;
  const branch =
    prMerged || test === diff.baseScreenshot?.metadata?.test
      ? baseBranch
      : compareBranch;
  const pwTraceUrl = diff.compareScreenshot?.playwrightTraceUrl ?? null;
  const canBeReviewed =
    buildType !== BuildType.Reference && checkDiffCanBeReviewed(diff.status);
  // Determine a sibling trace to show if the current trace is missing.
  const siblingTrace = (() => {
    if (pwTraceUrl) {
      return null;
    }
    const sibling = siblingDiffs.find(
      (diff) => diff.compareScreenshot?.playwrightTraceUrl,
      [],
    );
    if (!sibling) {
      return null;
    }
    const siblingPwTraceUrl = sibling?.compareScreenshot?.playwrightTraceUrl;
    invariant(siblingPwTraceUrl, "Already filtered");
    return {
      pwTraceUrl: siblingPwTraceUrl,
      retry: resolveDiffMetadata(sibling)?.test?.retry ?? undefined,
    };
  })();

  const getDiffPath = useGetDiffPath();
  const siblingMetadataList = siblingDiffs
    .map(resolveDiffMetadata)
    .filter(checkIsNonNullable);

  const browsers = getUniqueBrowsers(siblingMetadataList);
  const activeBrowserKey = metadata?.browser
    ? hashBrowser(metadata.browser)
    : null;
  const activeBrowserIndex = browsers.findIndex(
    (b) => hashBrowser(b) === activeBrowserKey,
  );

  const viewports = getUniqueViewports(siblingMetadataList);
  const activeViewportKey = metadata?.viewport
    ? hashViewport(metadata.viewport)
    : null;
  const activeViewportIndex = viewports.findIndex(
    (v) => hashViewport(v) === activeViewportKey,
  );

  const colorSchemes = getUniqueColorSchemes(siblingMetadataList);
  const activeColorScheme = resolveColorScheme(metadata);

  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BuildNavButtons />
        <div className="min-w-0 flex-1">
          {diff.test && diff.change ? (
            <div className="flex items-center gap-2">
              <Tooltip content="View test details">
                <Link
                  to={getTestURL(
                    { ...params, testId: diff.test.id },
                    { change: diff.change.id },
                  )}
                  className="hover:underline"
                >
                  <span
                    role="heading"
                    aria-level={1}
                    className="line-clamp-2 text-sm font-medium"
                  >
                    {diff.name}
                  </span>
                </Link>
              </Tooltip>
            </div>
          ) : (
            <div role="heading" className="line-clamp-2 text-xs font-medium">
              {diff.name}
            </div>
          )}
        </div>
        <BuildDiffDetailToolbar
          diff={diff}
          fitControls={<AriaSnapshotToggle />}
        >
          <BuildDetailIgnoreButton diff={diff} />
          <TrackButtons diff={diff} disabled={!canBeReviewed} />
        </BuildDiffDetailToolbar>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 empty:hidden">
        {diff.test && diff.change ? (
          <BuildFlakyIndicator
            accountSlug={params.accountSlug}
            projectName={params.projectName}
            diff={diff}
          />
        ) : null}
        {sdk && <SdkIndicator sdk={sdk} className="size-4" />}
        {automationLibrary && (
          <AutomationLibraryIndicator
            automationLibrary={automationLibrary}
            className="size-4"
          />
        )}
        {browsers.length > 0 && (
          <ButtonGroup>
            {browsers.map((browser, index) => {
              const key = hashBrowser(browser);

              if (browsers.length === 1) {
                return (
                  <BrowserIndicator
                    key={key}
                    browser={browser}
                    className="size-4"
                  />
                );
              }

              const isActive = activeBrowserKey === key;
              const isNextActive =
                (activeBrowserIndex + 1) % browsers.length === index;
              const resolvedDiff = isActive
                ? diff
                : siblingDiffs.find((diff) => {
                    const metadata = resolveDiffMetadata(diff);
                    return (
                      metadata?.browser && hashBrowser(metadata.browser) === key
                    );
                  });
              invariant(resolvedDiff, "diff cannot be null");
              return (
                <BrowserIndicatorLink
                  key={key}
                  browser={browser}
                  className="size-4"
                  aria-current={activeBrowserKey === key ? "page" : undefined}
                  href={getDiffPath(resolvedDiff.id) ?? ""}
                  shortcutEnabled={isNextActive}
                />
              );
            })}
          </ButtonGroup>
        )}
        {viewports.length > 0 && (
          <ButtonGroup>
            {viewports.map((viewport, index) => {
              const key = hashViewport(viewport);

              if (viewports.length === 1) {
                return <ViewportIndicator key={key} viewport={viewport} />;
              }

              const isActive = activeViewportKey === key;
              const isNextActive =
                (activeViewportIndex + 1) % viewports.length === index;
              const resolvedDiff = isActive
                ? diff
                : siblingDiffs.find((diff) => {
                    const metadata = resolveDiffMetadata(diff);
                    return (
                      metadata?.viewport &&
                      hashViewport(metadata.viewport) === key
                    );
                  });

              invariant(resolvedDiff, "diff cannot be null");

              return (
                <ViewportIndicatorLink
                  key={key}
                  viewport={viewport}
                  aria-current={isActive ? "page" : undefined}
                  href={getDiffPath(resolvedDiff.id) ?? ""}
                  shortcutEnabled={isNextActive}
                />
              );
            })}
          </ButtonGroup>
        )}
        {threshold !== null && <ThresholdIndicator threshold={threshold} />}
        {retry !== null && retries !== null && retries > 0 && (
          <RetryIndicator retry={retry} retries={retries} />
        )}
        {repeat !== null && repeat > 0 && (
          <RepeatIndicator
            repeat={repeat}
            isPlaywright={automationLibrary?.name === "@playwright/test"}
          />
        )}
        {colorSchemes.includes(ScreenshotMetadataColorScheme.Dark) && (
          <ButtonGroup>
            {colorSchemes.map((colorScheme) => {
              if (colorSchemes.length === 1) {
                return (
                  <ColorSchemeIndicator
                    key={colorScheme}
                    colorScheme={colorScheme}
                  />
                );
              }

              const isActive = activeColorScheme === colorScheme;
              const resolvedDiff = isActive
                ? diff
                : siblingDiffs.find((diff) => {
                    const metadata = resolveDiffMetadata(diff);
                    return resolveColorScheme(metadata) === colorScheme;
                  });

              invariant(resolvedDiff, "diff cannot be null");

              return (
                <ColorSchemeIndicatorLink
                  key={colorScheme}
                  colorScheme={colorScheme}
                  aria-current={isActive ? "page" : undefined}
                  href={getDiffPath(resolvedDiff.id) ?? ""}
                />
              );
            })}
          </ButtonGroup>
        )}
        {mediaType && (
          <MediaTypeIndicator mediaType={mediaType} className="size-4" />
        )}
        {url && canParseURL(url) ? (
          <UrlIndicator
            url={url}
            previewUrl={previewUrl}
            isStorybook={
              automationLibrary?.name.startsWith("@storybook/") ?? false
            }
          />
        ) : null}
        {test && (
          <TestIndicator test={test} branch={branch} repoUrl={repoUrl} />
        )}
        {test?.annotations?.map((annotation, index) => (
          <AnnotationIndicator
            key={index}
            annotation={annotation}
            repoUrl={repoUrl}
          />
        ))}
        {pwTraceUrl ? (
          <TraceIndicator pwTraceUrl={pwTraceUrl} />
        ) : siblingTrace ? (
          <TraceIndicator {...siblingTrace} />
        ) : null}
      </div>
    </div>
  );
});

function BuildDetailIgnoreButton(props: { diff: Diff }) {
  const { diff } = props;

  const [status, setStatus] = useBuildDiffStatusState({
    diffId: diff.id,
    diffGroup: diff.group ?? null,
  });
  const [checkIsPending, acknowledge] = useAcknowledgeMarkedDiff();

  const handleIgnoreChange = useEventCallback(() => {
    if (checkIsPending()) {
      return;
    }

    if (status === EvaluationStatus.Pending) {
      setStatus(EvaluationStatus.Accepted);
      acknowledge();
    }
  });

  return <IgnoreButton diff={diff} onIgnoreChange={handleIgnoreChange} />;
}

const BuildNavButtons = memo(function BuildNavButtons() {
  const goToNextDiff = useGoToNextDiff();
  const hasNextDiff = useHasNextDiff();
  const goToPreviousDiff = useGoToPreviousDiff();
  const hasPreviousDiff = useHasPreviousDiff();
  return (
    <div className="flex shrink-0 gap-1">
      <PreviousButton
        onPress={goToPreviousDiff}
        isDisabled={!hasPreviousDiff}
      />
      <NextButton onPress={goToNextDiff} isDisabled={!hasNextDiff} />
    </div>
  );
});

type Metadata = NonNullable<NonNullable<Diff["baseScreenshot"]>["metadata"]>;
type MetadataBrowser = NonNullable<Metadata["browser"]>;
type MetadataViewport = NonNullable<Metadata["viewport"]>;

/**
 * Get a function to generate a diff path.
 */
function useGetDiffPath() {
  const path = "/:accountSlug/:projectName/builds/:buildNumber/:diffId";
  const match = useMatch(path);
  return (diffId: string) => {
    if (!match) {
      return null;
    }
    const { accountSlug, projectName, buildNumber } = match.params;
    if (!accountSlug || !projectName || !buildNumber) {
      return null;
    }
    return generatePath(path, {
      accountSlug,
      projectName,
      buildNumber,
      diffId,
    });
  };
}

/**
 * Get a list of unique viewports from a list of metadata.
 */
function getUniqueViewports(metadataList: Metadata[]): MetadataViewport[] {
  const hashes = new Set<string>();
  const viewports = metadataList.reduce<MetadataViewport[]>(
    (viewports, metadata) => {
      if (!metadata?.viewport) {
        return viewports;
      }
      const hash = hashViewport(metadata.viewport);
      if (hashes.has(hash)) {
        return viewports;
      }
      hashes.add(hash);
      viewports.push(metadata.viewport);
      return viewports;
    },
    [],
  );
  return viewports.sort((a, b) => a.width - b.width);
}

/**
 * Get a list of unique browsers from a list of metadata.
 */
function getUniqueBrowsers(metadataList: Metadata[]): MetadataBrowser[] {
  const hashes = new Set<string>();
  return metadataList.reduce<MetadataBrowser[]>((browsers, metadata) => {
    if (!metadata?.browser) {
      return browsers;
    }
    const hash = hashBrowser(metadata.browser);
    if (hashes.has(hash)) {
      return browsers;
    }
    hashes.add(hash);
    browsers.push(metadata.browser);
    return browsers;
  }, []);
}

/**
 * Get a list of unique color schemes from a list of metadata.
 */
function getUniqueColorSchemes(
  metadataList: Metadata[],
): ScreenshotMetadataColorScheme[] {
  return Array.from(new Set(metadataList.map(resolveColorScheme)));
}

/**
 * Resolve the color scheme from metadata.
 */
function resolveColorScheme(metadata: Metadata | null) {
  return metadata?.colorScheme ?? ScreenshotMetadataColorScheme.Light;
}

/**
 * Hash a viewport object.
 */
function hashViewport(viewport: MetadataViewport): string {
  return `${viewport.width}x${viewport.height}`;
}

/**
 * Hash a browser object.
 */
function hashBrowser(browser: MetadataBrowser): string {
  return `${browser.name} ${browser.version}`;
}

function resolveDiffMetadata(diff: Diff) {
  return (
    (diff.status === ScreenshotDiffStatus.Removed
      ? diff.baseScreenshot?.metadata
      : diff.compareScreenshot?.metadata) ?? null
  );
}
