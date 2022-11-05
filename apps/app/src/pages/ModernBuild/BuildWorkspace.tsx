import { BuildDetail, BuildDetailProps } from "./BuildDetail";
import { BuildSidebar, BuildSidebarProps } from "./BuildSidebar";
import { BuildDiffProvider } from "./BuildDiffState";
import type { BuildStats } from "@/modern/containers/Build";
import type { BuildParams } from "./BuildParams";

export interface BuildWorkspaceProps {
  build:
    | (BuildSidebarProps["build"] &
        BuildDetailProps["build"] & { stats: BuildStats | null })
    | null;
  params: BuildParams;
}

export const BuildWorkspace = ({ params, build }: BuildWorkspaceProps) => {
  const githubRepoUrl = `https://github.com/${params.ownerLogin}/${params.repositoryName}`;

  return (
    <BuildDiffProvider params={params} stats={build?.stats ?? null}>
      <div className="flex min-h-0 flex-1">
        <BuildSidebar build={build} githubRepoUrl={githubRepoUrl} />
        {build ? <BuildDetail build={build} /> : null}
      </div>
    </BuildDiffProvider>
  );
};
