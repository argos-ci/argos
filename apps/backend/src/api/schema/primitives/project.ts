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

export const SummaryCheck = z.enum(["always", "never", "auto"]).meta({
  description:
    "When to post the summary check on a pull request: `always`, `never`, or `auto` (only once the project has a baseline).",
  id: "SummaryCheck",
});

export const DeploymentAuth = z
  .enum(["public", "domain-private", "private"])
  .meta({
    description:
      "Who can reach the project's deployments: anyone (`public`), anyone with the domain (`domain-private`), or team members only (`private`, teams only).",
    id: "DeploymentAuth",
  });

export const ProjectUserLevel = z.enum(["admin", "reviewer", "viewer"]).meta({
  description:
    "Access level given to team members that are not explicit contributors on the project. `null` means they get no access.",
  id: "ProjectUserLevel",
});

export const IgnoreConfigSchema = z
  .object({
    enabled: z.boolean().meta({
      description: "Whether changes can be ignored on this project.",
    }),
    autoIgnore: z
      .object({
        changes: z.int().min(1).meta({
          description:
            "Number of times a change must reappear before it is ignored automatically.",
        }),
      })
      .nullable()
      .meta({
        description: "Auto-ignore settings, `null` when auto-ignore is off.",
      }),
  })
  .meta({
    description: "How flaky changes are ignored on a project.",
    id: "IgnoreConfig",
  });

export const ProjectSchema = z
  .object({
    id: z.string(),
    account: AccountSchema,
    name: ProjectName,
    defaultBaseBranch: z.string(),
    hasRemoteContentAccess: z.boolean(),
    autoApprovedBranchGlob: z.string().meta({
      description:
        "Glob matching the branches whose builds are approved automatically.",
    }),
    deploymentProductionBranchGlob: z.string().meta({
      description:
        "Glob matching the branches whose deployments are treated as production.",
    }),
    private: z.boolean().meta({
      description:
        "Whether the project is private. Resolved from the linked repository unless overridden.",
    }),
    summaryCheck: SummaryCheck,
    prCommentEnabled: z.boolean().meta({
      description: "Whether Argos comments on pull requests.",
    }),
    githubActionsOidcEnabled: z.boolean().meta({
      description:
        "Whether builds can authenticate with a GitHub Actions OIDC token instead of a project token.",
    }),
    tokenlessAuthEnabled: z.boolean().meta({
      description:
        "Whether builds from forked pull requests can be uploaded without a token.",
    }),
    deploymentEnabled: z.boolean().meta({
      description: "Whether deployments are served for this project.",
    }),
    deploymentAuth: DeploymentAuth,
    defaultUserLevel: ProjectUserLevel.nullable(),
    ignoreConfig: IgnoreConfigSchema,
  })
  .meta({
    description: "Project",
    id: "Project",
  });

/**
 * Serialize a project into the public API shape, including its resolved
 * branch globs and privacy (which fall back to the linked repository when the
 * project does not override them) and whether remote content access is
 * available through the main GitHub app installation.
 */
export async function serializeProject(
  project: Project,
): Promise<z.infer<typeof ProjectSchema>> {
  await project.$fetchGraph(
    "[account,githubRepository.repoInstallations.installation,gitlabProject]",
  );

  invariant(project.account, "account is not fetched");

  const [
    defaultBaseBranch,
    autoApprovedBranchGlob,
    deploymentProductionBranchGlob,
    isPublic,
  ] = await Promise.all([
    project.$getDefaultBaseBranch(),
    project.$getAutoApprovedBranchGlob(),
    project.$getDeploymentProductionBranchGlob(),
    project.$checkIsPublic(),
  ]);

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
    autoApprovedBranchGlob,
    deploymentProductionBranchGlob,
    private: !isPublic,
    summaryCheck: project.summaryCheck,
    prCommentEnabled: project.prCommentEnabled,
    githubActionsOidcEnabled: project.githubActionsOidcEnabled,
    tokenlessAuthEnabled: project.tokenlessAuthEnabled,
    deploymentEnabled: project.deploymentEnabled,
    deploymentAuth: project.deploymentAuth,
    defaultUserLevel: project.defaultUserLevel,
    ignoreConfig: project.$getIgnoreConfig(),
  };
}
