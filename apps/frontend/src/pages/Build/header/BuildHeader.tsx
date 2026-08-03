import { ComponentProps, memo } from "react";
import clsx from "clsx";
import { RefreshCcwIcon } from "lucide-react";

import { AiPromptButton } from "@/containers/AiPromptButton";
import { useIsLoggedIn } from "@/containers/Auth";
import { BuildBaselineEligibilityChip } from "@/containers/BuildBaselineEligibilityChip";
import { BuildMergeQueueIndicator } from "@/containers/BuildMergeQueueIndicator";
import { BuildModeIndicator } from "@/containers/BuildModeIndicator";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { BuildTestStatusChip } from "@/containers/BuildTestStatusChip";
import { NavUserControl } from "@/containers/NavUserControl";
import { PullRequestButton } from "@/containers/PullRequestButton";
import { DocumentType, graphql } from "@/gql";
import { BuildMode } from "@/gql/graphql";
import { getProjectURL } from "@/pages/Project/ProjectParams";
import { BrandShield } from "@/ui/BrandShield";
import { HeadlessLink } from "@/ui/Link";
import { Progress } from "@/ui/Progress";
import { Tooltip } from "@/ui/Tooltip";

import { createHandleCommentsPrompt } from "../BuildCommentsPrompt";
import { useBuildDiffState } from "../BuildDiffState";
import { getBuildOverviewURL } from "../BuildParams";
import { useBuildReviewability } from "../BuildReviewability";
import {
  BuildReviewButton,
  DisabledBuildReviewButton,
} from "../BuildReviewButton";
import { ReviewProgressBadge } from "../ReviewProgressBadge";
import { createBuildReviewPrompt } from "./BuildReviewPrompt";

const _BuildFragment = graphql(`
  fragment BuildHeader_Build on Build {
    name
    status
    type
    mode
    mergeQueue
    number
    pullRequest {
      ...PullRequestButton_PullRequest
      ...BuildReviewPrompt_PullRequest
    }
    ...BuildStatusChip_Build
    ...BuildTestStatusChip_Build
    ...BuildBaselineEligibilityChip_Build
    ...BuildReviewability_Build
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
          className="text-low data-hovered:text-default rac-focus text-xs leading-none transition"
        >
          {accountSlug}/{projectName}
        </HeadlessLink>
      </Tooltip>
    );
  },
);

function LoggedReviewButton(props: {
  project: ComponentProps<typeof BuildReviewButton>["project"];
  build: DocumentType<typeof _BuildFragment>;
}) {
  const reviewability = useBuildReviewability(props.build);
  if (!reviewability.reviewable) {
    switch (reviewability.reason) {
      case "merge-queue":
        return (
          <DisabledBuildReviewButton tooltip="This build was triggered in a merge queue." />
        );
      case "reference":
        return <DisabledBuildReviewButton tooltip="Build is auto-approved" />;
      case "loading":
        return <DisabledBuildReviewButton tooltip="Loading…" />;
      case "no-changes":
        return <DisabledBuildReviewButton tooltip="No changes to review" />;
    }
  }
  const { progression } = reviewability;
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-1.5">
        <ReviewProgressBadge scale="xs" progression={progression} />
        <Progress
          scale="sm"
          value={progression.reviewed.length}
          min={0}
          max={progression.toReview.length}
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-2">
        <BuildReviewButton project={props.project} />
        <BuildPromptButton
          build={props.build}
          buildNumber={props.build.number}
          accountSlug={props.project.account.slug}
          projectName={props.project.name}
        />
      </div>
    </div>
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

/**
 * Hands one of the build's prompts to the user's coding agent — or to the
 * clipboard, for the agents Argos cannot open.
 *
 * Two things can be asked of an agent about a build: to review it, and to carry
 * out what its reviewers already wrote. Reviewing is the one the button itself
 * performs — it applies to every build, where comments to handle are something
 * a build only sometimes has.
 */
function BuildPromptButton(props: {
  buildNumber: number;
  accountSlug: string;
  projectName: string;
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { accountSlug, projectName, buildNumber } = props;
  const buildPath = `${getProjectURL({
    accountSlug,
    projectName,
  })}/builds/${buildNumber}`;
  const buildUrl = new URL(buildPath, window.location.origin).toString();
  const reviewPrompt = {
    label: "Review build",
    name: "review prompt",
    prompt: createBuildReviewPrompt({
      buildUrl,
      pullRequest: props.build.pullRequest,
    }),
  };
  const commentsPrompt = {
    label: "Handle comments",
    name: "comment prompt",
    prompt: createHandleCommentsPrompt({
      accountSlug,
      projectName,
      buildNumber,
    }),
  };

  return <AiPromptButton prompts={[reviewPrompt, commentsPrompt]} iconOnly />;
}

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
      <div className="border-b-thin flex w-screen min-w-0 flex-none grow-0 items-center justify-between gap-4 p-4">
        <div className="flex h-8 items-center gap-4">
          <div className="relative flex">
            <BrandLink
              accountSlug={props.accountSlug}
              projectName={props.projectName}
            />
            <SyncingIcon />
          </div>
          <div className="flex flex-col justify-center">
            <div className="mb-1 flex items-start gap-1">
              <BuildModeIndicator
                mode={build ? build.mode : BuildMode.Ci}
                scale="sm"
              />
              <Tooltip content="Build overview">
                <HeadlessLink
                  href={getBuildOverviewURL({
                    accountSlug: props.accountSlug,
                    projectName: props.projectName,
                    buildNumber: props.buildNumber,
                  })}
                  className="data-hovered:text-default rac-focus text-sm leading-none font-medium transition"
                >
                  Build {props.buildNumber}
                  {build && build.name !== "default" ? ` • ${build.name}` : ""}
                </HeadlessLink>
              </Tooltip>
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
          {build ? <BuildBaselineEligibilityChip build={build} /> : null}
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
