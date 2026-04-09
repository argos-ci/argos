import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { GithubRepository, type Project } from "@/database/models";

export const AccountSlug = z.string().min(1);
export const ProjectName = z.string().min(1);

const AccountSchema = z
  .object({
    id: z.string(),
    slug: AccountSlug,
  })
  .meta({
    description: "Account",
    id: "Account",
  });

export const ProjectSchema = z
  .object({
    id: z.string(),
    account: AccountSchema,
    name: ProjectName,
    defaultBaseBranch: z.string(),
    hasRemoteContentAccess: z.boolean(),
  })
  .meta({
    description: "Project",
    id: "Project",
  });

/**
 * Serialize a project into the public API shape, including its resolved default
 * base branch and whether remote content access is available through the main
 * GitHub app installation.
 */
export async function serializeProject(
  project: Project,
): Promise<z.infer<typeof ProjectSchema>> {
  await project.$fetchGraph(
    "[account,githubRepository.repoInstallations.installation,gitlabProject]",
  );

  invariant(project.account, "account is not fetched");

  const defaultBaseBranch = await project.$getDefaultBaseBranch();

  const installation = project.githubRepository
    ? GithubRepository.pickBestInstallation(project.githubRepository)
    : null;

  // We have remote content access if the installation is the main app
  const hasRemoteContentAccess = installation?.app === "main";

  return {
    id: project.id,
    account: {
      id: project.account.id,
      slug: project.account.slug,
    },
    name: project.name,
    defaultBaseBranch,
    hasRemoteContentAccess,
  };
}
