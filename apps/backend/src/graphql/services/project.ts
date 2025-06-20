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
  Project,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Test,
  User,
} from "@/database/models/index.js";
import { transaction } from "@/database/transaction.js";

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
  });
  await unsafe_deleteProject({ projectId: project.id });
}

/**
 * Delete a project and all associated data without checking permissions.
 */
export async function unsafe_deleteProject(args: {
  projectId: string;
  trx?: TransactionOrKnex;
}) {
  await transaction(args.trx, async (trx) => {
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
    await trx("test_stats_changes")
      .join("tests", "test_stats_changes.testId", "tests.id")
      .where("tests.projectId", args.projectId)
      .delete();
    await Test.query(trx).where("projectId", args.projectId).delete();
    await Project.query(trx).findById(args.projectId).delete();
  });
}
