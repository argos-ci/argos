import { ComponentProps, memo } from "react";
import { EllipsisIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { BuildModeIndicator } from "@/containers/BuildModeIndicator";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { NavUserControl } from "@/containers/NavUserControl";
import { PullRequestButton } from "@/containers/PullRequestButton";
import { DocumentType, FragmentType, graphql, useFragment } from "@/gql";
import { BuildMode, BuildType } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Chip } from "@/ui/Chip";
import { Progress } from "@/ui/Progress";
import { Tooltip } from "@/ui/Tooltip";

import { checkCanBeReviewed, useBuildDiffState } from "../BuildDiffState";
import {
  EvaluationStatus,
  useGetDiffEvaluationStatus,
} from "../BuildReviewState";
import { DisabledReviewButton, ReviewButton } from "./ReviewButton";

const BuildFragment = graphql(`
  fragment BuildHeader_Build on Build {
    name
    status
    type
    mode
    pullRequest {
      id
      ...PullRequestButton_PullRequest
    }
    ...BuildStatusChip_Build
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
        <Link
          to={`/${accountSlug}/${projectName}/builds`}
          className="transition hover:brightness-125"
        >
          <BrandShield height={32} />
        </Link>
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
        <Link
          to={`/${accountSlug}/${projectName}/builds`}
          className="text-low text-xs leading-none transition hover:brightness-125"
        >
          {accountSlug}/{projectName}
        </Link>
      </Tooltip>
    );
  },
);

function useBuildReviewProgression() {
  const diffState = useBuildDiffState();
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  if (diffState.ready) {
    const toReview = diffState.diffs.filter((diff) =>
      checkCanBeReviewed(diff.status),
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
  project: ComponentProps<typeof ReviewButton>["project"];
  build: DocumentType<typeof BuildFragment>;
}) {
  const progression = useBuildReviewProgression();
  if (!progression) {
    return <DisabledReviewButton tooltip="Loading..." />;
  }
  if (progression.toReview.length === 0) {
    return <DisabledReviewButton tooltip="No changes to review" />;
  }
  if (props.build.type === BuildType.Reference) {
    return (
      <DisabledReviewButton tooltip="No need to review reference builds" />
    );
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
          />
        </div>
      </Tooltip>
      <ReviewButton project={props.project} />
    </>
  );
}

const BuildReviewButton = memo(
  (props: {
    project: ComponentProps<typeof ReviewButton>["project"];
    build: DocumentType<typeof BuildFragment>;
  }) => {
    const loggedIn = useIsLoggedIn();
    return loggedIn ? (
      <LoggedReviewButton project={props.project} build={props.build} />
    ) : null;
  },
);

const ProjectFragment = graphql(`
  fragment BuildHeader_Project on Project {
    ...BuildStatusChip_Project
    ...ReviewButton_Project
  }
`);

export const BuildHeader = memo(
  (props: {
    buildNumber: number;
    accountSlug: string;
    projectName: string;
    build: FragmentType<typeof BuildFragment> | null;
    project: FragmentType<typeof ProjectFragment> | null;
  }) => {
    const build = useFragment(BuildFragment, props.build);
    const project = useFragment(ProjectFragment, props.project);
    return (
      <div className="flex w-screen min-w-0 flex-none grow-0 items-center justify-between gap-4 border-b p-4">
        <div className="flex h-[calc(2rem+2px)] items-center gap-4">
          <BrandLink
            accountSlug={props.accountSlug}
            projectName={props.projectName}
          />
          <div className="flex flex-col justify-center">
            <div className="mb-1 flex gap-1">
              <div className="flex">
                <BuildModeIndicator
                  mode={build ? build.mode : BuildMode.Ci}
                  scale="sm"
                />
              </div>
              <div className="text-sm font-medium leading-none">
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
          {build && project ? (
            <BuildStatusChip build={build} project={project} />
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-4">
          {build?.pullRequest ? (
            <PullRequestButton pullRequest={build.pullRequest} size="small" />
          ) : null}
          {project && build && (
            <BuildReviewButton project={project} build={build} />
          )}
          <NavUserControl />
        </div>
      </div>
    );
  },
);
