import { z } from "zod";

import { GithubRepository, type Project } from "@/database/models";
import { ORIGIN_CONTENTS_READ_SCOPE } from "@/origin/url";

export const AccountSlug = z.string().min(1);
export const ProjectName = z.string().min(1);

/**
 * The project a project token acts on, for the endpoints not addressed by
 * project. See `resolveAuthProject`.
 */
export const TokenProjectPath = z.string().min(1).nullish().meta({
  description:
    "Project to act on, as `owner/project`. Required when the project token is linked to several projects, ignored when it is linked to only one.",
});

export const AccountSchema = z
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

export const AwaitingReviewStatus = z.enum(["failure", "pending"]).meta({
  description:
    "Status reported to the Git provider while a build has changes waiting for a review: `failure`, or `pending` until the build is approved or rejected (`running` on GitLab).",
  id: "AwaitingReviewStatus",
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
        "Glob matching the branches whose builds are approved automatically. Ignored while `autoApprovalEnabled` is `false`.",
    }),
    autoApprovalEnabled: z.boolean().meta({
      description:
        "Whether builds on branches matching `autoApprovedBranchGlob` are approved automatically. When `false`, every build needs a review, including the ones on the base branch.",
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
    awaitingReviewStatus: AwaitingReviewStatus,
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
      description:
        "Whether Argos serves the deployments it hosts for this project. Deployments hosted elsewhere are not affected.",
    }),
    githubDeploymentEnabled: z.boolean().meta({
      description:
        "Whether Argos reports deployments to the linked GitHub repository as GitHub deployments.",
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
  const { account, githubRepository, originRepository } =
    await project.$fetchGraph(
      "[account,githubRepository.repoInstallations.installation,gitlabProject,originRepository.installation]",
    );

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

  const installation = githubRepository
    ? GithubRepository.pickBestInstallation(githubRepository)
    : null;

  // We have remote content access if the GitHub installation is the main app,
  // or if the Origin installation was granted the contents scope.
  const hasRemoteContentAccess = originRepository
    ? Boolean(
        originRepository.installation &&
        !originRepository.installation.deleted &&
        originRepository.installation.hasScope(ORIGIN_CONTENTS_READ_SCOPE),
      )
    : installation?.app === "main";

  return {
    id: project.id,
    account: {
      id: account.id,
      slug: account.slug,
    },
    name: project.name,
    defaultBaseBranch,
    hasRemoteContentAccess,
    autoApprovedBranchGlob,
    autoApprovalEnabled: project.autoApprovalEnabled,
    deploymentProductionBranchGlob,
    private: !isPublic,
    summaryCheck: project.summaryCheck,
    awaitingReviewStatus: project.awaitingReviewStatus,
    prCommentEnabled: project.prCommentEnabled,
    githubActionsOidcEnabled: project.githubActionsOidcEnabled,
    tokenlessAuthEnabled: project.tokenlessAuthEnabled,
    deploymentEnabled: project.deploymentEnabled,
    githubDeploymentEnabled: project.githubDeploymentEnabled,
    deploymentAuth: project.deploymentAuth,
    defaultUserLevel: project.defaultUserLevel,
    ignoreConfig: project.$getIgnoreConfig(),
  };
}
