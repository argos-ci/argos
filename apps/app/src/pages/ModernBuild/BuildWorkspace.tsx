import { BuildDetail, BuildDetailProps } from "./BuildDetail";
import { BuildSidebar, BuildSidebarProps } from "./BuildSidebar";
import { BuildDiffProvider } from "./BuildDiffState";
import type { Build, BuildStats } from "@/modern/containers/Build";
import type { BuildParams } from "./BuildParams";
import {
  BuildStatusDescription,
  BuildStatusDescriptionProps,
} from "@/modern/containers/BuildStatusDescription";

export interface BuildWorkspaceProps {
  build:
    | BuildSidebarProps["build"] &
        BuildStatusDescriptionProps["build"] &
        BuildDetailProps["build"] & {
          status: Build["status"];
          stats: BuildStats | null;
        };
  repository: BuildStatusDescriptionProps["repository"];
  params: BuildParams;
}

const BuildProgress = () => {
  return (
    <div className="flex flex-1 flex-col items-center gap-10 p-10">
      <div className="text-4xl">Your build is cooking...</div>
      <div>
        <div className="egg-loader" />
      </div>
    </div>
  );
};

export const BuildWorkspace = ({
  params,
  build,
  repository,
}: BuildWorkspaceProps) => {
  const githubRepoUrl = `https://github.com/${params.ownerLogin}/${params.repositoryName}`;

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
        <BuildDiffProvider params={params} stats={build?.stats ?? null}>
          <div className="flex min-h-0 flex-1">
            <BuildSidebar build={build} githubRepoUrl={githubRepoUrl} />
            {build ? <BuildDetail build={build} /> : null}
          </div>
        </BuildDiffProvider>
      );
  }
};
