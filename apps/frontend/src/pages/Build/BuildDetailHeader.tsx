import { memo } from "react";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { useFeature } from "@bucketco/react-sdk";
import { generatePath, Link, useMatch } from "react-router-dom";

import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { BuildType, ScreenshotDiffStatus } from "@/gql/graphql";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Separator } from "@/ui/Separator";
import { Tooltip } from "@/ui/Tooltip";
import { canParseURL } from "@/util/url";

import { useProjectParams } from "../Project/ProjectParams";
import { getTestURL } from "../Test/TestParams";
import {
  checkCanBeReviewed,
  Diff,
  useGoToNextDiff,
  useGoToPreviousDiff,
  useHasNextDiff,
  useHasPreviousDiff,
} from "./BuildDiffState";
import { AutomationLibraryIndicator } from "./metadata/automationLibrary/AutomationLibraryIndicator";
import {
  BrowserIndicator,
  BrowserIndicatorLink,
} from "./metadata/browser/BrowserIndicator";
import { ColorSchemeIndicator } from "./metadata/ColorSchemeIndicator";
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
  const colorScheme = metadata?.colorScheme ?? null;
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
    buildType !== BuildType.Reference && checkCanBeReviewed(diff.status);
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

  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");

  const testDetailsFeature = useFeature("test-details");

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BuildNavButtons />
        <div className="min-w-0 flex-1">
          {diff.test && testDetailsFeature.isEnabled ? (
            <div className="flex items-center gap-2">
              <Tooltip content="View test details">
                <Link
                  to={getTestURL(
                    { ...params, testId: diff.test.id },
                    { change: diff.changeId },
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
        <BuildDiffDetailToolbar diff={diff}>
          <TrackButtons
            diff={diff}
            disabled={!canBeReviewed}
            render={({ children }) => (
              <>
                <Separator orientation="vertical" className="mx-1 !h-6" />
                <div className="flex gap-1.5">{children}</div>
              </>
            )}
          />
        </BuildDiffDetailToolbar>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 empty:hidden">
        {/* {diff.test ? (
          <BuildFlakyIndicator
            accountSlug={params.accountSlug}
            projectName={params.projectName}
            diff={diff}
          />
        ) : null} */}
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
        {colorScheme && (
          <ColorSchemeIndicator colorScheme={colorScheme} className="size-4" />
        )}
        {mediaType && (
          <MediaTypeIndicator mediaType={mediaType} className="size-4" />
        )}
        {url && canParseURL(url) ? (
          <UrlIndicator
            url={url}
            previewUrl={previewUrl}
            isStorybook={automationLibrary?.name === "@storybook/test-runner"}
          />
        ) : null}
        {test && (
          <TestIndicator test={test} branch={branch} repoUrl={repoUrl} />
        )}
        {pwTraceUrl ? (
          <TraceIndicator pwTraceUrl={pwTraceUrl} />
        ) : siblingTrace ? (
          <TraceIndicator {...siblingTrace} />
        ) : null}
      </div>
    </div>
  );
});

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
