import { ProjectNameSchema } from "@argos/schemas/project";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import type { PartialModelObject, QueryBuilder } from "objection";

import { invalidateProjectDeploymentCache } from "@/deployment/invalidate";
import { formatDiscordLink, getProjectUrl, notifyDiscord } from "@/discord";
import { boom } from "@/util/error";

import { Account } from "../models/Account";
import {
  normalizeIgnoreConfig,
  Project,
  type DeploymentAuth,
  type ResolvedIgnoreConfig,
} from "../models/Project";
import { ProjectUser } from "../models/ProjectUser";
import { TeamUser } from "../models/TeamUser";
import type { User } from "../models/User";
import { isValidPgBigInt } from "../util/biginteger";

const RESERVED_PROJECT_NAMES = ["new", "settings"];

const checkProjectName = async (args: { name: string; accountId: string }) => {
  if (RESERVED_PROJECT_NAMES.includes(args.name)) {
    throw new Error("Name is reserved for internal usage");
  }

  // A deleted project no longer holds its name: the account is meant to be able
  // to recreate the project it just removed under the same name.
  const sameName = await Project.queryNotDeleted()
    .select("id")
    .whereILike("name", args.name)
    .where("accountId", args.accountId)
    .first();

  if (sameName) {
    throw new Error("Name is already used by another project");
  }
};

export const resolveProjectName = async (args: {
  name: string;
  accountId: string;
  index?: number;
}): Promise<string> => {
  const index = args.index || 0;
  const name = args.index ? `${args.name}-${index}` : args.name;
  try {
    await checkProjectName({ ...args, name });
  } catch {
    return resolveProjectName({ ...args, index: index + 1 });
  }

  return name;
};

/**
 * Apply the project-visibility rules for a user to a `Project` query, returning
 * the filtered query — or `null` when the user can see no project at all, so the
 * caller can decide whether to throw or return an empty result.
 *
 * This is the single source of truth shared by the GraphQL API
 * (`Account.projects`, `getVisibleProjectIds`) and the public REST API
 * (`GET /accounts/{accountSlug}/projects`):
 * - a soft-deleted project is listed to nobody, staff included
 * - staff see every other project
 * - on a user account, only the owner
 * - on a team, owners/members see all; contributors see projects they are a
 *   contributor on (or that expose a default user level)
 */
