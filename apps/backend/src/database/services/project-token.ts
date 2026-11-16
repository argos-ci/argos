import {
  PROJECT_TOKEN_PERMISSION_LIST,
  type ProjectTokenPermission,
} from "@argos/schemas/project-token";
import { invariant } from "@argos/util/invariant";
import type { TransactionOrKnex } from "objection";

import type { AuthViewer } from "@/auth/payload";
import { boom } from "@/util/error";

import type { Account, AccountPermission } from "../models/Account";
import { Project, type ProjectPermission } from "../models/Project";
import { ProjectToken } from "../models/ProjectToken";
import { ProjectTokenProject } from "../models/ProjectTokenProject";
import { transaction } from "../transaction";
import { isValidPgBigInt } from "../util/biginteger";
import { hashToken } from "./crypto";
import { applyProjectVisibility, getProjectVisibility } from "./project";

/**
 * Whether a viewer can manage (create, rename, revoke) a token linked to these
 * projects of the account: an administrator of the account can manage any,
 * and a project administrator the ones linked only to projects they
 * administer. A token linked to no project anymore takes an account
 * administrator.
 *
 * Backs both the `viewerCanManage` field and the guard of every mutation. A
 * list of tokens passes `getPermissions` backed by the request's loaders, so
 * the same account and projects are not checked once per token.
 */
export async function canManageProjectToken(args: {
  account: Account;
  projects: Project[];
  auth: AuthViewer;
  getPermissions?: {
    account: (account: Account) => Promise<AccountPermission[]>;
    project: (project: Project) => Promise<ProjectPermission[]>;
  };
}): Promise<boolean> {
  const { account, projects, auth } = args;
  const getPermissions = args.getPermissions ?? {
    account: (account: Account) => account.$getPermissions(auth),
    project: (project: Project) => project.$getPermissions(auth),
  };
  const accountPermissions = await getPermissions.account(account);
  if (accountPermissions.includes("admin")) {
    return true;
  }
  if (projects.length === 0) {
    return false;
  }
  const projectPermissions = await Promise.all(
    projects.map((project) => getPermissions.project(project)),
  );
  return projectPermissions.every((permissions) =>
    permissions.includes("admin"),
  );
}

/**
 * The live projects of its own account each token reaches, by token id, sorted
 * by name. A token's account only changes along with its projects (see
 * {@link moveProjectTokens}); the account check is what keeps a token from
 * ever reaching a project transferred away.
 */
export async function getProjectsByTokenId(
  tokenIds: readonly string[],
): Promise<Map<string, Project[]>> {
  const links = await ProjectTokenProject.query()
    .withGraphJoined("[project, projectToken]")
    .whereIn("project_token_projects.projectTokenId", [...tokenIds])
    .whereNull("project.deletedAt")
    .whereColumn("project.accountId", "projectToken.accountId")
    .orderBy("project.name");
  const projectsByTokenId = new Map<string, Project[]>();
  for (const link of links) {
    invariant(link.project, "Project token link without project");
    const projects = projectsByTokenId.get(link.projectTokenId) ?? [];
    projects.push(link.project);
    projectsByTokenId.set(link.projectTokenId, projects);
  }
  return projectsByTokenId;
}

export async function getProjectTokenProjects(
  projectToken: ProjectToken,
): Promise<Project[]> {
  const projectsByTokenId = await getProjectsByTokenId([projectToken.id]);
  return projectsByTokenId.get(projectToken.id) ?? [];
}

/**
 * The projects of a token a viewer may see: a token shown on a project's page
 * must not name the private projects of the team the viewer cannot reach.
 */
export async function filterViewableProjects(args: {
  projects: Project[];
  account: Account;
  auth: AuthViewer;
}): Promise<Project[]> {
  const { projects, account, auth } = args;
  if (projects.length === 0) {
    return [];
  }
  const visibility = await getProjectVisibility({ account, auth });
  if (!visibility) {
    return [];
  }
  const query = applyProjectVisibility(
    Project.query()
      .select("projects.id")
      .where("projects.accountId", account.id)
      .whereIn(
        "projects.id",
        projects.map((project) => project.id),
      ),
    visibility,
  );
  const visibleIds = new Set((await query).map((project) => project.id));
  return projects.filter((project) => visibleIds.has(project.id));
}

