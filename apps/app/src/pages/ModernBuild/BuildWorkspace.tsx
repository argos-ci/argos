import { BuildDetail } from "./BuildDetail";
import { BuildSidebar } from "./BuildSidebar";
import { BuildDiffProvider } from "./BuildDiffState";
import { BuildStatusDescription } from "@/modern/containers/BuildStatusDescription";
import { FragmentType, graphql, useFragment } from "@/gql";
import { memo } from "react";
import { BuildParams } from "./BuildParams";

const BuildProgress = memo(() => {
  return (
    <div className="flex flex-1 flex-col items-center gap-10 p-10">
      <div className="text-4xl">Your build is cooking...</div>
      <div>
        <div className="egg-loader" />
      </div>
    </div>
  );
});

export const BuildFragment = graphql(`
  fragment BuildWorkspace_Build on Build {
    ...BuildSidebar_Build
    ...BuildStatusDescription_Build
    ...BuildDetail_Build
    status
    stats {
      total: screenshotCount
      failure: failedScreenshotCount
      changed: updatedScreenshotCount
      added: addedScreenshotCount
      removed: removedScreenshotCount
      unchanged: stableScreenshotCount
    }
  }
`);

export const RepositoryFragment = graphql(`
  fragment BuildWorkspace_Repository on Repository {
    ...BuildStatusDescription_Repository
  }
`);

export const BuildWorkspace = (props: {
  params: BuildParams;
  build: FragmentType<typeof BuildFragment>;
  repository: FragmentType<typeof RepositoryFragment>;
}) => {
  const build = useFragment(BuildFragment, props.build);
  const repository = useFragment(RepositoryFragment, props.repository);
  const githubRepoUrl = `https://github.com/${props.params.ownerLogin}/${props.params.repositoryName}`;

  switch (build.status) {
    case "aborted":
    case "error":
    case "expired":
      return (
        <div className="flex-1 p-10 text-center text-xl">
          <BuildStatusDescription build={build} repository={repository} />
        </div>
      );
    case "pending":
    case "progress":
      return <BuildProgress />;
    default:
      return (
        <BuildDiffProvider params={props.params} stats={build?.stats ?? null}>
          <div className="flex min-h-0 flex-1">
            <BuildSidebar build={build} githubRepoUrl={githubRepoUrl} />
            {build ? <BuildDetail build={build} /> : null}
          </div>
        </BuildDiffProvider>
      );
  }
};
