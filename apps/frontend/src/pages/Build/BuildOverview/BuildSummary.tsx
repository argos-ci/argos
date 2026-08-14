import React from "react";

import { DocumentType, graphql } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { ShortcutHint } from "@/ui/ShortcutHint";

import {
  getReviewableCount,
  useBuildDiffState,
  useGoToNextDiff,
} from "../BuildDiffState";
import { useCanReviewBuild } from "../BuildReviewability";
import { BuildSummaryDescription } from "./BuildSummaryDescription";
import { ChangeSummary } from "./ChangeSummary";
import { OrphanNextSteps } from "./OrphanNextSteps";
import perfectMatchDarkUrl from "./perfect-match-2-dark.png";
import perfectMatchUrl from "./perfect-match-2.png";
import { SummaryBuildTitle } from "./SummaryBuildTitle";

const _BuildFragment = graphql(`
  fragment BuildSummary_Build on Build {
    type
    mode
    viewerHasSubmittedReview
    stats {
      total
    }
    ...SummaryBuildTitle_Build
    ...BuildSummaryDescription_Build
    ...ChangeSummary_Build
    ...OrphanNextSteps_Build
    ...BuildReviewability_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

function BrowseSnapshotSection(props: { build: Build }) {
  const { build } = props;
  const { stats } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);
  const canReview = useCanReviewBuild(build);
  // Offer to start a review only when the viewer can review the build, hasn't
  // reviewed it yet, and there are no failing tests (which take precedence:
  // browse them rather than push a review CTA).
  const canStartReview =
    canReview && !build.viewerHasSubmittedReview && !hasFailures;
  const goToFirstDiff = useGoToNextDiff();
  const browse = () => goToFirstDiff();
  const label = (() => {
    if (canStartReview) {
      return "Start review";
    }
    return hasFailures ? "Browse test failures" : "Browse snapshots";
  })();

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
      {/* The shortcut sits in the tooltip rather than inside the button: a key
          drawn on the button's own fill reads as a control nested in a
          control, and it is the same hint the row beside it already gives. */}
      <HotkeyTooltip description={label} keys={["↵"]}>
        <Button
          autoFocus
          variant={canStartReview ? "primary" : "secondary"}
          onPress={browse}
        >
          {label}
        </Button>
      </HotkeyTooltip>
      {canStartReview && (
        <div className="text-low flex items-center gap-4 text-xs">
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

export function BuildSummary(props: { build: Build }) {
  const { build } = props;
  const { stats, isSubsetBuild } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);
  const reviewableCount = stats
    ? getReviewableCount(stats, { isSubsetBuild })
    : 0;
  const canReview = useCanReviewBuild(build);
  // Failing tests take precedence over the visual review, so the change summary
  // steps aside for the failure-focused description.
  const showReviewInsights = canReview && !hasFailures;
  const perfectMatch = reviewableCount === 0 && !hasFailures;
  const isOrphan = build.type === BuildType.Orphan;
  const hasSnapshots = (stats?.total ?? 0) > 0;

  return (
    <section className="flex flex-col gap-10 pt-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <SummaryBuildTitle build={build} hasFailures={hasFailures} />
          <BuildSummaryDescription build={build} canReview={canReview} />
        </div>
        {showReviewInsights && <ChangeSummary build={build} />}
        {isOrphan && <OrphanNextSteps build={build} />}
        {hasSnapshots && <BrowseSnapshotSection build={build} />}
      </div>

      {perfectMatch && !isOrphan && <PerfectMatchIllustration />}
    </section>
  );
}
