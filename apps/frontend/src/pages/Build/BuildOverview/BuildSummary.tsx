import React from "react";

import { DocumentType, graphql } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Kbd } from "@/ui/Kbd";
import { ShortcutHint } from "@/ui/ShortcutHint";

import { useBuildDiffState, useGoToNextDiff } from "../BuildDiffState";
import { BuildSummaryDescription } from "./BuildSummaryDescription";
import { OrphanNextSteps } from "./OrphanNextSteps";
import perfectMatchDarkUrl from "./perfect-match-2-dark.png";
import perfectMatchUrl from "./perfect-match-2.png";
import { ReviewScope } from "./ReviewScope";
import {
  ReviewStatusIndicator,
  useReviewNeeded,
} from "./ReviewStatusIndicator";
import { SummaryBuildTitle } from "./SummaryBuildTitle";
import { WhatToDoNow } from "./WhatToDoNow";

const _BuildFragment = graphql(`
  fragment BuildSummary_Build on Build {
    type
    status
    mode
    stats {
      total
    }
    impactAnalysis {
      buildBrowsers
      buildViewports
      buildColorSchemes
    }
    ...SummaryBuildTitle_Build
    ...ReviewStatusIndicator_Build
    ...BuildSummaryDescription_Build
    ...ReviewScope_Build
    ...OrphanNextSteps_Build
    ...WhatToDoNow_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

function BrowseScreenshotSection(props: { build: Build }) {
  const reviewNeeded = useReviewNeeded(props.build);
  const { stats } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);
  const goToFirstDiff = useGoToNextDiff();
  const browse = () => goToFirstDiff();

  return (
    <div className="mt-3 space-y-4">
      {reviewNeeded ? (
        <Button autoFocus onPress={browse}>
          Start review
          <Kbd className="ml-2 bg-white/25 text-white">↵</Kbd>
        </Button>
      ) : (
        <Button autoFocus variant="secondary" onPress={browse}>
          Browse screenshots
          <Kbd className="ml-2">↵</Kbd>
        </Button>
      )}
      {!hasFailures && reviewNeeded && (
        <div className="text-low flex items-center gap-8 text-sm">
          <ShortcutHint keys={["↓", "↑"]}>Navigate</ShortcutHint>
          <ShortcutHint keys={["y"]}>Approve</ShortcutHint>
          <ShortcutHint keys={["n"]}>Reject</ShortcutHint>
          <ShortcutHint keys={["?"]}>Shortcuts</ShortcutHint>
        </div>
      )}
    </div>
  );
}

function PerfectMatchIllustration() {
  return (
    <div className="max-w-xl">
      <img src={perfectMatchUrl} alt="perfect match" className="dark:hidden" />
      <img
        src={perfectMatchDarkUrl}
        alt="perfect match dark"
        className="hidden dark:block"
      />
    </div>
  );
}

export function BuildSummary(props: { build: Build; hasRepository: boolean }) {
  const { build, hasRepository } = props;
  const { stats } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);
  const reviewableCount = stats
    ? stats.changed + stats.added + stats.removed
    : 0;
  const reviewNeeded = useReviewNeeded(build);
  const perfectMatch = reviewableCount === 0 && !hasFailures;
  const isOrphan = build.type === BuildType.Orphan;

  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <SummaryBuildTitle build={build} hasFailures={hasFailures} />
        <ReviewStatusIndicator build={build} />
        <BuildSummaryDescription build={build} />
        {isOrphan && <OrphanNextSteps build={build} />}

        <BrowseScreenshotSection build={build} />
      </div>

      {reviewNeeded && !hasFailures && (
        <ReviewScope build={build} screenshotCount={reviewableCount} />
      )}

      {!isOrphan && reviewNeeded && (
        <WhatToDoNow build={build} hasRepository={hasRepository} />
      )}

      {perfectMatch && !isOrphan && <PerfectMatchIllustration />}
    </section>
  );
}
