import { memo } from "react";
import { clsx } from "clsx";

import { BuildType } from "@/gql/graphql";
import { Separator } from "@/ui/Separator";

import { checkCanBeReviewed, Diff } from "./BuildDiffState";
import { AutomationLibraryIndicator } from "./metadata/automationLibrary/AutomationLibraryIndicator";
import { BrowserIndicator } from "./metadata/browser/BrowserIndicator";
import { ColorSchemeIndicator } from "./metadata/ColorSchemeIndicator";
import { MediaTypeIndicator } from "./metadata/MediaTypeIndicator";
import { RepeatIndicator } from "./metadata/RepeatIndicator";
import { RetryIndicator } from "./metadata/RetryIndicator";
import { SdkIndicator } from "./metadata/SdkIndicator";
import { TestIndicator } from "./metadata/TestIndicator";
import { ThresholdIndicator } from "./metadata/ThresholdIndicator";
import { TraceIndicator } from "./metadata/TraceIndicator";
import { UrlIndicator } from "./metadata/UrlIndicator";
import { ViewportIndicator } from "./metadata/ViewportIndicator";
import { FitToggle } from "./toolbar/FitToggle";
import { NextButton, PreviousButton } from "./toolbar/NavButtons";
import { OverlayToggle } from "./toolbar/OverlayToggle";
import { SettingsButton } from "./toolbar/SettingsButton";
import { TrackButtons } from "./toolbar/TrackButtons";
import { SplitViewToggle, ViewToggle } from "./toolbar/ViewToggle";

export const BuildDetailToolbar = memo(function BuildDetailToolbar({
  activeDiff,
  baseBranch,
  compareBranch,
  bordered,
  repoUrl,
  prMerged,
  buildType,
}: {
  activeDiff: Diff;
  bordered: boolean;
  repoUrl: string | null;
  baseBranch: string | null;
  compareBranch: string | null | undefined;
  prMerged: boolean;
  buildType: BuildType | null;
}) {
  const metadata =
    activeDiff.compareScreenshot?.metadata ??
    activeDiff.baseScreenshot?.metadata;
  const automationLibrary = metadata?.automationLibrary ?? null;
  const browser = metadata?.browser ?? null;
  const sdk = metadata?.sdk ?? null;
  const viewport = metadata?.viewport ?? null;
  const url = metadata?.url ?? null;
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
  const playwrightTraceUrl =
    activeDiff.compareScreenshot?.playwrightTraceUrl ?? null;
  const canBeReviewed =
    buildType !== BuildType.Reference && checkCanBeReviewed(activeDiff.status);
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
            {browser && (
              <BrowserIndicator browser={browser} className="size-4" />
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
            {viewport && <ViewportIndicator viewport={viewport} />}
            {url && (
              <UrlIndicator
                url={url}
                isStorybook={
                  automationLibrary?.name === "@storybook/test-runner"
                }
              />
            )}
            {test && (
              <TestIndicator test={test} branch={branch} repoUrl={repoUrl} />
            )}
            {playwrightTraceUrl && (
              <TraceIndicator traceUrl={playwrightTraceUrl} />
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <ViewToggle />
        <SplitViewToggle />
        <FitToggle />
        <OverlayToggle />
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
        <Separator orientation="vertical" className="mx-1 !h-6" />
        <SettingsButton />
      </div>
    </div>
  );
});
