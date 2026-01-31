import { ComponentProps, memo } from "react";
import clsx from "clsx";
import {
  EllipsisIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";

import { useIsLoggedIn } from "@/containers/Auth";
import { BuildMergeQueueIndicator } from "@/containers/BuildMergeQueueIndicator";
import { BuildModeIndicator } from "@/containers/BuildModeIndicator";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { BuildTestStatusChip } from "@/containers/BuildTestStatusChip";
import { NavUserControl } from "@/containers/NavUserControl";
import { PullRequestButton } from "@/containers/PullRequestButton";
import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildType } from "@/gql/graphql";
import { getProjectURL } from "@/pages/Project/ProjectParams";
import { BrandShield } from "@/ui/BrandShield";
import { Chip } from "@/ui/Chip";
import { HeadlessLink } from "@/ui/Link";
import { Progress } from "@/ui/Progress";
import { Tooltip } from "@/ui/Tooltip";

import { checkDiffCanBeReviewed, useBuildDiffState } from "../BuildDiffState";
import {
  BuildReviewButton,
  DisabledBuildReviewButton,
} from "../BuildReviewButton";
import {
  EvaluationStatus,
  useGetDiffEvaluationStatus,
} from "../BuildReviewState";

const _BuildFragment = graphql(`
  fragment BuildHeader_Build on Build {
    name
    status
    type
    mode
    mergeQueue
    pullRequest {
      id
      ...PullRequestButton_PullRequest
    }
    ...BuildStatusChip_Build
    ...BuildTestStatusChip_Build
  }
`);

const BrandLink = memo(
  ({
    accountSlug,
    projectName,
  }: {
    accountSlug: string;
    projectName: string;
  }) => {
    return (
      <Tooltip content="See all builds">
        <HeadlessLink
          href={`${getProjectURL({ accountSlug, projectName })}/builds`}
          className="transition hover:brightness-125"
        >
          <BrandShield height={32} />
        </HeadlessLink>
      </Tooltip>
    );
  },
);

const ProjectLink = memo(
  ({
    accountSlug,
    projectName,
  }: {
    accountSlug: string;
    projectName: string;
  }) => {
    return (
      <Tooltip content="See all builds">
        <HeadlessLink
          href={`${getProjectURL({ accountSlug, projectName })}/builds`}
          className="text-low data-[hovered]:text-default rac-focus text-xs leading-none transition"
        >
          {accountSlug}/{projectName}
        </HeadlessLink>
      </Tooltip>
    );
  },
);

function useBuildReviewProgression() {
  const diffState = useBuildDiffState();
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  if (diffState.ready && getDiffEvaluationStatus) {
    const toReview = diffState.diffs.filter((diff) =>
      checkDiffCanBeReviewed(diff.status, {
        isSubsetBuild: diffState.isSubsetBuild,
      }),
    );
    const reviewed = toReview.filter(
      (diff) => getDiffEvaluationStatus(diff.id) !== EvaluationStatus.Pending,
    );
    const accepted = toReview.filter(
      (diff) => getDiffEvaluationStatus(diff.id) === EvaluationStatus.Accepted,
    );
    const rejected = toReview.filter(
      (diff) => getDiffEvaluationStatus(diff.id) === EvaluationStatus.Rejected,
    );
    return { toReview, reviewed, accepted, rejected };
  }
  return null;
}

