import { invariant } from "@argos/util/invariant";
import type { TransactionOrKnex } from "objection";

import {
  isProjectTokenPermission,
  PROJECT_TOKEN_PERMISSION_LIST,
  type ProjectTokenPermission,
} from "@/project-token/permissions";
import { boom } from "@/util/error";

import type { Account } from "../models/Account";
import { Project } from "../models/Project";
import { ProjectToken } from "../models/ProjectToken";
import { ProjectTokenProject } from "../models/ProjectTokenProject";
import type { User } from "../models/User";
import { transaction } from "../transaction";
import { isValidPgBigInt } from "../util/biginteger";
import { hashToken } from "./crypto";

/**
 * Whether a user can manage (create, rename, revoke) a token linked to these
 * projects of the account: an administrator of the account can manage any,
 * and a project administrator the ones linked only to projects they
 * administer. A token linked to no project anymore takes an account
 * administrator.
 *
 * Backs both the `viewerCanManage` field and the guard of every mutation.
 */
export async function canManageProjectToken(args: {
  account: Account;
  projects: Project[];
  user: User;
}): Promise<boolean> {
  const { account, projects, user } = args;
  const accountPermissions = await account.$getPermissions(user);
  if (accountPermissions.includes("admin")) {
    return true;
  }
  if (projects.length === 0) {
    return false;
  }
  const projectPermissions = await Promise.all(
    projects.map((project) => project.$getPermissions(user)),
  );
  return projectPermissions.every((permissions) =>
    permissions.includes("admin"),
  );
}

/**
 * The live projects of the token's account it is linked to, sorted by name.
 * A project transferred away keeps no link to the tokens of its former account
 * (see {@link moveProjectTokens}), but the account check keeps a token from
 * ever reaching one.
 */
export async function getProjectTokenProjects(
  projectToken: ProjectToken,
): Promise<Project[]> {
  return ProjectToken.relatedQuery("projects")
    .for(projectToken.id)
    .whereNull("projects.deletedAt")
    .where("projects.accountId", projectToken.accountId)
    .orderBy("projects.name");
}

/**
 * The projects of a token a user may see: a token shown on a project's page
 * must not name the private projects of the team the viewer cannot reach.
 */
export async function filterViewableProjects(
  projects: Project[],
  user: User,
): Promise<Project[]> {
  const permissions = await Promise.all(
    projects.map((project) => project.$getPermissions(user)),
  );
  return projects.filter((_project, index) =>
    permissions[index]?.includes("view"),
  );
}

async function assertCanManage(args: {
  account: Account;
  projects: Project[];
  user: User;
}) {
  if (!(await canManageProjectToken(args))) {
    throw boom(
      403,
      "You must be an administrator of the account, or of every project the token is linked to.",
    );
  }
}

/**
 * The tokens of an account. Takes an administrator of the account: a token
 * may reach any of its projects.
 */
export async function listAccountProjectTokens(args: {
  account: Account;
  user: User;
}): Promise<ProjectToken[]> {
  const { account, user } = args;
  const permissions = await account.$getPermissions(user);
  if (!permissions.includes("admin")) {
    throw boom(403, "You are not an administrator of this account.");
  }
  return ProjectToken.query()
    .where("accountId", account.id)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc");
}

/**
 * The tokens linked to a project. Takes the permission that used to reveal the
 * project's token (`review`): only names and dates are listed now.
 */
export async function listProjectProjectTokens(args: {
  project: Project;
  user: User;
}): Promise<ProjectToken[]> {
  const { project, user } = args;
  const permissions = await project.$getPermissions(user);
  if (!permissions.includes("review")) {
    throw boom(
      403,
      "You do not have permission to view this project's tokens.",
    );
  }
  return ProjectToken.query()
    .where("project_tokens.accountId", project.accountId)
    .whereExists(
      ProjectTokenProject.query()
        .whereColumn(
          "project_token_projects.projectTokenId",
          "project_tokens.id",
        )
        .where("project_token_projects.projectId", project.id),
    )
    .orderBy("project_tokens.createdAt", "desc")
    .orderBy("project_tokens.id", "desc");
}

function parseName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw boom(400, "Token name cannot be empty.");
  }
  if (trimmed.length > 255) {
    throw boom(400, "Token name cannot be longer than 255 characters.");
  }
  return trimmed;
}

function parsePermissions(permissions: string[]): ProjectTokenPermission[] {
  const unknown = permissions.filter(
    (permission) => !isProjectTokenPermission(permission),
  );
  if (unknown.length > 0) {
    throw boom(400, `Unknown permission: ${unknown.join(", ")}.`);
  }
  const parsed = PROJECT_TOKEN_PERMISSION_LIST.filter((permission) =>
    permissions.includes(permission),
  );
  if (parsed.length === 0) {
    throw boom(400, "A token needs at least one permission.");
  }
  return parsed;
}

function parseExpireAt(expireAt: string | null): string | null {
  if (expireAt === null) {
    return null;
  }
  const date = new Date(expireAt);
  if (Number.isNaN(date.getTime())) {
    throw boom(400, "Invalid expiration date.");
  }
  if (date <= new Date()) {
    throw boom(400, "The expiration date must be in the future.");
  }
  return date.toISOString();
}

/**
 * Create a token linked to some projects of an account. The token itself is
 * only returned here: it is stored hashed.
 */
