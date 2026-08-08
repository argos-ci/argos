import type { AccountPermission } from "@/database/models";

export type MediaPermission = "view" | "delete";

/**
 * Compute the permissions a viewer has on a media, given what they can do on the
 * owning account.
 *
 * The media library is an **admin** surface: a team's uploads are the team's
 * screenshots of unreleased work, sometimes uploaded from a project a given member
 * has no access to, and everyone on the team being able to browse the lot is not
 * what a team asks for. Viewing an individual media through its share link is a
 * separate question, answered by {@link checkCanViewMedia}.
 */
export function getMediaPermissions(
  accountPermissions: AccountPermission[],
): MediaPermission[] {
  if (accountPermissions.includes("admin")) {
    return ["view", "delete"];
  }
  return [];
}

/**
 * Can this viewer open this media's share page?
 *
 * Distinct from the library permissions above, and deliberately more permissive:
 * a share link is meant to be followed. A `public` media needs nothing at all — it
 * is what a reviewer with no Argos account opens. A `team` media needs a session
 * that can see the owning account, at any level: being able to read a team's
 * builds and being able to read a media somebody on that team linked from a pull
 * request are the same trust level.
 */
export function checkCanViewMedia(args: {
  visibility: "team" | "public";
  accountPermissions: AccountPermission[];
}): boolean {
  if (args.visibility === "public") {
    return true;
  }
  return args.accountPermissions.length > 0;
}
