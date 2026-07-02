import { ChipContext } from "@/ui/Chip";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";

import type { Diff } from "../BuildDiffState";
import { AnnotationsRow } from "./metadata/AnnotationsRow";
import { AutomationLibraryRow } from "./metadata/AutomationLibraryRow";
import { BrowserRow } from "./metadata/BrowserRow";
import { ColorSchemeRow } from "./metadata/ColorSchemeRow";
import { MediaTypeRow } from "./metadata/MediaTypeRow";
import { RepeatRow } from "./metadata/RepeatRow";
import { RetryRow } from "./metadata/RetryRow";
import { SdkRow } from "./metadata/SdkRow";
import { StoryModeRow } from "./metadata/StoryModeRow";
import { StoryPlayRow } from "./metadata/StoryPlayRow";
import { StoryRow } from "./metadata/StoryRow";
import { TagsRow } from "./metadata/TagsRow";
import { TestRow } from "./metadata/TestRow";
import { ThresholdRow } from "./metadata/ThresholdRow";
import { TraceRow } from "./metadata/TraceRow";
import { UrlRow } from "./metadata/UrlRow";
import { resolveDiffMetadata } from "./metadata/utils";
import { ViewportRow } from "./metadata/ViewportRow";

const CHIP_DEFAULTS = { color: "blank", scale: "sm" } as const;

export type MetadataSectionProps = {
  diff: Diff;
  siblingDiffs: Diff[];
  repoUrl: string | null;
  baseBranch: string | null;
  compareBranch: string | null | undefined;
  deploymentUrl: string | null;
  prMerged: boolean;
};

export function MetadataSection(props: MetadataSectionProps) {
  const {
    diff,
    siblingDiffs,
    baseBranch,
    compareBranch,
    repoUrl,
    deploymentUrl,
    prMerged,
  } = props;

  const metadata = resolveDiffMetadata(diff);
  const test = metadata?.test ?? null;
  const branch =
    prMerged || test === diff.baseScreenshot?.metadata?.test
      ? baseBranch
      : compareBranch;

  return (
    <Panel className="has-[[data-rows]:empty]:hidden">
      <PanelHeader>
        <PanelTitle>Metadata</PanelTitle>
      </PanelHeader>
      <ChipContext value={CHIP_DEFAULTS}>
        <div data-rows className="flex flex-col gap-1 empty:hidden">
          <SdkRow sdk={metadata?.sdk ?? null} />
          <AutomationLibraryRow
            automationLibrary={metadata?.automationLibrary ?? null}
          />
          <BrowserRow diff={diff} siblingDiffs={siblingDiffs} />
          <ViewportRow diff={diff} siblingDiffs={siblingDiffs} />
          <ColorSchemeRow diff={diff} siblingDiffs={siblingDiffs} />
          <MediaTypeRow mediaType={metadata?.mediaType ?? null} />
          <ThresholdRow threshold={diff.threshold ?? null} />
          <RetryRow test={test} />
          <RepeatRow
            test={test}
            automationLibrary={metadata?.automationLibrary ?? null}
          />
          <StoryRow storyId={metadata?.story?.id ?? null} />
          <StoryModeRow diff={diff} siblingDiffs={siblingDiffs} />
          <StoryPlayRow hasPlay={metadata?.story?.play ?? false} />
          <UrlRow
            url={metadata?.url ?? null}
            previewUrl={metadata?.previewUrl ?? null}
            deploymentUrl={deploymentUrl}
            automationLibrary={metadata?.automationLibrary ?? null}
          />
          <TestRow test={test} branch={branch} repoUrl={repoUrl} />
          <AnnotationsRow
            annotations={test?.annotations ?? null}
            repoUrl={repoUrl}
          />
          <TagsRow metadata={metadata} />
          <TraceRow diff={diff} siblingDiffs={siblingDiffs} />
        </div>
      </ChipContext>
    </Panel>
  );
}
