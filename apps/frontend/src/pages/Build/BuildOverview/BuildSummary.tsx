import { clsx } from "clsx";
import {
  ClockIcon,
  GlobeIcon,
  ImagesIcon,
  MonitorSmartphoneIcon,
  SunIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildStatus, BuildType } from "@/gql/graphql";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Kbd } from "@/ui/Kbd";
import { getBuildDescriptor } from "@/util/build";
import { lowTextColorClassNames, type UIColor } from "@/util/colors";

import { useBuildDiffState, useGoToNextDiff } from "../BuildDiffState";
import { OrphanNextSteps } from "./OrphanNextSteps";
import perfectMatchDarkUrl from "./perfect-match-2-dark.png";
import perfectMatchUrl from "./perfect-match-2.png";
import { ReviewOutcomes } from "./ReviewOutcomes";
import { WhatToDoNow } from "./WhatToDoNow";
import { ReviewScope } from "./ReviewScope";
import { Emphasis, SectionHeader, Stat, uiBgColorClassNames } from "./shared";

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
    ...ReviewScope_Build
    ...OrphanNextSteps_Build
    ...WhatToDoNow_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

type SummaryCopy = {
  title: string;
  description: React.ReactNode;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: UIColor;
};

/**
 * Resolves the hero's title, description, icon and color from the build's state.
 *
 * Priority order: orphan (no baseline yet) → failures (unreliable, blocks
 * baseline) → status. The wording is baseline-accurate: approving a CI check
 * build does NOT make it the baseline — it becomes one only once its pull
 * request is merged. In monitoring mode the latest approved build IS the
 * baseline, so approval is enough there.
 */
function getBuildSummaryCopy(args: {
  build: Build;
  hasChanges: boolean;
  hasFailures: boolean;
}): SummaryCopy {
  const { build, hasChanges, hasFailures } = args;
  const descriptor = getBuildDescriptor(build.type, build.status);
  const fallback = { icon: descriptor.icon, color: descriptor.color };

  if (build.type === BuildType.Orphan) {
    return {
      ...fallback,
      title: "No baseline yet",
      description: (
        <>
          Argos has nothing to compare this build against yet — common on a
          project&apos;s first builds, or when the base branch hasn&apos;t been
          built yet.
        </>
      ),
    };
  }

  // Failures take priority: a failing build is unreliable and can't become a
  // baseline until fixed. The detail lives in the BuildFailuresAlert below.
  if (hasFailures) {
    return {
      icon: TriangleAlertIcon,
      color: "danger",
      title: "Tests failed",
      description: hasChanges ? (
        <>
          <Emphasis>Visual changes were detected, and some tests failed.</Emphasis>{" "}
          Please review the screenshots and confirm whether the changes are
          expected.
        </>
      ) : (
        <>
          <Emphasis>Some tests failed in this build.</Emphasis> Review the
          failing screenshots to see what broke.
        </>
      ),
    };
  }

  // Auto-approved reference builds run on the base branch and act as baselines.
  if (build.type === BuildType.Reference) {
    return {
      ...fallback,
      title: descriptor.label,
      description: (
        <>
          This build ran on the base branch and was automatically approved. It
          serves as a baseline for future comparisons.
        </>
      ),
    };
  }

  switch (build.status) {
    case BuildStatus.ChangesDetected:
      return {
        icon: ClockIcon,
        color: "info",
        title: "Review required",
        description: (
          <>
            <Emphasis>Visual changes were detected in this build.</Emphasis>{" "}
            Please review the screenshots and confirm whether these changes are
            expected.
          </>
        ),
      };
    case BuildStatus.Accepted:
      return {
        ...fallback,
        title: descriptor.label,
        description:
          build.mode === BuildMode.Monitoring ? (
            <>
              The visual changes were approved. This build is now the baseline
              for future comparisons.
            </>
          ) : (
            <>
              The visual changes were approved — the status check now passes.
              This build will become the baseline once its pull request is
              merged.
            </>
          ),
      };
    case BuildStatus.Rejected:
      return {
        ...fallback,
        title: descriptor.label,
        description: <>The visual changes in this build were rejected.</>,
      };
    case BuildStatus.NoChanges:
      return {
        ...fallback,
        title: descriptor.label,
        description: (
          <>
            Every screenshot matches the approved baseline. There&apos;s nothing
            to review.
          </>
        ),
      };
    default:
      return { ...fallback, title: descriptor.label, description: null };
  }
}

