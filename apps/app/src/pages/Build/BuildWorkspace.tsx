import { memo } from "react";

import { BuildStatusDescription } from "@/containers/BuildStatusDescription";
import { FragmentType, graphql, useFragment } from "@/gql";

import { BuildDetail } from "./BuildDetail";
import { BuildDiffProvider } from "./BuildDiffState";
import { BuildParams } from "./BuildParams";
import { BuildSidebar } from "./BuildSidebar";

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
      total
      failure
      changed
      added
      removed
      unchanged
    }
  }
`);

export const ProjectFragment = graphql(`
  fragment BuildWorkspace_Project on Project {
    ...BuildStatusDescription_Project
  }
`);

export const BuildWorkspace = (props: {
  params: BuildParams;
  build: FragmentType<typeof BuildFragment>;
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const build = useFragment(BuildFragment, props.build);
  const project = useFragment(ProjectFragment, props.project);
  const githubRepoUrl = `https://github.com/${props.params.accountSlug}/${props.params.projectName}`;

  switch (build.status) {
    case "aborted":
    case "error":
    case "expired":
      return (
        <div className="flex-1 p-10 text-center text-xl">
          <BuildStatusDescription build={build} project={project} />
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
