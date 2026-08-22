import type { QueryBuilder } from "objection";

import {
  Build,
  GithubPullRequest,
  Media,
  OriginPullRequest,
} from "@/database/models";
import { uploadedVersions } from "@/media/query";

/**
 * How many of a pull request's builds the project's pull request list returns.
 *
 * The list shows a row per pull request, not a page per pull request, so there
 * is nowhere to paginate builds into — the cap is what keeps a long-lived pull
 * request with hundreds of pushes from dominating the response. Well above what
 * a row can display anyway.
 */
const MAX_PULL_REQUEST_BUILDS = 50;

/**
 * The pull requests a project has activity on: at least one build, or at least
 * one published media. Pull request rows belong to a *repository*, which
 * several projects can share, so the repository's rows are narrowed to the ones
 * this project's own builds and media reference.
 *
 * Newest first by `createdAt` — when Argos first saw the pull request. The two
 * providers' rows live in separate tables, and the sighting date is the one
 * ordering key that exists, and means the same thing, on both.
 */
export async function queryProjectPullRequests(args: {
  projectId: string;
  after: number;
  first: number;
}): Promise<{
  pullRequests: (GithubPullRequest | OriginPullRequest)[];
  hasNextPage: boolean;
  getTotalCount: () => Promise<number>;
}> {
  const { projectId, after, first } = args;

  const githubQuery = GithubPullRequest.query().where((builder) => {
    builder
      .whereExists(
        Build.query()
          .select(1)
          .whereColumn("builds.githubPullRequestId", "github_pull_requests.id")
          .where("builds.projectId", projectId),
      )
      .orWhereExists(
        Media.query()
          .select(1)
          .whereColumn("media.githubPullRequestId", "github_pull_requests.id")
          .where("media.projectId", projectId)
          // A media with no landed upload is an in-progress upload, not
          // activity — the same line every media read path draws.
          .whereExists(uploadedVersions()),
      );
  });

  // Origin has no standalone media — `media` only references GitHub pull
  // requests — so builds are the only activity that can name one.
  const originQuery = OriginPullRequest.query().whereExists(
    Build.query()
      .select(1)
      .whereColumn("builds.originPullRequestId", "origin_pull_requests.id")
      .where("builds.projectId", projectId),
  );

  // A project links to one provider at a time, so one side is empty in
  // practice — both run so a project that switched providers keeps its
  // history. Each side fetches enough rows to fill the page on its own, which
  // is what keeps the offset correct after the merge whatever the interleaving.
  const fetchCount = after + first + 1;
  const [githubRows, originRows] = await Promise.all([
    fetchNewestFirst(githubQuery.clone(), fetchCount),
    fetchNewestFirst(originQuery.clone(), fetchCount),
  ]);

  const merged = [...githubRows, ...originRows].sort(compareNewestFirst);

  return {
    pullRequests: merged.slice(after, after + first),
    hasNextPage: merged.length > after + first,
    getTotalCount: async () => {
      const [githubCount, originCount] = await Promise.all([
        githubQuery.resultSize(),
        originQuery.resultSize(),
      ]);
      return githubCount + originCount;
    },
  };
}

async function fetchNewestFirst<
  T extends GithubPullRequest | OriginPullRequest,
>(query: QueryBuilder<T, T[]>, limit: number): Promise<T[]> {
  return query
    .orderBy([
      { column: "createdAt", order: "desc" },
      { column: "id", order: "desc" },
    ])
    .limit(limit);
}

function compareNewestFirst(
  a: GithubPullRequest | OriginPullRequest,
  b: GithubPullRequest | OriginPullRequest,
): number {
  const diff =
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  if (diff !== 0) {
    return diff;
  }
  // Ids only order rows within one table, but a same-instant tie across
  // providers just needs *a* stable order, not a meaningful one.
  return Number(b.id) - Number(a.id);
}

/**
 * The builds of one pull request in one project, most recent first.
 *
 * Scoped to the project even though the relation alone identifies the pull
 * request: projects sharing a repository share its pull request rows, and each
 * project's list must only show its own builds.
 */
export function queryPullRequestBuilds(args: {
  projectId: string;
  pullRequest: GithubPullRequest | OriginPullRequest;
}): QueryBuilder<Build, Build[]> {
  const column =
    args.pullRequest instanceof GithubPullRequest
      ? "githubPullRequestId"
      : "originPullRequestId";
  return Build.query()
    .where("projectId", args.projectId)
    .where(column, args.pullRequest.id)
    .orderBy([
      { column: "createdAt", order: "desc" },
      { column: "number", order: "desc" },
    ])
    .limit(MAX_PULL_REQUEST_BUILDS);
}
