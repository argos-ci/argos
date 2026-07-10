import { ProjectNameSchema } from "@argos/schemas/project";
import * as Sentry from "@sentry/node";

import { notifyDiscord } from "@/discord";
import { boom } from "@/util/error";

import type { Account } from "../models/Account";
import { Project } from "../models/Project";
import type { User } from "../models/User";

const RESERVED_PROJECT_NAMES = ["new", "settings"];

export const checkProjectName = async (args: {
  name: string;
  accountId: string;
}) => {
  if (RESERVED_PROJECT_NAMES.includes(args.name)) {
    throw new Error("Name is reserved for internal usage");
  }

  const sameName = await Project.query()
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

/** Where a project creation originated, used in the creation notification. */
export type ProjectCreationSource = "GitHub" | "GitLab" | null;

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

  const parsedName = ProjectNameSchema.safeParse(input.name);
  if (!parsedName.success) {
    throw boom(
      400,
      parsedName.error.issues[0]?.message ?? "Invalid project name.",
      { code: "PROJECT_NAME_INVALID" },
    );
  }
  const name = parsedName.data;

  // Reject reserved and already-used names (case-insensitive).
  try {
    await checkProjectName({ name, accountId: input.account.id });
  } catch (error) {
    throw boom(
      400,
      error instanceof Error ? error.message : "Invalid project name.",
      { code: "PROJECT_NAME_INVALID", cause: error },
    );
  }

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
 * Notify a Discord channel that a new project has been created, so the team has
 * visibility into project creation regardless of the surface it came from
 * (GraphQL, the public API, or a Git provider import). Notification failures are
 * swallowed and reported to Sentry — they must never break project creation.
 */
export async function notifyProjectCreation(input: {
  project: Project;
  account: Account;
  email: string | null;
  source: ProjectCreationSource;
}) {
  await notifyDiscord({
    content: `
New project from ${input.account.name} (${input.email ?? "unknown email"}) ${
      input.source
        ? `imported from ${input.source}`
        : "created without a Git provider"
    }:
${input.account.slug} / ${input.project.name}
`.trim(),
  }).catch((error) => {
    Sentry.captureException(error);
  });
}
