import { ComponentProps, memo } from "react";
import { Link } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { NavUserControl } from "@/containers/NavUserControl";
import { ReviewButton } from "@/containers/ReviewButton";
import { FragmentType, graphql, useFragment } from "@/gql";
import { BrandShield } from "@/ui/BrandShield";
import { Tooltip } from "@/ui/Tooltip";
import { PullRequestButton } from "@/containers/PullRequestButton";

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
          className="text-xs leading-none text-low transition hover:brightness-125"
        >
          {accountSlug}/{projectName}
        </Link>
      </Tooltip>
    );
  },
);

const BuildReviewButton = memo(
  (props: { project: ComponentProps<typeof ReviewButton>["project"] }) => {
    const loggedIn = useIsLoggedIn();
    if (!loggedIn) return null;
    return <ReviewButton project={props.project} />;
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
    repository {
      id
      url
    }
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
      <div className="flex flex-none flex-grow-0 items-center justify-between border-b p-4 gap-4 min-w-0 w-screen">
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
        <div className="flex gap-4 items-center min-w-0">
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
