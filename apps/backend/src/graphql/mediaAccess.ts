import { invariant } from "@argos/util/invariant";

import { Media } from "@/database/models/Media";
import type { User } from "@/database/models/User";
import { isValidPgBigInt } from "@/database/util/biginteger";

import { forbidden, notFound } from "./util";

/**
 * Resolve a media from its GraphQL ID and ensure the user holds a permission on
 * the project it belongs to.
 *
 * Mirrors {@link getTestForUser}: `view` for reading a media's comments, `review`
 * for posting one. Media is project-scoped, so this is the project's own access
 * control — fine-grained contributor access included. Membership permissions,
 * deliberately: the "view" a public project hands to anyone must not reach a
 * team-only media through here.
 */
export async function getMediaForUser(input: {
  id: string;
  user: User | null;
  permission: "view" | "review";
  message: string;
}): Promise<Media> {
  const { id, user, permission, message } = input;
  if (!isValidPgBigInt(id)) {
    throw notFound("Media not found");
  }
  const media = await Media.query()
    .findById(id)
    .withGraphFetched("project.account");
  if (!media) {
    throw notFound("Media not found");
  }
  invariant(media.project?.account, "Media project account not found");
  const permissions = await media.project.$getMembershipPermissions(user);
  if (!permissions.includes(permission)) {
    throw forbidden(message);
  }
  return media;
}
