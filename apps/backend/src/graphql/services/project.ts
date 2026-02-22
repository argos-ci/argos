import { invariant } from "@argos/util/invariant";
import { TransactionOrKnex } from "objection";

import {
  AutomationActionRun,
  AutomationRule,
  AutomationRun,
  Build,
  BuildNotification,
  BuildReview,
  BuildShard,
  IgnoredChange,
  Project,
  ProjectUser,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  ScreenshotDiffReview,
  TeamUser,
  Test,
  User,
} from "@/database/models";
import { transaction } from "@/database/transaction";
import { sendNotification } from "@/notification";

async function getProjectDeleteNotificationRecipients(project: Project) {
  await project.$fetchGraph("account", { skipFetched: true });
  invariant(project.account, "project.account is undefined");

  if (project.account.type !== "team") {
    return project.account.$getOwnerIds();
  }

  const teamId = project.account.teamId;
  invariant(teamId, "project.account.teamId is undefined");

  const [ownerIds, teamContributors, projectContributors] = await Promise.all([
    project.account.$getOwnerIds(),
    TeamUser.query()
      .select("userId")
      .where("team_users.teamId", teamId)
      .where("team_users.userLevel", "contributor")
      .orderBy("userId", "asc"),
    ProjectUser.query()
      .select("project_users.userId", "project_users.userLevel")
      .where("project_users.projectId", project.id),
  ]);

  const projectContributorsById = new Map(
    projectContributors.map((contributor) => [contributor.userId, contributor]),
  );

  const projectAdminContributorIds = teamContributors
    .filter((contributor) => {
      const projectContributor = projectContributorsById.get(
        contributor.userId,
      );
      const level = projectContributor?.userLevel ?? project.defaultUserLevel;
      return level === "admin";
    })
    .map((contributor) => contributor.userId);

  return [...new Set([...ownerIds, ...projectAdminContributorIds])];
}

/**
 * Get a project by ID, ensuring the user has admin permissions.
 */
export async function getAdminProject(args: {
  id: string;
  user: User | undefined | null;
  withGraphFetched?: string;
}): Promise<Project> {
  invariant(args.user, "no user");
  const query = Project.query().findById(args.id).throwIfNotFound();
  if (args.withGraphFetched) {
    query.withGraphFetched(args.withGraphFetched);
  }
  const project = await query;
  const permissions = await project.$getPermissions(args.user);
  invariant(permissions.includes("admin"), "not admin");
  return project;
}

/**
 * Delete a project and all associated data after checking permissions.
 */
export async function deleteProject(args: {
  id: string;
  user: User | undefined | null;
}) {
  const project = await getAdminProject({
    id: args.id,
    user: args.user,
    withGraphFetched: "account",
  });
  const recipients = await getProjectDeleteNotificationRecipients(project);
  invariant(project.account, "project.account is undefined");
  await unsafe_deleteProject({ projectId: project.id });
  if (recipients.length > 0) {
    await sendNotification({
      type: "project_deleted",
      data: {
        accountType: project.account.type,
        accountName: project.account.name,
        accountSlug: project.account.slug,
        projectName: project.name,
      },
      recipients,
    });
  }
}

/**
 * Delete a project and all associated data without checking permissions.
 */
export async function unsafe_deleteProject(args: {
  projectId: string;
  trx?: TransactionOrKnex;
}) {
  await transaction(args.trx, async (trx) => {
    await ScreenshotDiffReview.query(trx)
      .whereIn(
        "buildReviewId",
        BuildReview.query(trx)
          .select("build_reviews.id")
          .joinRelated("build")
          .where("build.projectId", args.projectId),
      )
      .delete();
    await ScreenshotDiff.query(trx)
      .joinRelated("build")
      .where("build.projectId", args.projectId)
      .delete();
    await Screenshot.query(trx)
      .joinRelated("screenshotBucket")
      .where("screenshotBucket.projectId", args.projectId)
      .delete();
    await BuildNotification.query(trx)
      .joinRelated("build")
      .where("build.projectId", args.projectId)
      .delete();
    const AutomationRuns = await AutomationRun.query(trx)
      .select("automation_runs.id")
      .joinRelated("automationRule")
      .where("automationRule.projectId", args.projectId);
    if (AutomationRuns.length > 0) {
      const AutomationRunIds = AutomationRuns.map((run) => run.id);
      await AutomationActionRun.query(trx)
        .whereIn("automationRunId", AutomationRunIds)
        .delete();
      await AutomationRun.query(trx).whereIn("id", AutomationRunIds).delete();
    }
    await AutomationRule.query(trx).where("projectId", args.projectId).delete();
    await BuildReview.query(trx)
      .joinRelated("build")
      .where("build.projectId", args.projectId)
      .delete();
    await BuildShard.query(trx)
      .joinRelated("build")
      .where("build.projectId", args.projectId)
      .delete();
    await Build.query(trx).where("projectId", args.projectId).delete();
    await ScreenshotBucket.query(trx)
      .where("projectId", args.projectId)
      .delete();
    await trx("test_stats_builds")
      .join("tests", "test_stats_builds.testId", "tests.id")
      .where("tests.projectId", args.projectId)
      .delete();
    await trx("test_stats_fingerprints")
      .join("tests", "test_stats_fingerprints.testId", "tests.id")
      .where("tests.projectId", args.projectId)
      .delete();
    await ProjectUser.query(trx).where("projectId", args.projectId).delete();
    await IgnoredChange.query(trx).where("projectId", args.projectId).delete();
    await Test.query(trx).where("projectId", args.projectId).delete();
    await Project.query(trx).findById(args.projectId).delete();
  });
}