async function assertCanManage(args: {
  account: Account;
  projects: Project[];
  auth: AuthViewer;
}) {
  if (!(await canManageProjectToken(args))) {
    throw boom(
      403,
      "You must be an administrator of the account, or of every project the token is linked to.",
    );
  }
}

/**
 * The tokens of an account, or `null` when the viewer does not administer it: a
 * token may reach any of its projects.
 */
export async function listAccountProjectTokens(args: {
  account: Account;
  auth: AuthViewer;
}): Promise<ProjectToken[] | null> {
  const { account, auth } = args;
  const permissions = await account.$getPermissions(auth);
  if (!permissions.includes("admin")) {
    return null;
  }
  return ProjectToken.query()
    .where("accountId", account.id)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc");
}

/**
 * The tokens linked to a project, or `null` when the viewer cannot review it.
 */
export async function listProjectProjectTokens(args: {
  project: Project;
  auth: AuthViewer;
}): Promise<ProjectToken[] | null> {
  const { project, auth } = args;
  const permissions = await project.$getPermissions(auth);
  if (!permissions.includes("review")) {
    return null;
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

function parsePermissions(
  permissions: readonly ProjectTokenPermission[],
): ProjectTokenPermission[] {
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
 * Store a token, hashed, and link it to its projects.
 */
export async function insertProjectToken(args: {
  accountId: string;
  name: string;
  token: string;
  permissions: readonly ProjectTokenPermission[];
  projectIds: readonly string[];
  expireAt?: string | null;
  createdById?: string | null;
}): Promise<ProjectToken> {
  const { projectIds, ...attributes } = args;
  return transaction(async (trx) => {
    const projectToken = await ProjectToken.query(trx).insertAndFetch({
      ...attributes,
      token: hashToken(args.token),
      permissions: [...args.permissions],
    });
    await ProjectTokenProject.query(trx).insert(
      projectIds.map((projectId) => ({
        projectTokenId: projectToken.id,
        projectId,
      })),
    );
    return projectToken;
  });
}

/**
 * Create a token linked to some projects of an account. The token itself is
 * only returned here: it is stored hashed.
 */
export async function createProjectToken(args: {
  account: Account;
  auth: AuthViewer;
  name: string;
  projects: Project[];
  permissions: readonly ProjectTokenPermission[];
  expireAt: string | null;
}): Promise<{ projectToken: ProjectToken; token: string }> {
  const { account, auth, projects } = args;
  const name = parseName(args.name);
  const permissions = parsePermissions(args.permissions);
  const expireAt = parseExpireAt(args.expireAt);

  if (projects.length === 0) {
    throw boom(400, "A token must be linked to at least one project.");
  }
  if (projects.some((project) => project.accountId !== account.id)) {
    throw boom(400, "A token can only be linked to projects of its account.");
  }

  await assertCanManage({ account, projects, auth });

  const token = ProjectToken.generateToken();
  const projectToken = await insertProjectToken({
    accountId: account.id,
    name,
    token,
    permissions,
    projectIds: projects.map((project) => project.id),
    expireAt,
    createdById: auth.user.id,
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
  auth: AuthViewer;
}) {
  const { projectToken, auth } = args;
  const [account, projects] = await Promise.all([
    projectToken.$relatedQuery("account"),
    getProjectTokenProjects(projectToken),
  ]);
  invariant(account, "Project token account not found");
  await assertCanManage({ account, projects, auth });
}

export async function renameProjectToken(args: {
  projectToken: ProjectToken;
  auth: AuthViewer;
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
  auth: AuthViewer;
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
  trx: TransactionOrKnex;
}): Promise<void> {
  const { projectId, fromAccountId, toAccountId, trx } = args;
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
  // A link to a deleted project reaches nothing: a token whose only live
  // project is this one moves along.
  const shared = await ProjectTokenProject.query(trx)
    .joinRelated("project")
    .distinct("project_token_projects.projectTokenId")
    .whereIn("project_token_projects.projectTokenId", tokenIds)
    .whereNot("project_token_projects.projectId", projectId)
    .whereNull("project.deletedAt");
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
}
