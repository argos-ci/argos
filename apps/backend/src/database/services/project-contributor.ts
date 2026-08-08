/**
 * Per-project access control: who, among a team's contributors, is granted
 * access to a given project and at what level.
 *
 * Team owners and members already reach every project (see
 * `Project.getPermissions`); this list only governs the contributors, who
 * otherwise see a project solely through its `defaultUserLevel`.
 *
 * Shared by the GraphQL API (`Project.contributors`,
 * `addOrUpdateProjectContributor`, `removeContributorFromProject`) and the
 * public REST API so both enforce the same rules.
 */
import type { QueryBuilder } from "objection";

import { boom } from "@/util/error";

import { Account } from "../models/Account";
import type { Project } from "../models/Project";
import { ProjectUser } from "../models/ProjectUser";
import type { User } from "../models/User";
import { isValidPgBigInt } from "../util/biginteger";
import type { UserLevel } from "../util/user-level";
import { assertProjectAdmin } from "./project";

export type ProjectUserLevel = UserLevel;

/**
 * Build the query listing a project's contributors. Callers paginate.
 *
 * `currentUserId` floats the caller to the top, so someone checking their own
 * access finds it on the first page of a long list.
 */
export function queryProjectContributors(args: {
  projectId: string;
  currentUserId: string;
}): QueryBuilder<ProjectUser, ProjectUser[]> {
  return ProjectUser.query()
    .where("project_users.projectId", args.projectId)
    .orderByRaw(
      `(CASE WHEN project_users."userId" = ? THEN 0
     ELSE project_users."id"
     END) ASC
    `,
      args.currentUserId,
    );
}

/**
 * Resolve the user behind a public account id, or throw `404`.
 */
async function getUserIdFromAccountId(userAccountId: string): Promise<string> {
  if (!isValidPgBigInt(userAccountId)) {
    throw boom(400, "Invalid user account ID.");
  }
  const account = await Account.query().findById(userAccountId);
  if (!account?.userId) {
    throw boom(404, "User not found.");
  }
  return account.userId;
}

/**
 * Grant a user access to a project, or change the level they already hold.
 * Idempotent: re-granting the level they have returns the existing row.
 */
export async function addOrUpdateProjectContributor(args: {
  project: Project;
  user: User;
  userAccountId: string;
  level: ProjectUserLevel;
}): Promise<ProjectUser> {
  await assertProjectAdmin(args);
  const userId = await getUserIdFromAccountId(args.userAccountId);

  const projectUser = await ProjectUser.query().findOne({
    projectId: args.project.id,
    userId,
  });

  if (projectUser) {
    if (projectUser.userLevel === args.level) {
      return projectUser;
    }
    return projectUser.$query().patchAndFetch({ userLevel: args.level });
  }

  return ProjectUser.query().insertAndFetch({
    projectId: args.project.id,
    userId,
    userLevel: args.level,
  });
}

/**
 * Revoke a user's access to a project.
 *
 * Administrators can remove anyone; anyone can remove *themselves*, so a
 * contributor can always walk away from a project without needing an admin.
 */
export async function removeProjectContributor(args: {
  project: Project;
  user: User;
  /** Public account id of the contributor to remove. */
  userAccountId: string;
}): Promise<{ projectContributorId: string }> {
  const userId = await getUserIdFromAccountId(args.userAccountId);

  if (userId !== args.user.id) {
    await assertProjectAdmin(args);
  }

  const projectUser = await ProjectUser.query()
    .select("id")
    .findOne({ projectId: args.project.id, userId });

  if (!projectUser) {
    throw boom(404, "This user is not a contributor on the project.");
  }

  await projectUser.$query().delete();

  return { projectContributorId: projectUser.id };
}
