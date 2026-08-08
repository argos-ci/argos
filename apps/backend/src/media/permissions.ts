import type { ProjectPermission } from "@/database/models/Project";

export type MediaPermission = "view" | "delete";

/**
 * Compute the permissions a viewer has on a media, given what they can do on the
 * project it belongs to.
 *
 * Media is project-scoped, so this is the same access control that governs the
 * project's builds — fine-grained contributor access included. Anyone who can see
 * the project can see and comment on its media; removing one is an
 * administrator's call, because a share URL may already be pasted somewhere.
 */
export function getMediaPermissions(
  projectPermissions: ProjectPermission[],
): MediaPermission[] {
  if (projectPermissions.includes("admin")) {
    return ["view", "delete"];
  }
  if (projectPermissions.includes("view")) {
    return ["view"];
  }
  return [];
}

/**
 * Can this viewer open this media's share page?
 *
 * A `public` media needs nothing at all — it is what a pull request reviewer with
 * no Argos account opens, and the whole feature depends on that working. A `team`
 * media needs a session that can see the owning project.
 *
 * This governs the *page*, not the bytes: the file itself is served from an
 * unauthenticated CDN URL, because GitHub fetches embedded images server-side
 * with no session of ours. See `media/serve.ts`.
 */
export function checkCanViewMedia(args: {
  visibility: "team" | "public";
  projectPermissions: ProjectPermission[];
}): boolean {
  if (args.visibility === "public") {
    return true;
  }
  return args.projectPermissions.includes("view");
}
