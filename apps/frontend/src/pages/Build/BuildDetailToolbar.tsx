import { memo } from "react";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { generatePath, useMatch } from "react-router-dom";

import { BuildType, ScreenshotDiffStatus } from "@/gql/graphql";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Separator } from "@/ui/Separator";

import { checkCanBeReviewed, Diff } from "./BuildDiffState";
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
import { FitToggle } from "./toolbar/FitToggle";
import { NextButton, PreviousButton } from "./toolbar/NavButtons";
import { OverlayToggle } from "./toolbar/OverlayToggle";
import { SettingsButton } from "./toolbar/SettingsButton";
import { TrackButtons } from "./toolbar/TrackButtons";
import { SplitViewToggle, ViewToggle } from "./toolbar/ViewToggle";

export const BuildDetailToolbar = memo(function BuildDetailToolbar({
  activeDiff,
  siblingDiffs,
  baseBranch,
  compareBranch,
  bordered,
  repoUrl,
  prMerged,
  buildType,
}: {
  activeDiff: Diff;
  siblingDiffs: Diff[];
  bordered: boolean;
  repoUrl: string | null;
  baseBranch: string | null;
  compareBranch: string | null | undefined;
  prMerged: boolean;
  buildType: BuildType | null;
}) {
  const metadata = resolveDiffMetadata(activeDiff);
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
  const threshold = activeDiff.threshold ?? null;
  const branch =
    prMerged || test === activeDiff.baseScreenshot?.metadata?.test
      ? baseBranch
      : compareBranch;
  const pwTraceUrl = activeDiff.compareScreenshot?.playwrightTraceUrl ?? null;
  const canBeReviewed =
    buildType !== BuildType.Reference && checkCanBeReviewed(activeDiff.status);
  const isChanged = activeDiff.status === ScreenshotDiffStatus.Changed;
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

  return (
    <div
      className={clsx(
        "sticky top-0 z-20 flex shrink-0 items-start justify-between gap-4 border-b p-4 transition-colors has-[[data-meta]:empty]:items-center",
        !bordered && "border-b-transparent",
      )}
    >
      <div className="flex shrink-0 gap-1">
        <PreviousButton />
        <NextButton />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 flex-1">
          <div role="heading" className="line-clamp-2 text-xs font-medium">
            {activeDiff.name}
          </div>
          <div
            data-meta=""
            className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 empty:hidden"
          >
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
                  const diff = isActive
                    ? activeDiff
                    : siblingDiffs.find((diff) => {
                        const metadata = resolveDiffMetadata(diff);
                        return (
                          metadata?.browser &&
                          hashBrowser(metadata.browser) === key
                        );
                      });
                  invariant(diff, "diff cannot be null");
                  return (
                    <BrowserIndicatorLink
                      key={key}
                      browser={browser}
                      className="size-4"
                      aria-current={
                        activeBrowserKey === key ? "page" : undefined
                      }
                      href={getDiffPath(diff.id) ?? ""}
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
                  const diff = isActive
                    ? activeDiff
                    : siblingDiffs.find((diff) => {
                        const metadata = resolveDiffMetadata(diff);
                        return (
                          metadata?.viewport &&
                          hashViewport(metadata.viewport) === key
                        );
                      });

                  invariant(diff, "diff cannot be null");

                  return (
                    <ViewportIndicatorLink
                      key={key}
                      viewport={viewport}
                      aria-current={isActive ? "page" : undefined}
                      href={getDiffPath(diff.id) ?? ""}
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
              <ColorSchemeIndicator
                colorScheme={colorScheme}
                className="size-4"
              />
            )}
            {mediaType && (
              <MediaTypeIndicator mediaType={mediaType} className="size-4" />
            )}
            {url && checkIsValidURL(url) ? (
              <UrlIndicator
                url={url}
                previewUrl={previewUrl}
                isStorybook={
                  automationLibrary?.name === "@storybook/test-runner"
                }
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
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <ViewToggle />
        <SplitViewToggle />
        <FitToggle />
        {isChanged && (
          <>
            <Separator orientation="vertical" className="mx-1 !h-6" />
            <OverlayToggle />
            <SettingsButton />
          </>
        )}
        <TrackButtons
          diff={activeDiff}
          disabled={!canBeReviewed}
          render={({ children }) => (
            <>
              <Separator orientation="vertical" className="mx-1 !h-6" />
              <div className="flex gap-1">{children}</div>
            </>
          )}
        />
      </div>
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

/**
 * Check if a URL can be parsed.
 */
function checkIsValidURL(url: string) {
  // If browser does not support URL, return false.
  if (typeof URL !== "function") {
    return false;
  }
  // If browser does not support URL.canParse, try to parse the URL.
  if (typeof URL.canParse !== "function") {
    try {
      new URL(url);
    } catch {
      return false;
    }
  }
  return URL.canParse(url);
}

function resolveDiffMetadata(diff: Diff) {
  return (
    (diff.status === ScreenshotDiffStatus.Removed
      ? diff.baseScreenshot?.metadata
      : diff.compareScreenshot?.metadata) ?? null
  );
}
