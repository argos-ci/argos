import { ComponentProps, memo } from "react";
import { Link } from "react-router-dom";

import { BrandShield } from "@/components/BrandShield";
import { useUser } from "@/containers/User";
import { FragmentType, graphql, useFragment } from "@/gql";
import { BuildStatusChip } from "@/modern/containers/BuildStatusChip";
import { GitHubLoginButton } from "@/modern/containers/GitHub";
import { ReviewButton } from "@/modern/containers/ReviewButton";
import { MagicTooltip } from "@/modern/ui/Tooltip";

const BrandLink = memo(() => {
  return (
    <MagicTooltip tooltip="Go to home">
      <Link to="/" className="transition hover:brightness-125">
        <BrandShield className="h-[32px] w-auto" />
      </Link>
    </MagicTooltip>
  );
});

const RepositoryLink = memo(
  ({
    ownerLogin,
    repositoryName,
  }: {
    ownerLogin: string;
    repositoryName: string;
  }) => {
    return (
      <MagicTooltip tooltip="See all builds">
        <Link
          to={`/${ownerLogin}/${repositoryName}/builds`}
          className="text-xs leading-none text-on-light transition hover:brightness-125"
        >
          {ownerLogin}/{repositoryName}
        </Link>
      </MagicTooltip>
    );
  }
);

const BuildReviewButton = memo(
  (props: {
    repository: ComponentProps<typeof ReviewButton>["repository"];
  }) => {
    const user = useUser();
    return user ? (
      <ReviewButton repository={props.repository} />
    ) : (
      <GitHubLoginButton />
    );
  }
);

export const BuildFragment = graphql(`
  fragment BuildHeader_Build on Build {
    ...BuildStatusChip_Build
  }
`);

export const RepositoryFragment = graphql(`
  fragment BuildHeader_Repository on Repository {
    ...BuildStatusChip_Repository
    ...ReviewButton_Repository
  }
`);

export const BuildHeader = memo(
  (props: {
    buildNumber: number;
    ownerLogin: string;
    repositoryName: string;
    build: FragmentType<typeof BuildFragment> | null;
    repository: FragmentType<typeof RepositoryFragment> | null;
  }) => {
    const build = useFragment(BuildFragment, props.build);
    const repository = useFragment(RepositoryFragment, props.repository);
    return (
      <div className="flex flex-none flex-grow-0 items-center justify-between border-b border-b-border p-4">
        <div className="flex h-[32px] items-center gap-4">
          <BrandLink />
          <div className="flex flex-col justify-center">
            <div className="mb-1 text-sm font-medium leading-none">
              Build {props.buildNumber}
            </div>
            <RepositoryLink
              ownerLogin={props.ownerLogin}
              repositoryName={props.repositoryName}
            />
          </div>
          {build && repository ? (
            <BuildStatusChip build={build} repository={repository} />
          ) : null}
        </div>
        {repository && <BuildReviewButton repository={repository} />}
      </div>
    );
  }
);
