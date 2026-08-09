import { knex } from "@/database/knex";
import { Media, MediaVersion } from "@/database/models";

/** One pull request that has media, newest activity first. */
export type MediaPullRequestRow = {
  githubPullRequestId: string;
  projectId: string;
  /** When the most recent media on this pull request was created. */
  lastMediaAt: string;
};

/**
 * Pull requests that have media, across a set of projects.
 *
 * Grouped by pull request rather than listing media flat, because a pull request
 * is the unit a reviewer thinks in: "what did we change here, and what does it look
 * like". A list of loose screenshots made the reader reassemble that themselves.
 *
 * Ordered by the newest media on each pull request, so the one somebody just
 * uploaded to is at the top — which is almost always the one being looked for.
 * Only media with a landed upload counts; a signed-but-never-finished upload must
 * not float a pull request to the top of the list.
 */
export async function queryMediaPullRequests(args: {
  projectIds: string[];
  after: number;
  first: number;
}): Promise<{ rows: MediaPullRequestRow[]; totalCount: number }> {
  const { projectIds, after, first } = args;

  if (projectIds.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  const base = () =>
    Media.query()
      .whereIn("media.projectId", projectIds)
      .whereNotNull("media.githubPullRequestId")
      .whereExists(
        MediaVersion.query()
          .select(1)
          .whereColumn("media_versions.mediaId", "media.id")
          .whereNotNull("media_versions.uploadedAt"),
      );

  const [rows, countResult] = await Promise.all([
    base()
      .select("media.githubPullRequestId", "media.projectId")
      .select(knex.raw(`max("media"."createdAt") as "lastMediaAt"`))
      // A pull request belongs to one project, so grouping by both is free and
      // saves a second lookup to find out which project a row is in.
      .groupBy("media.githubPullRequestId", "media.projectId")
      .orderBy("lastMediaAt", "desc")
      .limit(first)
      .offset(after)
      .castTo<MediaPullRequestRow[]>(),
    // The distinct count, which `count()` over a grouped query would not give.
    base()
      .countDistinct("media.githubPullRequestId as count")
      .first()
      .castTo<{ count: string } | undefined>(),
  ]);

  return { rows, totalCount: Number(countResult?.count ?? 0) };
}