/** Status icon in a colored disc, next to the build's headline title. */
function BuildSummaryHeader(props: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color: UIColor;
  title: string;
}) {
  const { icon: Icon, color, title } = props;
  return (
    <div className="flex items-center gap-4">
      <div
        className={clsx(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          uiBgColorClassNames[color],
          lowTextColorClassNames[color],
        )}
      >
        <Icon className="size-5.5" strokeWidth={1.75} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}

/** Plain-language explanation of what the build is and what to do with it. */
function BuildSummaryDescription(props: { children: React.ReactNode }) {
  return (
    <div className="text-low mt-3 text-sm text-balance">{props.children}</div>
  );
}

/** Warns that failed tests make the build ineligible as a baseline. */
function BuildFailuresAlert() {
  return (
    <Alert className="border-danger bg-danger-subtle text-danger-low my-3 flex items-center gap-3 rounded-md border p-3 text-sm">
      <TriangleAlertIcon className="size-4 shrink-0" />
      <div className="text-left">
        <Emphasis>This build has failed tests.</Emphasis> It can&apos;t be
        approved as a baseline for future builds.
        <br />
        Please fix them to have a reliable baseline for future comparisons.
      </div>
    </Alert>
  );
}

/** Fallback action when there is nothing to review — just browse the diffs. */
function BrowseScreenshotsButton(props: {
  isDisabled: boolean;
  onPress: () => void;
}) {
  return (
    <div className="mt-6">
      <Button autoFocus isDisabled={props.isDisabled} onPress={props.onPress}>
        Browse screenshots
        <Kbd className="ml-2 bg-white/25 text-white">↵</Kbd>
      </Button>
    </div>
  );
}

/**
 * Reassuring empty state for a build with no visual changes: a "perfect match"
 * illustration, a way to browse the screenshots, and — in CI — a verdict that
 * Argos won't block the pull request.
 */
function NoChangesState(props: {
  isCi: boolean;
  isDisabled: boolean;
  onBrowse: () => void;
}) {
  return (
    <div className="mt-6">
      <BrowseScreenshotsButton
        isDisabled={props.isDisabled}
        onPress={props.onBrowse}
      />
      <img
        src={perfectMatchUrl}
        alt=""
        className="mx-auto mt-8 w-full max-w-md"
      />
      {props.isCi ? (
        <div className="text-low mt-6 flex items-center gap-3 text-sm">
          <ShieldCheckIcon className="text-success-low size-5 shrink-0" />
          <div>
            <Emphasis>Visual check passed.</Emphasis> This build won&apos;t
            block your pull request.
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The hero of the overview: a status- and baseline-aware summary plus the
 * primary action (review, browse, or orphan onboarding).
 */
export function BuildSummary(props: { build: Build }) {
  const { build } = props;
  const { stats, firstDiff } = useBuildDiffState();
  const goToFirstDiff = useGoToNextDiff();
  const isOrphan = build.type === BuildType.Orphan;
  const hasChanges = stats
    ? stats.changed + stats.added + stats.removed > 0
    : false;
  const hasFailures = Boolean(stats?.failure);
  const hasReviewableDiffs = hasChanges || hasFailures;
  const copy = getBuildSummaryCopy({ build, hasChanges, hasFailures });

  return (
    <section>
      <SectionHeader>Build summary</SectionHeader>
      <BuildSummaryHeader
        icon={copy.icon}
        color={copy.color}
        title={copy.title}
      />
      <BuildSummaryDescription>{copy.description}</BuildSummaryDescription>
      {hasFailures ? <BuildFailuresAlert /> : null}
      {isOrphan ? (
        <div className="mt-6">
          <OrphanNextSteps build={build} />
        </div>
      ) : hasReviewableDiffs ? (
        <ReviewScope
          build={build}
          isDisabled={!firstDiff}
          onStart={() => goToFirstDiff()}
        />
      ) : build.status === BuildStatus.NoChanges ? (
        <NoChangesState
          build={build}
          isDisabled={!firstDiff}
          onBrowse={() => goToFirstDiff()}
        />
      ) : (
        <BrowseScreenshotsButton
          isDisabled={!firstDiff}
          onPress={() => goToFirstDiff()}
        />
      )}
    </section>
  );
}
