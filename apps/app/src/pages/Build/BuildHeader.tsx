import { ComponentProps, memo } from "react";
import { Link } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { GitHubLoginButton } from "@/containers/GitHub";
import { ReviewButton } from "@/containers/ReviewButton";
import { FragmentType, graphql, useFragment } from "@/gql";
import { BrandShield } from "@/ui/BrandShield";
import { MagicTooltip } from "@/ui/Tooltip";

const BrandLink = memo(() => {
  return (
    <MagicTooltip tooltip="Go to home">
      <Link to="/" className="transition hover:brightness-125">
        <BrandShield height={32} />
      </Link>
    </MagicTooltip>
  );
});

const ProjectLink = memo(
  ({
    accountSlug,
    projectName,
  }: {
    accountSlug: string;
    projectName: string;
  }) => {
    return (
      <MagicTooltip tooltip="See all builds">
        <Link
          to={`/${accountSlug}/${projectName}/builds`}
          className="text-xs leading-none text-on-light transition hover:brightness-125"
        >
          {accountSlug}/{projectName}
        </Link>
      </MagicTooltip>
    );
  }
);

const BuildReviewButton = memo(
  (props: { project: ComponentProps<typeof ReviewButton>["project"] }) => {
    const loggedIn = useIsLoggedIn();
    return loggedIn ? (
      <ReviewButton project={props.project} />
    ) : (
      <GitHubLoginButton />
    );
  }
);

export const BuildFragment = graphql(`
  fragment BuildHeader_Build on Build {
    name
    ...BuildStatusChip_Build
  }
`);

export const ProjectFragment = graphql(`
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
      <div className="flex flex-none flex-grow-0 items-center justify-between border-b border-b-border p-4">
        <div className="flex h-[32px] items-center gap-4">
          <BrandLink />
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
        {project && <BuildReviewButton project={project} />}
      </div>
    );
  }
);
