import { invariant } from "@argos/util/invariant";

import { Project, ProjectUser, TeamUser } from "@/database/models";

/**
 * Get the database ids of every user who has at least "view" access to the
 * project. These are the users that may legitimately be mentioned in a comment
 * on one of its builds, or requested as a reviewer. Mirrors the "view" branch of
 * {@link Project.getPermissions}.
 */
export async function getProjectMemberIds(project: Project): Promise<string[]> {
  await project.$fetchGraph("account", { skipFetched: true });
  invariant(project.account, "Project account not found");
  const { account } = project;

  // Personal project: only the owner can access it.
  if (account.type === "user") {
    return account.userId ? [account.userId] : [];
  }

  const { teamId } = account;
  invariant(teamId, "Team account without teamId");

  const teamUsers = await TeamUser.query()
    .where("teamId", teamId)
    .select("userId", "userLevel");

  const userIds = new Set<string>();
  const contributorIds: string[] = [];
  for (const teamUser of teamUsers) {
    if (teamUser.userLevel === "contributor") {
      contributorIds.push(teamUser.userId);
    } else {
      // Owners and members always have access.
      userIds.add(teamUser.userId);
    }
  }

  if (contributorIds.length > 0) {
    if (project.defaultUserLevel) {
      // Every contributor inherits at least the project's default level, which
      // always grants "view".
      contributorIds.forEach((id) => userIds.add(id));
    } else {
      // Otherwise only contributors with an explicit project-level access.
      const projectUsers = await ProjectUser.query()
        .where("projectId", project.id)
        .whereIn("userId", contributorIds)
        .whereNotNull("userLevel")
        .select("userId");
      projectUsers.forEach((projectUser) => userIds.add(projectUser.userId));
    }
  }

  return [...userIds];
}

/**
 * Narrow a list of candidate recipients to the users who may still view the
 * project they would be told about, dropping `excludeUserIds` (the author, and
 * anyone already covered by a more specific notification) on the way.
 *
 * A subscription outlives the access that created it: the rows in
 * `comment_notifications_subscriptions` and `{build,test}_notification_subscriptions`
 * survive a user leaving the team and a project turning private, and a test is
 * followed for as long as the test exists rather than for the life of one build.
 * Since comment and review emails embed what was written, the project's
 * *current* members are the authority on who may receive one — not who once
 * asked to be told.
 */
export async function getProjectNotificationRecipients(input: {
  project: Project;
  userIds: string[];
  excludeUserIds?: string[];
}): Promise<string[]> {
  const { project, userIds, excludeUserIds = [] } = input;
  const excluded = new Set(excludeUserIds);
  const candidates = userIds.filter((id) => !excluded.has(id));
  // Nobody left to notify: skip the membership lookup entirely.
  if (candidates.length === 0) {
    return [];
  }
  const memberIds = new Set(await getProjectMemberIds(project));
  return candidates.filter((id) => memberIds.has(id));
}
