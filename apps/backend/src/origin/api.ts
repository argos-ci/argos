import { z } from "zod";

import config from "@/config";
import parentLogger from "@/logger";

import { OriginApiError } from "./error";

const logger = parentLogger.child({ module: "origin/api" });

/**
 * A thin, typed client over the Origin REST API
 * (https://cursor.com/docs/api/origin).
 *
 * Only the endpoints Argos uses are covered. Responses are protobuf-mapped
 * JSON, so fields holding a default value — empty arrays, `false`, `0`, `""` —
 * are omitted rather than sent, and 64-bit integers such as pull request
 * numbers are strings. The schemas below default those away so callers get
 * plain objects.
 */

// --- Schemas -----------------------------------------------------------------

const OwnerSchema = z.object({
  slug: z.string(),
  id: z.string(),
});

const OriginApiInstallationSchema = z.object({
  id: z.string(),
  appId: z.string().optional(),
  target: OwnerSchema,
  repoSelectionMode: z.enum(["all", "selected"]).default("all"),
  scopes: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type OriginApiInstallation = z.infer<typeof OriginApiInstallationSchema>;

const MirrorSchema = z.object({
  source: z.string().optional(),
  sourceId: z.string().optional(),
  status: z.string().optional(),
});

const OriginApiRepositorySchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string().optional(),
  owner: OwnerSchema,
  defaultBranch: z.string().default("main"),
  cloneUrl: z.string().optional(),
  pushedAt: z.string().optional(),
  mirror: MirrorSchema.optional(),
});
export type OriginApiRepository = z.infer<typeof OriginApiRepositorySchema>;

const ListInstallationRepositoriesResponseSchema = z.object({
  repositories: z.array(OriginApiRepositorySchema).default([]),
  nextPageToken: z.string().default(""),
  repoSelectionMode: z.enum(["all", "selected"]).default("all"),
});

const InstallationAccessTokenSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});

const PullRequestRefSchema = z.object({
  ref: z.string().default(""),
  sha: z.string().default(""),
});

const ActorSchema = z.object({
  user: z
    .object({ id: z.string().optional(), email: z.string().default("") })
    .optional(),
  app: z
    .object({ id: z.string().optional(), slug: z.string().default("") })
    .optional(),
  serviceAccount: z.object({ id: z.string().optional() }).optional(),
});

export const OriginApiPullRequestSchema = z.object({
  id: z.string(),
  number: z.coerce.number().int(),
  state: z.enum(["open", "closed"]).default("open"),
  draft: z.boolean().default(false),
  merged: z.boolean().default(false),
  title: z.string().default(""),
  body: z.string().default(""),
  head: PullRequestRefSchema.default(() => ({ ref: "", sha: "" })),
  base: PullRequestRefSchema.default(() => ({ ref: "", sha: "" })),
  author: ActorSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  closedAt: z.string().optional(),
  mergedAt: z.string().optional(),
  mergeCommitSha: z.string().optional(),
});
export type OriginApiPullRequest = z.infer<typeof OriginApiPullRequestSchema>;

const ListPullRequestsResponseSchema = z.object({
  pullRequests: z.array(OriginApiPullRequestSchema).default([]),
  nextPageToken: z.string().default(""),
});

const CommitSchema = z.object({
  sha: z.string(),
  parents: z.array(z.object({ sha: z.string() })).default([]),
});

const CommitComparisonSchema = z.object({
  status: z.string().optional(),
  aheadBy: z.number().default(0),
  behindBy: z.number().default(0),
  mergeBaseCommit: CommitSchema.optional(),
});

const ListCommitsResponseSchema = z.object({
  commits: z.array(CommitSchema).default([]),
  nextPageToken: z.string().default(""),
});

