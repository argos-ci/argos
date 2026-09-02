import { PROJECT_NAME_MAX_LENGTH } from "@argos/schemas/project";
import { invariant } from "@argos/util/invariant";
import { TransactionOrKnex } from "objection";

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
  Media,
  MediaVersion,
  Project,
  ProjectDomain,
  ProjectUser,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  ScreenshotDiffReview,
  TeamUser,
  Test,
  User,
} from "@/database/models";
import {
  applyProjectVisibility,
  DELETED_PROJECT_NAME_PREFIX,
} from "@/database/services/project";
import { transaction } from "@/database/transaction";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { deleteDomainTenant } from "@/deployment/cloudfront";
import {
  deleteUnreferencedMediaDiffObjects,
  deleteUnreferencedMediaObjects,
  getMediaDiffObjects,
} from "@/media/object";
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
  const query = Project.queryNotDeleted().findById(args.id).throwIfNotFound();
  if (args.withGraphFetched) {
    query.withGraphFetched(args.withGraphFetched);
  }
  const project = await query;
  const permissions = await project.$getPermissions(args.user);
  invariant(permissions.includes("admin"), "not admin");
  return project;
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
 * Soft-delete a project after checking permissions.
 *
 * The row is stamped rather than dropped. A hard delete walks every build,
 * diff, review and screenshot the project ever produced — the busiest tables in
 * the schema — and holds locks on them the whole way through, so deleting a
 * large project was felt by every other project on the instance. Nothing is
 * served from a stamped project: the surfaces that resolve one all filter on
 * `deletedAt`, most of them through {@link Project.queryNotDeleted}.
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

  const cloudfrontTenantIds = await transaction(async (trx) => {
    // The stamp goes first and carries its own `deletedAt IS NULL`, so it is
    // the gate rather than the read above it. A second request that got past
    // that read before this one committed blocks on the row here, re-checks the
    // predicate, and updates nothing — without it both would get this far and
    // every owner would be told twice that the project was deleted.
    const stamped = await Project.query(trx)
      .findById(project.id)
      .whereNull("projects.deletedAt")
      .patch({
        name: getDeletedProjectName(project),
        deletedAt: new Date().toISOString(),
      });

    if (stamped === 0) {
      return null;
    }

    // The domains are the one thing still released for real: a CloudFront
    // tenant is billed for as long as it exists, and a domain left claimed
    // cannot be moved to another project. Both are cheap to drop —
    // `project_domains` holds a handful of rows, none of the tables the hard
    // delete had to walk.
    return releaseProjectDomains({ projectId: project.id, trx });
  });

  // Lost the race, so the request that won it owns the notification.
  if (cloudfrontTenantIds === null) {
    return;
  }

  await Promise.all(cloudfrontTenantIds.map((id) => deleteDomainTenant(id)));

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
 * The name a deleted project is parked under, which frees the one it held: the
 * account is meant to be able to recreate what it just removed.
 *
 * The id leads, so two parked names can never collide — the same name can be
 * deleted, recreated and deleted again — and it survives the truncation below.
 * The original trails it because a deleted project is still listed in the usage
 * charts, and this is the name they label it with.
 *
 * Truncated to `PROJECT_NAME_MAX_LENGTH`: the prefix must not push the name
 * past what the `name` property is validated against on the way in.
 */
function getDeletedProjectName(project: Project): string {
  return `${DELETED_PROJECT_NAME_PREFIX}${project.id}-${project.name}`.slice(
    0,
    PROJECT_NAME_MAX_LENGTH,
  );
}

/**
 * Drop a project's domains, returning the CloudFront tenant ids they held so
 * the caller can delete the tenants once the transaction has committed — a
 * tenant is billed and is not rolled back with it.
 */
async function releaseProjectDomains(args: {
  projectId: string;
  trx: TransactionOrKnex;
}): Promise<string[]> {
  const projectDomains = await ProjectDomain.query(args.trx)
    .select("cloudfrontTenantId")
    .where({ projectId: args.projectId })
    .whereNotNull("cloudfrontTenantId");
  await ProjectDomain.query(args.trx)
    .where("projectId", args.projectId)
    .delete();
  return projectDomains
    .map((projectDomain) => projectDomain.cloudfrontTenantId)
    .filter((id): id is string => id !== null);
}

/**
 * Delete a project and all associated data without checking permissions.
 *
 * The heavy pass, kept for deleting an account outright: a project a user
 * deletes is soft-deleted by {@link deleteProject} instead.
 */
export async function unsafe_deleteProject(args: {
  projectId: string;
  trx?: TransactionOrKnex;
}) {
  // Collected inside the transaction, dropped after it commits: storage is not
  // transactional, so deleting the files first would lose them if the rollback
  // came after.
  let mediaKeys: string[] = [];
  let mediaDiffKeys: string[] = [];
  // Same reason as the media keys below: a CloudFront tenant is billed and is
  // not rolled back with the transaction, so its id is collected here and the
  // tenant dropped after. Note the caller may pass its own open transaction, in
  // which case "after" is not yet committed.
  let cloudfrontTenantIds: string[] = [];

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
    // Keys live on the versions, so they are collected before the media rows go —
    // `media_versions` cascades on delete, which would take them with it. The
    // before/after diff masks hang off those versions and cascade the same way,
    // so their keys have to be read here too or nothing is left naming them.
    const versions = await MediaVersion.query(trx)
      .select("media_versions.id", "media_versions.key")
      .joinRelated("media")
      .where("media.projectId", args.projectId);
    mediaKeys = versions.map((row) => row.key);
    mediaDiffKeys = (
      await getMediaDiffObjects(
        versions.map((row) => row.id),
        trx,
      )
    ).keys;
    await Media.query(trx).where("projectId", args.projectId).delete();
    cloudfrontTenantIds = await releaseProjectDomains({
      projectId: args.projectId,
      trx,
    });
    await ProjectUser.query(trx).where("projectId", args.projectId).delete();
    await IgnoredChange.query(trx).where("projectId", args.projectId).delete();
    await AuditTrail.query(trx).where("projectId", args.projectId).delete();
    await Test.query(trx).where("projectId", args.projectId).delete();
    await Project.query(trx).findById(args.projectId).delete();
  });

  // Outside the transaction on purpose — see where the keys are collected:
  // storage is not transactional, and a rollback after the files were dropped
  // would leave a live project whose media is gone. The rows are committed by
  // now, so nothing references these keys any more — but another project's media
  // could share one, which the checks inside handle.
  //
  // Two independent key namespaces, so the two passes go together.
  await Promise.all([
    deleteUnreferencedMediaObjects({
      keys: mediaKeys,
      excludeVersionIds: [],
    }),
    deleteUnreferencedMediaDiffObjects({
      keys: mediaDiffKeys,
      excludeDiffIds: [],
    }),
    ...cloudfrontTenantIds.map((id) => deleteDomainTenant(id)),
  ]);
}
