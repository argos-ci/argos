import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { QueryBuilder, TransactionOrKnex } from "objection";

import {
  Account,
  AuditTrail,
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
import { isValidPgBigInt } from "@/database/util/biginteger";
import { sendNotification } from "@/notification";

import { invalidId } from "../util";

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
  if (!isValidPgBigInt(args.id)) {
    throw invalidId();
  }
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
 * Apply the project-visibility rules for a user to a `Project` query, returning
 * the filtered query — or `null` when the user can see no project at all, so the
 * caller can decide whether to throw or return an empty result.
 *
 * This is the single source of truth shared by the `Account.projects` resolver
 * and {@link getVisibleProjectIds}:
 * - staff see every project
 * - on a user account, only the owner
 * - on a team, owners/members see all; contributors see projects they are a
 *   contributor on (or that expose a default user level)
 */
export function applyProjectVisibility<R>(
  query: QueryBuilder<Project, R>,
  args: { account: Account; user: { id: string; staff: boolean } },
): QueryBuilder<Project, R> | null {
  const { account, user } = args;

  // Staff can view all projects
  if (user.staff) {
    return query;
  }

  switch (account.type) {
    case "user":
      return account.userId === user.id ? query : null;
    case "team": {
      const teamUserQuery = TeamUser.query().where({
        teamId: account.teamId,
        userId: user.id,
      });
      return query.where((qb) => {
        // User is a team member or owner
        qb.whereExists(
          teamUserQuery
            .select(1)
            .clone()
            .whereIn("userLevel", ["owner", "member"]),
        ).orWhere((qb) => {
          // User is a contributor
          qb.whereExists(
            teamUserQuery.select(1).clone().where("userLevel", "contributor"),
          ).where((qb) => {
            // And is a contributor to the project
            qb.whereExists(
              ProjectUser.query()
                .select(1)
                .whereRaw(`projects.id = project_users."projectId"`)
                .where("userId", user.id),
            )
              // Or where there is a default user level set on the project
              .orWhereNotNull("projects.defaultUserLevel");
          });
        });
      });
    }
    default:
      return assertNever(account.type);
  }
}

/**
 * Resolve the ids of the projects an authenticated user can see within an
 * account.
 *
 * Returns an empty array when the user can see nothing, so callers can short
 * circuit without a query.
 */
export async function getVisibleProjectIds(args: {
  account: Account;
  user: { id: string; staff: boolean };
}): Promise<string[]> {
  const query = applyProjectVisibility(
    Project.query().where("accountId", args.account.id).select("projects.id"),
    args,
  );
  if (!query) {
    return [];
  }
  const rows = await query;
  return rows.map((row) => row.id);
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
    await AuditTrail.query(trx).where("projectId", args.projectId).delete();
    await Test.query(trx).where("projectId", args.projectId).delete();
    await Project.query(trx).findById(args.projectId).delete();
  });
}
