import { ComponentProps, memo } from "react";
import { Link } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { NavUserControl } from "@/containers/NavUserControl";
import { PullRequestButton } from "@/containers/PullRequestButton";
import { FragmentType, graphql, useFragment } from "@/gql";
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
}) {
  const progression = useBuildReviewProgression();
  if (!progression) {
    return <DisabledReviewButton tooltip="Loading..." />;
  }
  if (progression.toReview.length === 0) {
    return <DisabledReviewButton tooltip="No changes to review" />;
  }
  const reviewComplete =
    progression.reviewed.length === progression.toReview.length;
  const { color, tooltip } = (() => {
    if (progression.rejected.length > 0) {
      return {
        color: "warning" as const,
        tooltip: "Some changes have been rejected",
      };
    }
    if (reviewComplete) {
      return {
        color: "success" as const,
        tooltip: "All changes have been reviewed",
      };
    }
    return { color: "neutral" as const, tooltip: "Track your review progress" };
  })();
  return (
    <>
      <Tooltip content={tooltip}>
        <div className="flex flex-col gap-1.5">
          <Chip scale="xs" color={color} className="tabular-nums">
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
  (props: { project: ComponentProps<typeof ReviewButton>["project"] }) => {
    const loggedIn = useIsLoggedIn();
    return loggedIn ? <LoggedReviewButton project={props.project} /> : null;
  },
);

const BuildFragment = graphql(`
  fragment BuildHeader_Build on Build {
    name
    status
    pullRequest {
      id
      ...PullRequestButton_PullRequest
    }
    ...BuildStatusChip_Build
  }
`);

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
        <div className="flex h-[32px] items-center gap-4">
          <BrandLink
            accountSlug={props.accountSlug}
            projectName={props.projectName}
          />
          <div className="flex flex-col justify-center">
            <div className="mb-1 text-sm font-medium leading-none">
              Build {props.buildNumber}
              {build && build.name !== "default" ? ` • ${build.name}` : ""}
            </div>
            <ProjectLink
              accountSlug={props.accountSlug}
              projectName={props.projectName}
            />
          </div>
          {build && project ? (
            <BuildStatusChip build={build} project={project} />
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-4">
          {build?.pullRequest ? (
            <PullRequestButton pullRequest={build.pullRequest} size="small" />
          ) : null}
          {project && <BuildReviewButton project={project} />}
          <NavUserControl />
        </div>
      </div>
    );
  },
);
