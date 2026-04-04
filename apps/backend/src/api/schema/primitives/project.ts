import { z } from "zod";

import { GithubRepository, type Project } from "@/database/models";

export const ProjectOwner = z.string().min(1);
export const ProjectName = z.string().min(1);

export const ProjectSchema = z
  .object({
    id: z.string(),
    name: ProjectName,
    defaultBaseBranch: z.string(),
    hasRemoteContentAccess: z.boolean(),
  })
  .meta({
    description: "Project",
    id: "Project",
  });

export async function serializeProject(
  project: Project,
): Promise<z.infer<typeof ProjectSchema>> {
  await project.$fetchGraph(
    "[githubRepository.repoInstallations.installation,gitlabProject]",
  );

  const defaultBaseBranch = await project.$getDefaultBaseBranch();

  const installation = project.githubRepository
    ? GithubRepository.pickBestInstallation(project.githubRepository)
    : null;

  // We have remote content access if the installation is the main app
  const hasRemoteContentAccess = installation?.app === "main";

  return {
    id: project.id,
    name: project.name,
    defaultBaseBranch,
    hasRemoteContentAccess,
  };
}
