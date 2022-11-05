import { memo } from "react";
import { Link } from "react-router-dom";
import { MagicTooltip } from "@/modern/ui/Tooltip";
import { BrandShield } from "@/components/BrandShield";
import { BuildStatusChip } from "@/modern/containers/BuildStatusChip";
import type { BuildStatusChipProps } from "@/modern/containers/BuildStatusChip";
import { GitHubLoginButton } from "@/modern/containers/GitHub";
import {
  ReviewButton,
  ReviewButtonProps,
} from "@/modern/containers/ReviewButton";
import { useUser } from "@/containers/User";

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

export interface BuildHeaderProps {
  buildNumber: number;
  ownerLogin: string;
  repositoryName: string;
  build: BuildStatusChipProps["build"] | null;
  repository:
    | (BuildStatusChipProps["repository"] & ReviewButtonProps["repository"])
    | null;
}

const BuildReviewButton = memo(
  ({ repository }: { repository: ReviewButtonProps["repository"] }) => {
    const user = useUser();
    return user ? (
      <ReviewButton repository={repository} />
    ) : (
      <GitHubLoginButton />
    );
  }
);

export const BuildHeader = memo(
  ({
    buildNumber,
    ownerLogin,
    repositoryName,
    build,
    repository,
  }: BuildHeaderProps) => {
    return (
      <div className="flex flex-none flex-grow-0 items-center justify-between border-b border-b-border p-4">
        <div className="flex h-[32px] items-center gap-4">
          <BrandLink />
          <div className="flex flex-col justify-center">
            <div className="mb-1 text-sm font-medium leading-none">
              Build {buildNumber}
            </div>
            <RepositoryLink
              ownerLogin={ownerLogin}
              repositoryName={repositoryName}
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
