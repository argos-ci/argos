import { Project, type User } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";

import { forbidden, invalidId, unauthenticated } from "../util";

/**
 * Load a project the user may upload media to.
 *
 * Uploading is a write: it spends the account's screenshot quota and publishes a
 * link under the project's name, so read access is not enough. `review` is the
 * level that already means "can act on this project's builds", which is the same
 * trust an upload needs.
 *
 * Deliberately does not check the *account* — media is project-scoped, so the
 * project's own permissions (fine-grained contributor access included) are the
 * whole answer.
 */
export async function getWritableProject(args: {
  id: string;
  user: User | undefined | null;
}): Promise<Project> {
  if (!isValidPgBigInt(args.id)) {
    throw invalidId();
  }
  if (!args.user) {
    throw unauthenticated();
  }
  const project = await Project.query().findById(args.id).throwIfNotFound();
  const permissions = await project.$getPermissions(args.user);
  if (!permissions.includes("review") && !permissions.includes("admin")) {
    throw forbidden("You do not have permission to upload to this project.");
  }
  return project;
}
