import type { MediaStage } from "@argos/schemas/media";
import type { QueryBuilder } from "objection";

import { Media, MediaVersion, Project } from "@/database/models";

/**
 * How many of a pull request's media the share page's sidebar lists.
 *
 * The list is not paginated — it is a sidebar the reviewer scrolls — so the cap
 * is what keeps a pull request with hundreds of uploads from being one enormous
 * response. Well above what a pull request realistically carries.
 */
export const MAX_PULL_REQUEST_MEDIAS = 100;

export type MediaFilters = {
  /** Match on the media's name or its description. */
  search?: string | null | undefined;
  /** Restrict to images or to videos. */
  type?: "image" | "video" | null | undefined;
  /**
   * The branch the media was uploaded for. Matches staged and published media
   * alike, since a media keeps its branch after a pull request is attached —
   * which is what makes "everything for this work" one query either side of the
   * pull request opening.
   */
  branch?: string | null | undefined;
  /** The pull request the media is published to. */
  githubPullRequestId?: string | null | undefined;
  /** Restrict to staged media (no pull request) or to published media. */
  stage?: MediaStage | null | undefined;
};

/**
 * Correlated subquery asserting the media's project is not soft-deleted, for
 * the media surfaces that are addressed by something other than their project —
 * a share token, a media id — and so never pass through a project lookup.
 *
 * Only valid inside a query rooted at `media`, which is what it correlates on.
 */
export function liveProject() {
  return Project.query()
    .select(1)
    .whereColumn("projects.id", "media.projectId")
    .whereNull("projects.deletedAt");
}

/**
 * Resolve the media a share link points at, or `null` when nothing is behind
 * it.
 *
 * A share URL is the one way into a media that does not go through its project,
 * so the soft-delete check lives here: deleting a project has to take its share
 * links with it, and the token alone would keep answering.
 */
export function findMediaByShareToken(
  shareToken: string,
): QueryBuilder<Media, Media | undefined> {
  return Media.query()
    .findOne("media.shareToken", shareToken)
    .whereExists(liveProject());
}

/**
 * The media list query, shared by the REST list endpoint and the GraphQL pull
 * request list so both paginate, filter and order identically.
 *
 * Takes project ids rather than an account so the caller decides the scope: one
 * project for the project endpoint, or every project a viewer can see.
 *
 * Only media with at least one uploaded version: a media created to sign an upload
 * that never completed is an implementation detail of the two-step flow, not
 * something a project should see listed.
 */
export function queryProjectMedia(args: {
  projectIds: string[];
  filters: MediaFilters | null;
  /**
   * Newest first by default, which is what a list of recent uploads wants.
   * "asc" is upload order — how the pull request comment reads, and how the
   * share page's sidebar has to read to match it.
   */
  order?: "asc" | "desc";
}): QueryBuilder<Media, Media[]> {
  const query = Media.query()
    .whereIn("media.projectId", args.projectIds)
    .whereExists(uploadedVersions())
    .orderBy("media.createdAt", args.order ?? "desc");

  const { search, type, branch, githubPullRequestId, stage } =
    args.filters ?? {};

  if (branch) {
    query.where("media.branch", branch);
  }

  if (githubPullRequestId) {
    query.where("media.githubPullRequestId", githubPullRequestId);
  }

  if (stage) {
    // The stage *is* the attachment, so it filters on the column it is derived
    // from rather than on anything stored.
    if (stage === "published") {
      query.whereNotNull("media.githubPullRequestId");
    } else {
      query.whereNull("media.githubPullRequestId");
    }
  }

  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    query.where((builder) => {
      builder
        .whereILike("media.name", pattern)
        .orWhereILike("media.description", pattern);
    });
  }

  if (type) {
    // The *latest* version decides, not any version: re-uploading a screenshot
    // as a recording would otherwise leave the media matching both filters
    // forever. `number = max(number)` is what pins the check to the newest one —
    // filtering inside an `EXISTS` would match a version that has been superseded.
    const operator = type === "video" ? "LIKE" : "NOT LIKE";
    query.whereRaw(
      `EXISTS (
        SELECT 1 FROM media_versions v
        WHERE v."mediaId" = media.id
          AND v."uploadedAt" IS NOT NULL
          AND v."mimeType" ${operator} 'video/%'
          AND v."number" = (
            SELECT max(v2."number") FROM media_versions v2
            WHERE v2."mediaId" = media.id AND v2."uploadedAt" IS NOT NULL
          )
      )`,
    );
  }

  return query;
}

/**
 * Correlated "this media has landed at least one upload".
 *
 * The line between a media that exists and one that is only a signed upload, and
 * every path that reads media has to draw it the same way — the list endpoints,
 * the pull request comment and branch publishing all shared a copy of it. If
 * they ever disagree, media appear in the comment that the list hides.
 */
export function uploadedVersions() {
  return MediaVersion.query()
    .select(1)
    .whereColumn("media_versions.mediaId", "media.id")
    .whereNotNull("media_versions.uploadedAt");
}

/**
 * Escape the wildcards `LIKE` would otherwise interpret. A search for `100%`
 * should look for that string, not for anything starting with `100`.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