function LoggedReviewButton(props: {
  project: ComponentProps<typeof BuildReviewButton>["project"];
  build: DocumentType<typeof _BuildFragment>;
}) {
  const progression = useBuildReviewProgression();
  if (props.build.mergeQueue) {
    return (
      <DisabledBuildReviewButton tooltip="This build was triggered in a merge queue." />
    );
  }
  if (props.build.type === BuildType.Reference) {
    return <DisabledBuildReviewButton tooltip="Build is auto-approved" />;
  }
  if (!progression) {
    return <DisabledBuildReviewButton tooltip="Loading…" />;
  }
  if (progression.toReview.length === 0) {
    return <DisabledBuildReviewButton tooltip="No changes to review" />;
  }
  const reviewComplete =
    progression.reviewed.length === progression.toReview.length;
  const { color, tooltip, icon } = (() => {
    if (progression.rejected.length > 0) {
      return {
        color: "danger" as const,
        tooltip: "Some changes have been rejected",
        icon: ThumbsDownIcon,
      };
    }
    if (reviewComplete) {
      return {
        color: "success" as const,
        tooltip: "All changes have been accepted",
        icon: ThumbsUpIcon,
      };
    }
    return {
      color: "neutral" as const,
      tooltip: "Track your review progress",
      icon: EllipsisIcon,
    };
  })();
  return (
    <>
      <Tooltip content={tooltip}>
        <div className="flex flex-col gap-1.5">
          <Chip scale="xs" color={color} className="tabular-nums" icon={icon}>
            {progression.reviewed.length} / {progression.toReview.length}{" "}
            reviewed
          </Chip>
          <Progress
            scale="sm"
            value={progression.reviewed.length}
            min={0}
            max={progression.toReview.length}
            className="w-full"
          />
        </div>
      </Tooltip>
      <BuildReviewButton project={props.project} />
    </>
  );
}

const ConditionalBuildReviewButton = memo(
  (props: {
    project: ComponentProps<typeof BuildReviewButton>["project"];
    build: DocumentType<typeof _BuildFragment>;
  }) => {
    const loggedIn = useIsLoggedIn();
    return loggedIn ? (
      <LoggedReviewButton project={props.project} build={props.build} />
    ) : null;
  },
);

const _ProjectFragment = graphql(`
  fragment BuildHeader_Project on Project {
    ...BuildReviewButton_Project
  }
`);

export const BuildHeader = memo(
  (props: {
    buildNumber: number;
    accountSlug: string;
    projectName: string;
    build: DocumentType<typeof _BuildFragment> | null;
    project: DocumentType<typeof _ProjectFragment> | null;
  }) => {
    const { build, project } = props;
    return (
      <div className="flex w-screen min-w-0 flex-none grow-0 items-center justify-between gap-4 border-b-[0.5px] p-4">
        <div className="flex h-8 items-center gap-4">
          <div className="relative flex">
            <BrandLink
              accountSlug={props.accountSlug}
              projectName={props.projectName}
            />
            <SyncingIcon />
          </div>
          <div className="flex flex-col justify-center">
            <div className="mb-1 flex gap-1">
              <BuildModeIndicator
                mode={build ? build.mode : BuildMode.Ci}
                scale="sm"
              />
              <div className="text-sm leading-none font-medium">
                Build {props.buildNumber}
                {build && build.name !== "default" ? ` • ${build.name}` : ""}
              </div>
            </div>
            <div className="flex">
              <ProjectLink
                accountSlug={props.accountSlug}
                projectName={props.projectName}
              />
            </div>
          </div>
          {build ? <BuildStatusChip build={build} /> : null}
          {build ? <BuildTestStatusChip build={build} /> : null}
        </div>
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-2 empty:hidden">
            {build?.mergeQueue ? <BuildMergeQueueIndicator /> : null}
            {build?.pullRequest ? (
              <PullRequestButton pullRequest={build.pullRequest} size="small" />
            ) : null}
          </div>
          {build && project && (
            <ConditionalBuildReviewButton build={build} project={project} />
          )}
          <NavUserControl />
        </div>
      </div>
    );
  },
);

function SyncingIcon() {
  const { isLoading } = useBuildDiffState();
  return <SyncingIconMemo isLoading={isLoading} />;
}

const SyncingIconMemo = memo(function SyncingIconMemo(props: {
  isLoading: boolean;
}) {
  const { isLoading } = props;
  return (
    <Tooltip content={isLoading ? "Loading snapshots..." : null}>
      <div
        aria-label="Loading snapshots..."
        aria-busy={isLoading}
        className={clsx(
          "bg-app absolute -right-1 -bottom-1 rounded-full border p-1 transition-all transition-discrete",
          isLoading ? "opacity-100" : "hidden opacity-0",
        )}
      >
        <RefreshCcwIcon
          strokeWidth={1}
          className="size-3 animate-spin duration-1500"
        />
      </div>
    </Tooltip>
  );
});