const OriginApiCommentSchema = z.object({
  id: z.string(),
  thread: z.object({ id: z.string() }).optional(),
  body: z.string().default(""),
  author: ActorSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const CheckRunStatusSchema = z.enum(["queued", "in_progress", "completed"]);
type CheckRunStatus = z.infer<typeof CheckRunStatusSchema>;

const CheckRunConclusionSchema = z.enum([
  "success",
  "failure",
  "neutral",
  "cancelled",
  "skipped",
  "timed_out",
  "action_required",
  "stale",
]);
type CheckRunConclusion = z.infer<typeof CheckRunConclusionSchema>;

export type PostCheckRunInput = {
  headSha: string;
  checkSuite: {
    key: string;
    name: string;
    externalId: string;
    detailsUrl?: string;
  };
  checkRun: {
    key: string;
    name: string;
    status: CheckRunStatus;
    conclusion?: CheckRunConclusion;
    externalId: string;
    externalUpdatedAt: string;
    detailsUrl?: string;
    startedAt?: string;
    completedAt?: string;
    output?: {
      title?: string;
      summary?: string;
      text?: string;
    };
  };
};

const PostCheckRunResponseSchema = z.object({
  checkSuite: z.object({ id: z.string() }).optional(),
  checkRun: z.object({ id: z.string() }).optional(),
});

const ErrorBodySchema = z.object({
  code: z.number().optional(),
  message: z.string().optional(),
});

/** How long a single Origin API call may take before it is aborted. */
const REQUEST_TIMEOUT = 30_000;

// --- Client ------------------------------------------------------------------

type RepoIdentifier = { owner: string; repo: string };

function repoPath({ owner, repo }: RepoIdentifier): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

/**
 * Collect every page of a paginated endpoint.
 *
 * Bounded: a `nextPageToken` that repeats — or never empties — would otherwise
 * spin forever and grow the array without limit. At 100 items a page the cap
 * is far above any real namespace, so hitting it means something is wrong and
 * it is logged rather than passed off as a complete list.
 */
const MAX_PAGES = 100;

async function paginate<T>(
  fetchPage: (pageToken: string) => Promise<{
    items: T[];
    nextPageToken: string;
  }>,
): Promise<T[]> {
  const items: T[] = [];
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchPage(pageToken);
    items.push(...result.items);
    // A token that does not advance would page over the same items forever.
    if (!result.nextPageToken || result.nextPageToken === pageToken) {
      return items;
    }
    pageToken = result.nextPageToken;
  }
  logger.warn(
    { pages: MAX_PAGES, items: items.length },
    "Origin pagination stopped at the page cap, the list may be incomplete",
  );
  return items;
}

export class OriginApi {
  #token: string;

  /**
   * @param token A bearer credential: an app JWT for app-level endpoints, an
   * installation access token (`oit_…`) for repository-scoped ones.
   */
  constructor(token: string) {
    this.#token = token;
  }

  async #request<T>(
    schema: z.ZodType<T>,
    path: string,
    init: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      query?: Record<string, string | number | undefined>;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const url = new URL(`${config.get("origin.apiBaseUrl")}${path}`);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    const response = await fetch(url, {
      method: init.method ?? "GET",
      // Node's fetch waits forever by default; a hung Origin response must not
      // pin a worker (or the build upload that is waiting on it).
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers: {
        authorization: `Bearer ${this.#token}`,
        accept: "application/json",
        ...(init.body !== undefined
          ? { "content-type": "application/json" }
          : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });

    if (!response.ok) {
      const text = await response.text();
      const parsed = ErrorBodySchema.safeParse(
        (() => {
          try {
            return JSON.parse(text);
          } catch {
            return null;
          }
        })(),
      );
      const error = new OriginApiError({
        status: response.status,
        code: parsed.success ? (parsed.data.code ?? null) : null,
        message: parsed.success
          ? (parsed.data.message ?? text)
          : text || response.statusText,
        path,
      });
      // 404 and 403 are routine (a deleted comment, a mirrored repository) and
      // handled by callers; anything else is worth a trace.
      if (response.status !== 404 && response.status !== 403) {
        logger.warn({ error, path, status: response.status }, error.message);
      }
      throw error;
    }

    if (response.status === 204) {
      return schema.parse({});
    }

    return schema.parse(await response.json());
  }

  // --- App level (app JWT) ---------------------------------------------------

  /**
   * Mint an installation access token. Requires an app JWT.
   */
  createInstallationAccessToken(installationId: string) {
    return this.#request(
      InstallationAccessTokenSchema,
      `/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
      { method: "POST", body: {} },
    );
  }

  /**
   * Get an installation of the app. Requires an app JWT.
   */
  getAppInstallation(installationId: string) {
    return this.#request(
      OriginApiInstallationSchema,
      `/app/installations/${encodeURIComponent(installationId)}`,
    );
  }

  // --- Installation level (installation token) -------------------------------

  /**
   * List every repository the installation can reach.
   */
  listInstallationRepositories() {
    return paginate(async (pageToken) => {
      const page = await this.#request(
        ListInstallationRepositoriesResponseSchema,
        "/installation/repos",
        { query: { pageSize: 100, pageToken } },
      );
      return { items: page.repositories, nextPageToken: page.nextPageToken };
    });
  }

  getRepository(id: RepoIdentifier) {
    return this.#request(OriginApiRepositorySchema, repoPath(id));
  }

  getPullRequest(id: RepoIdentifier, number: number) {
    return this.#request(
      OriginApiPullRequestSchema,
      `${repoPath(id)}/pulls/${number}`,
    );
  }

  /**
   * List pull requests, optionally those whose head is a given branch.
   */
  async listPullRequests(
    id: RepoIdentifier,
    filters: { head?: string; state?: "open" | "closed" | "all" },
  ) {
    const page = await this.#request(
      ListPullRequestsResponseSchema,
      `${repoPath(id)}/pulls`,
      { query: { head: filters.head, state: filters.state, pageSize: 100 } },
    );
    return page.pullRequests;
  }

  /**
   * Compare two revisions. `mergeBaseCommit` is what Argos is after; unrelated
   * histories answer 404.
   */
  compareCommits(id: RepoIdentifier, input: { base: string; head: string }) {
    const basehead = `${encodeURIComponent(input.base)}...${encodeURIComponent(input.head)}`;
    return this.#request(
      CommitComparisonSchema,
      `${repoPath(id)}/compare/${basehead}`,
    );
  }

  /**
   * List up to 100 commits reachable from a revision, most recent first.
   */
  async listCommits(id: RepoIdentifier, input: { sha: string }) {
    const page = await this.#request(
      ListCommitsResponseSchema,
      `${repoPath(id)}/commits`,
      { query: { sha: input.sha, pageSize: 100 } },
    );
    return page.commits;
  }

  /**
   * Create or update a check run. Repeated calls with the same
   * `(headSha, checkSuite.key, checkRun.key)` update the run in place.
   */
  postCheckRun(id: RepoIdentifier, input: PostCheckRunInput) {
    return this.#request(
      PostCheckRunResponseSchema,
      `${repoPath(id)}/check-runs`,
      { method: "POST", body: input },
    );
  }

  createPullRequestComment(
    id: RepoIdentifier,
    number: number,
    input: { body: string; threadId?: string },
  ) {
    return this.#request(
      OriginApiCommentSchema,
      `${repoPath(id)}/pulls/${number}/comments`,
      { method: "POST", body: input },
    );
  }

  updatePullRequestComment(
    id: RepoIdentifier,
    commentId: string,
    input: { body: string },
  ) {
    return this.#request(
      OriginApiCommentSchema,
      `${repoPath(id)}/pulls/comments/${encodeURIComponent(commentId)}`,
      { method: "PATCH", body: input },
    );
  }
}