export async function createProjectToken(args: {
  account: Account;
  user: User;
  name: string;
  projects: Project[];
  permissions: string[];
  expireAt: string | null;
}): Promise<{ projectToken: ProjectToken; token: string }> {
  const { account, user } = args;
  const name = parseName(args.name);
  const permissions = parsePermissions(args.permissions);
  const expireAt = parseExpireAt(args.expireAt);

  const projects = [
    ...new Map(args.projects.map((project) => [project.id, project])).values(),
  ];
  if (projects.length === 0) {
    throw boom(400, "A token must be linked to at least one project.");
  }
  if (
    projects.some(
      (project) => project.accountId !== account.id || project.deletedAt,
    )
  ) {
    throw boom(400, "A token can only be linked to projects of its account.");
  }

  await assertCanManage({ account, projects, user });

  const token = ProjectToken.generateToken();
  const projectToken = await transaction(async (trx) => {
    const projectToken = await ProjectToken.query(trx).insertAndFetch({
      accountId: account.id,
      name,
      token: hashToken(token),
      permissions,
      expireAt,
      createdById: user.id,
    });
    await ProjectTokenProject.query(trx).insert(
      projects.map((project) => ({
        projectTokenId: projectToken.id,
        projectId: project.id,
      })),
    );
    return projectToken;
  });

  return { projectToken, token };
}

/**
 * Load a token of an account by id, or throw a 404. Does not authorize: the
 * mutations below do.
 */
export async function loadProjectToken(args: {
  id: string;
  accountId?: string;
}): Promise<ProjectToken> {
  if (!isValidPgBigInt(args.id)) {
    throw boom(404, "Token not found.");
  }
  const query = ProjectToken.query().findById(args.id);
  if (args.accountId) {
    query.where("accountId", args.accountId);
  }
  const projectToken = await query;
  if (!projectToken) {
    throw boom(404, "Token not found.");
  }
  return projectToken;
}

async function assertCanManageToken(args: {
  projectToken: ProjectToken;
  user: User;
}) {
  const { projectToken, user } = args;
  const [account, projects] = await Promise.all([
    projectToken.$relatedQuery("account"),
    getProjectTokenProjects(projectToken),
  ]);
  invariant(account, "Project token account not found");
  await assertCanManage({ account, projects, user });
}

export async function renameProjectToken(args: {
  projectToken: ProjectToken;
  user: User;
  name: string;
}): Promise<ProjectToken> {
  const name = parseName(args.name);
  await assertCanManageToken(args);
  return args.projectToken.$query().patchAndFetch({ name });
}

/**
 * Revoke a token: CI holding it is rejected from the next request on.
 */
export async function deleteProjectToken(args: {
  projectToken: ProjectToken;
  user: User;
}): Promise<void> {
  const { projectToken } = args;
  await assertCanManageToken(args);
  await transaction(async (trx) => {
    await clearLegacyProjectToken({ projectToken, trx });
    await ProjectToken.query(trx).deleteById(projectToken.id);
  });
}

/**
 * Clear `projects.token` when it holds the token being revoked, or the
 * fallback in `auth/project.ts` would bring the token back on its next use.
 *
 * TODO: remove with the `projects.token` column.
 */
async function clearLegacyProjectToken(args: {
  projectToken: ProjectToken;
  trx: TransactionOrKnex;
}) {
  const { projectToken, trx } = args;
  const projects = await ProjectToken.relatedQuery("projects", trx)
    .for(projectToken.id)
    .select("projects.id", "projects.token")
    .whereNotNull("projects.token");
  const projectIds = projects
    .filter(
      (project) =>
        project.token !== null &&
        hashToken(project.token) === projectToken.token,
    )
    .map((project) => project.id);
  if (projectIds.length > 0) {
    await Project.query(trx).whereIn("id", projectIds).patch({ token: null });
  }
}

/**
 * Follow a project transferred to another account with its tokens, so CI
 * keeps uploading: a token linked only to this project moves along, and a
 * token linked to other projects too stays behind without it.
 */
export async function moveProjectTokens(args: {
  projectId: string;
  fromAccountId: string;
  toAccountId: string;
}): Promise<void> {
  const { projectId, fromAccountId, toAccountId } = args;
  await transaction(async (trx) => {
    const tokens = await ProjectToken.query(trx)
      .select("project_tokens.id")
      .where("project_tokens.accountId", fromAccountId)
      .whereExists(
        ProjectTokenProject.query(trx)
          .whereColumn(
            "project_token_projects.projectTokenId",
            "project_tokens.id",
          )
          .where("project_token_projects.projectId", projectId),
      );
    if (tokens.length === 0) {
      return;
    }
    const tokenIds = tokens.map((token) => token.id);
    const shared = await ProjectTokenProject.query(trx)
      .distinct("projectTokenId")
      .whereIn("projectTokenId", tokenIds)
      .whereNot("projectId", projectId);
    const sharedIds = new Set(shared.map((link) => link.projectTokenId));
    const movedIds = tokenIds.filter((id) => !sharedIds.has(id));
    await Promise.all([
      movedIds.length > 0
        ? ProjectToken.query(trx)
            .whereIn("id", movedIds)
            .patch({ accountId: toAccountId })
        : null,
      sharedIds.size > 0
        ? ProjectTokenProject.query(trx)
            .whereIn("projectTokenId", [...sharedIds])
            .where("projectId", projectId)
            .delete()
        : null,
    ]);
  });
}
