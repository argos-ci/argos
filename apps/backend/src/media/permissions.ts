import type { ProjectPermission } from "@/database/models/Project";

export type MediaPermission = "view" | "comment" | "delete";

/**
 * Compute the permissions a viewer has on a media, given its visibility and what
 * they can do on the project it belongs to.
 *
 * `membershipPermissions` must come from `Project.getMembershipPermissions` —
 * never from `getPermissions`, whose public-project default hands "view" to
 * anyone, including anonymous visitors. Feeding that in here would open a
 * team-only media to the world whenever its project is a public one.
 *
 * Media is project-scoped, so writes follow the same access control that governs
 * the project's builds — fine-grained contributor access included. Reading is the
 * exception: a `public` media is readable by anyone holding the link, so `view`
 * comes from {@link checkCanViewMedia} rather than from the project. Deriving it
 * from the project alone would report no permissions at all to the anonymous
 * reviewer the feature exists for — while they are looking at the media.
 */
export function getMediaPermissions(args: {
  visibility: "team" | "public";
  membershipPermissions: ProjectPermission[];
}): MediaPermission[] {
  const { membershipPermissions } = args;
  const permissions: MediaPermission[] = [];
  if (checkCanViewMedia(args)) {
    permissions.push("view");
  }
  // Commenting is a write on the project's review surface, which is the same
  // trust posting a build comment takes.
  if (membershipPermissions.includes("review")) {
    permissions.push("comment");
  }
  // Deleting is an administrator's call: a share URL may already be pasted
  // somewhere, and removing the media breaks it.
  if (membershipPermissions.includes("admin")) {
    permissions.push("delete");
  }
  return permissions;
}

/**
 * Can this viewer open this media's share page?
 *
 * A `public` media needs nothing at all — it is what a pull request reviewer with
 * no Argos account opens, and the whole feature depends on that working. A `team`
 * media needs a viewer whose *membership* grants "view" on the owning project:
 * the project being public is not enough, or a public project would leak its
 * team-only media to anyone holding the link.
 *
 * This governs the *page*, not the bytes: the file itself is served from an
 * unauthenticated CDN URL, because GitHub fetches embedded images server-side
 * with no session of ours. See `media/serve.ts`.
 */
export function checkCanViewMedia(args: {
  visibility: "team" | "public";
  membershipPermissions: ProjectPermission[];
}): boolean {
  if (args.visibility === "public") {
    return true;
  }
  return args.membershipPermissions.includes("view");
}
