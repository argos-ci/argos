import { memo } from "react";
import { clsx } from "clsx";

import { BuildType } from "@/gql/graphql";
import { Separator } from "@/ui/Separator";

import { checkCanBeReviewed, Diff } from "./BuildDiffState";
import { AutomationLibraryIndicator } from "./metadata/automationLibrary/AutomationLibraryIndicator";
import { BrowserIndicator } from "./metadata/browser/BrowserIndicator";
import { ColorSchemeIndicator } from "./metadata/colorScheme/ColorSchemeIndicator";
import { MediaTypeIndicator } from "./metadata/mediaType/MediaTypeIndicator";
import { SdkIndicator } from "./metadata/sdk/SdkIndicator";
import { TestIndicator } from "./metadata/test/TestIndicator";
import { TraceIndicator } from "./metadata/trace/TraceIndicator";
import { UrlIndicator } from "./metadata/url/UrlIndicator";
import { ViewportIndicator } from "./metadata/viewport/ViewportIndicator";
import { FitToggle } from "./toolbar/FitToggle";
import { NextButton, PreviousButton } from "./toolbar/NavButtons";
import { OverlayToggle } from "./toolbar/OverlayToggle";
import { AcceptButton, RejectButton } from "./toolbar/TrackButtons";
import { SplitViewToggle, ViewToggle } from "./toolbar/ViewToggle";

export const BuildDetailToolbar = memo(
  ({
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
    compareBranch: string | null;
    prMerged: boolean;
    buildType: BuildType | null;
  }) => {
    const automationLibrary =
      activeDiff.compareScreenshot?.metadata?.automationLibrary ??
      activeDiff.baseScreenshot?.metadata?.automationLibrary ??
      null;
    const browser =
      activeDiff.compareScreenshot?.metadata?.browser ??
      activeDiff.baseScreenshot?.metadata?.browser ??
      null;
    const sdk =
      activeDiff.compareScreenshot?.metadata?.sdk ??
      activeDiff.baseScreenshot?.metadata?.sdk ??
      null;
    const viewport =
      activeDiff.compareScreenshot?.metadata?.viewport ??
      activeDiff.baseScreenshot?.metadata?.viewport ??
      null;
    const url =
      activeDiff.compareScreenshot?.metadata?.url ??
      activeDiff.baseScreenshot?.metadata?.url ??
      null;
    const colorScheme =
      activeDiff.compareScreenshot?.metadata?.colorScheme ??
      activeDiff.baseScreenshot?.metadata?.colorScheme ??
      null;
    const mediaType =
      activeDiff.compareScreenshot?.metadata?.mediaType ??
      activeDiff.baseScreenshot?.metadata?.mediaType ??
      null;
    const test =
      activeDiff.compareScreenshot?.metadata?.test ??
      activeDiff.baseScreenshot?.metadata?.test ??
      null;
    const branch =
      prMerged || test === activeDiff.baseScreenshot?.metadata?.test
        ? baseBranch
        : compareBranch;
    const playwrightTraceUrl =
      activeDiff.compareScreenshot?.playwrightTraceUrl ?? null;
    const canBeReviewed =
      buildType === BuildType.Check && checkCanBeReviewed(activeDiff.status);
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
              {url && <UrlIndicator url={url} />}
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
          <Separator orientation="vertical" className="mx-1 !h-6" />
          <div className="flex gap-1">
            <RejectButton
              screenshotDiffId={activeDiff.id}
              diffGroup={activeDiff.group ?? null}
              disabled={!canBeReviewed}
            />
            <AcceptButton
              screenshotDiffId={activeDiff.id}
              diffGroup={activeDiff.group ?? null}
              disabled={!canBeReviewed}
            />
          </div>
        </div>
      </div>
    );
  },
);