export function applyProjectVisibility<R>(
  query: QueryBuilder<Project, R>,
  args: { account: Account; user: { id: string; staff: boolean } },
): QueryBuilder<Project, R> | null {
  const { account, user } = args;

  query.whereNull("projects.deletedAt");

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
 * Query the projects of an account visible to a user, most recently active
 * first (latest created project or build). Returns `null` when the user can
 * see no project at all. Callers apply their own pagination.
 *
 * Shared by the GraphQL API (`Account.projects`) and the public REST API
 * (`GET /accounts/{accountSlug}/projects`) so both list the exact same
 * projects in the exact same order.
 */
export function queryAccountProjects(args: {
  account: Account;
  user: { id: string; staff: boolean };
}): QueryBuilder<Project, Project[]> | null {
  return applyProjectVisibility(
    Project.query()
      .where("accountId", args.account.id)
      // Sort by most recently created project or build
      .orderByRaw(
        `greatest(projects."createdAt", (select max("createdAt") from builds where builds."projectId" = projects.id)) desc`,
      ),
    args,
  );
}

/** Where a project creation originated, used in the creation notification. */
export type ProjectCreationSource =
  | "GitHub"
  | "GitLab"
  | "Cursor Origin"
  | null;

/**
 * Create a project owned by the given account.
 *
 * Shared by the GraphQL API and the public REST API so both enforce the exact
 * same rules: the acting user must be an administrator of the account, the name
 * must be valid and not already used, and a Discord notification is sent on
 * success.
 *
 * Throws an `HTTPError` (via `boom`): `403` when the user is not an admin, and
 * `400` when the name is invalid, reserved, or already used. The GraphQL layer
 * translates these into its own error types.
 */
export async function createProject(input: {
  account: Account;
  user: User;
  name: string;
  source?: ProjectCreationSource;
}): Promise<Project> {
  const permissions = await input.account.$getPermissions(input.user);
  if (!permissions.includes("admin")) {
    throw boom(
      403,
      "You do not have permission to create a project on this account.",
    );
  }

  // Rejects invalid, reserved, and already-used names (case-insensitive).
  const name = await resolveAvailableProjectName({
    name: input.name,
    accountId: input.account.id,
  });

  const project = await Project.query().insertAndFetch({
    name,
    accountId: input.account.id,
  });

  await notifyProjectCreation({
    project,
    account: input.account,
    email: input.user.email,
    source: input.source ?? null,
  });

  return project;
}

/**
 * Assert that `user` administers `project`. Throws `403` otherwise.
 *
 * The single authorization gate for the project mutations below, so the GraphQL
 * API and the REST API can never drift on who is allowed to configure a
 * project.
 */
export async function assertProjectAdmin(args: {
  project: Project;
  user: User;
}): Promise<void> {
  const permissions = await args.project.$getPermissions(args.user);
  if (!permissions.includes("admin")) {
    throw boom(403, "You are not an administrator of this project.");
  }
}

/**
 * Load a project by id, for the GraphQL API, which routes on project ids. The
 * REST API resolves the project from its owner and name instead.
 *
 * Deliberately does *not* authorize: the mutations below call
 * {@link assertProjectAdmin} themselves.
 */
export async function loadProjectById(id: string): Promise<Project> {
  if (!isValidPgBigInt(id)) {
    throw boom(400, "Invalid ID.");
  }
  const project = await Project.queryNotDeleted().findById(id);
  if (!project) {
    throw boom(404, "Project not found.");
  }
  return project;
}

/**
 * The settings a project update can change. Every field is optional: only the
 * ones present are written, so a caller can change one setting without
 * restating the rest.
 */
export type UpdateProjectInput = {
  name?: string | undefined;
  defaultBaseBranch?: string | null | undefined;
  autoApprovedBranchGlob?: string | null | undefined;
  deploymentProductionBranchGlob?: string | null | undefined;
  private?: boolean | null | undefined;
  summaryCheck?: Project["summaryCheck"] | undefined;
  defaultUserLevel?: Project["defaultUserLevel"] | undefined;
  ignoreConfig?: ResolvedIgnoreConfig | null | undefined;
  deploymentEnabled?: boolean | undefined;
  deploymentAuth?: DeploymentAuth | undefined;
  githubActionsOidcEnabled?: boolean | undefined;
  tokenlessAuthEnabled?: boolean | undefined;
};

/**
 * Update a project's settings.
 *
 * Shared by the GraphQL API and the public REST API so both enforce the same
 * rules: the acting user must administer the project, a new name must be valid
 * and free on the owning account, and restricting deployments to the team
 * requires the project to belong to one.
 */
export async function updateProject(args: {
  project: Project;
  user: User;
  input: UpdateProjectInput;
}): Promise<Project> {
  const { project, input } = args;
  await assertProjectAdmin(args);

  const data: PartialModelObject<Project> = {};

  if (input.defaultBaseBranch !== undefined) {
    data.defaultBaseBranch = input.defaultBaseBranch ?? null;
  }

  if (input.autoApprovedBranchGlob !== undefined) {
    data.autoApprovedBranchGlob = input.autoApprovedBranchGlob ?? null;
  }

  if (input.deploymentProductionBranchGlob !== undefined) {
    data.deploymentProdBranchGlob =
      input.deploymentProductionBranchGlob ?? null;
  }

  if (input.private !== undefined) {
    data.private = input.private;
  }

  if (input.summaryCheck != null) {
    data.summaryCheck = input.summaryCheck;
  }

  if (input.defaultUserLevel !== undefined) {
    data.defaultUserLevel = input.defaultUserLevel;
  }

  if (input.ignoreConfig !== undefined) {
    data.ignoreConfig = input.ignoreConfig
      ? normalizeIgnoreConfig(input.ignoreConfig)
      : null;
  }

  if (
    typeof input.deploymentEnabled === "boolean" &&
    project.deploymentEnabled !== input.deploymentEnabled
  ) {
    data.deploymentEnabled = input.deploymentEnabled;
  }

  if (
    typeof input.githubActionsOidcEnabled === "boolean" &&
    project.githubActionsOidcEnabled !== input.githubActionsOidcEnabled
  ) {
    data.githubActionsOidcEnabled = input.githubActionsOidcEnabled;
  }

  if (
    typeof input.tokenlessAuthEnabled === "boolean" &&
    project.tokenlessAuthEnabled !== input.tokenlessAuthEnabled
  ) {
    data.tokenlessAuthEnabled = input.tokenlessAuthEnabled;
  }

  if (input.deploymentAuth != null) {
    if (input.deploymentAuth === "private") {
      await project.$fetchGraph("account", { skipFetched: true });
      invariant(project.account, "account not fetched");
      if (project.account.type !== "team") {
        throw boom(400, "All deployments protection requires a team.", {
          field: "deploymentAuth",
        });
      }
    }

    if (project.deploymentAuth !== input.deploymentAuth) {
      data.deploymentAuth = input.deploymentAuth;
    }
  }

  if (input.name != null && project.name !== input.name) {
    data.name = await resolveAvailableProjectName({
      name: input.name,
      accountId: project.accountId,
    });
  }

  if (Object.keys(data).length === 0) {
    return project;
  }

  const updated = await project.$query().patchAndFetch(data);

  // If deployment access changed, invalidate the project deployment cache.
  if ("deploymentEnabled" in data || "deploymentAuth" in data) {
    await invalidateProjectDeploymentCache(project.id).catch(() => {
      // Non-blocking — best effort
    });
  }

  return updated;
}

/**
 * Validate a project name and check it is free on an account, returning it
 * normalized (the schema trims it). Translates the `checkProjectName` failures
 * into an `HTTPError` both API layers understand.
 */
async function resolveAvailableProjectName(args: {
  name: string;
  accountId: string;
}): Promise<string> {
  const parsed = ProjectNameSchema.safeParse(args.name);
  if (!parsed.success) {
    throw boom(
      400,
      parsed.error.issues[0]?.message ?? "Invalid project name.",
      { code: "PROJECT_NAME_INVALID", field: "name" },
    );
  }
  try {
    await checkProjectName({ name: parsed.data, accountId: args.accountId });
  } catch (error) {
    throw boom(
      400,
      error instanceof Error ? error.message : "Invalid project name.",
      { code: "PROJECT_NAME_INVALID", cause: error, field: "name" },
    );
  }
  return parsed.data;
}

/**
 * Move a project to another account, optionally renaming it on the way.
 *
 * The acting user must administer both the project and the account receiving
 * it: without the second check, an admin of a project could push it onto any
 * team whose id they could guess.
 */
export async function transferProject(args: {
  project: Project;
  user: User;
  targetAccount: Account;
  name: string;
}): Promise<Project> {
  const { project, user, targetAccount, name } = args;
  await assertProjectAdmin({ project, user });

  if (project.accountId === targetAccount.id) {
    throw boom(400, "Project is already owned by this account.");
  }

  const targetPermissions = await targetAccount.$getPermissions(user);
  if (!targetPermissions.includes("admin")) {
    throw boom(
      403,
      "You are not an administrator of the account you are transferring to.",
    );
  }

  const resolvedName = await resolveAvailableProjectName({
    name,
    accountId: targetAccount.id,
  });

  // Capture the source account id and name before patching: `patchAndFetch`
  // mutates the instance in place, overwriting both.
  const previousAccountId = project.accountId;
  const previousName = project.name;

  const [previousAccount, transferredProject] = await Promise.all([
    Account.query().findById(previousAccountId),
    project.$query().patchAndFetch({
      accountId: targetAccount.id,
      name: resolvedName,
    }),
  ]);

  if (previousAccount) {
    await notifyProjectTransfer({
      project: transferredProject,
      previousAccount,
      previousName,
      targetAccount,
      email: user.email,
    });
  }

  return transferredProject;
}

/**
 * Notify a Discord channel that a new project has been created, so the team has
 * visibility into project creation regardless of the surface it came from
 * (GraphQL, the public API, or a Git provider import). Notification failures are
 * swallowed and reported to Sentry — they must never break project creation.
 *
 * Only team accounts are notified: personal accounts create too many projects
 * for the channel to stay readable, and none of them are actionable. Their
 * volume belongs to the dashboard, not to a notification.
 */
export async function notifyProjectCreation(input: {
  project: Project;
  account: Account;
  email: string | null;
  source: ProjectCreationSource;
}) {
  if (input.account.type !== "team") {
    return;
  }

  const projectLink = formatDiscordLink(
    `${input.account.slug} / ${input.project.name}`,
    getProjectUrl(input.account.slug, input.project.name),
  );

  await notifyDiscord({
    content: `
New project from ${input.account.displayName} (${
      input.email ?? "unknown email"
    }) ${
      input.source
        ? `imported from ${input.source}`
        : "created without a Git provider"
    }:
${projectLink}
`.trim(),
  }).catch((error) => {
    Sentry.captureException(error);
  });
}

/**
 * Notify a Discord channel that a project moved from a personal account to a
 * team, which is the moment a side project turns into something a team relies
 * on. Only that direction is notified: team to personal, or any transfer
 * between accounts of the same kind, carries no such signal.
 *
 * Notification failures are swallowed and reported to Sentry — they must never
 * break the transfer itself.
 */
export async function notifyProjectTransfer(input: {
  project: Project;
  previousAccount: Account;
  previousName: string;
  targetAccount: Account;
  email: string | null;
}) {
  if (
    input.previousAccount.type !== "user" ||
    input.targetAccount.type !== "team"
  ) {
    return;
  }

  const targetLink = formatDiscordLink(
    `${input.targetAccount.slug} / ${input.project.name}`,
    getProjectUrl(input.targetAccount.slug, input.project.name),
  );

  await notifyDiscord({
    content: `
Project transferred to a team by ${input.email ?? "unknown email"}:
${input.previousAccount.slug} / ${input.previousName} → ${targetLink}
`.trim(),
  }).catch((error) => {
    Sentry.captureException(error);
  });
}
