import React from "react";

import { DocumentType, graphql } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Kbd } from "@/ui/Kbd";

import { useBuildDiffState, useGoToNextDiff } from "../BuildDiffState";
import {
  BuildSummaryDescriptionSection,
  getBuildSummaryTitle,
  ReviewStatusIndicator,
  useReviewNeeded,
} from "./BuildSummaryHeader";
import { OrphanNextSteps } from "./OrphanNextSteps";
import perfectMatchDarkUrl from "./perfect-match-2-dark.png";
import perfectMatchUrl from "./perfect-match-2.png";
import { ReviewScope } from "./ReviewScope";
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
    ...BuildSummaryHeader_Build
    ...ReviewScope_Build
    ...OrphanNextSteps_Build
    ...WhatToDoNow_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

function BrowseScreenshotsButton(props: {
  onPress: () => void;
  reviewNeeded: boolean;
}) {
  if (props.reviewNeeded) {
    return (
      <Button autoFocus onPress={props.onPress}>
        Start review
        <Kbd className="ml-2 bg-white/25 text-white">↵</Kbd>
      </Button>
    );
  }

  return (
    <Button autoFocus variant="secondary" onPress={props.onPress}>
      Browse screenshots
      <Kbd className="ml-2">↵</Kbd>
    </Button>
  );
}

function BrowseScreenshotSection(props: { build: Build }) {
  const reviewNeeded = useReviewNeeded(props.build);
  const { stats } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);
  const goToFirstDiff = useGoToNextDiff();
  const browse = () => goToFirstDiff();

  return (
    <div className="mt-3 space-y-4">
      <BrowseScreenshotsButton onPress={browse} reviewNeeded={reviewNeeded} />
      {!hasFailures && reviewNeeded && <ShortcutHints />}
    </div>
  );
}

function ShortcutHint(props: { keys: string[]; children: React.ReactNode }) {
  const { keys, children } = props;
  return (
    <div className="text-low flex items-center gap-1">
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
      <span>{children}</span>
    </div>
  );
}

function ShortcutHints() {
  return (
    <div className="text-low flex items-center gap-8 text-sm">
      <ShortcutHint keys={["↓", "↑"]}>Navigate</ShortcutHint>
      <ShortcutHint keys={["y"]}>Approve</ShortcutHint>
      <ShortcutHint keys={["n"]}>Reject</ShortcutHint>
      <ShortcutHint keys={["?"]}>Shortcuts</ShortcutHint>
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

function SummaryBuildTitle(props: { build: Build; hasFailures: boolean }) {
  const title = getBuildSummaryTitle({
    build: props.build,
    hasFailures: props.hasFailures,
  });
  return <h1 className="text-3xl font-bold tracking-tight">{title}</h1>;
}

/**
 * The hero of the overview: a status- and baseline-aware summary plus the
 * primary action (review, browse, or orphan onboarding).
 */
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
        <BuildSummaryDescriptionSection build={build} />
        {!isOrphan && <BrowseScreenshotSection build={build} />}
      </div>

      {reviewNeeded && !hasFailures && (
        <ReviewScope build={build} screenshotCount={reviewableCount} />
      )}

      {isOrphan && <OrphanNextSteps build={build} />}

      {!isOrphan && reviewNeeded && (
        <WhatToDoNow build={build} hasRepository={hasRepository} />
      )}

      {perfectMatch && !isOrphan && <PerfectMatchIllustration />}
    </section>
  );
}
