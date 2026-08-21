import { truncate } from "@argos/util/string";
import type { PartialModelObject } from "objection";

import type { OriginPullRequest } from "@/database/models";
import type { OriginApi, OriginApiPullRequest } from "@/origin/api";
import { checkOriginErrorStatus } from "@/origin/error";

/**
 * Fetch a pull request from Origin, `null` when it does not exist.
 */
export async function fetchOriginPullRequest(
  api: OriginApi,
  params: { owner: string; repo: string; number: number },
): Promise<OriginApiPullRequest | null> {
  try {
    return await api.getPullRequest(
      { owner: params.owner, repo: params.repo },
      params.number,
    );
  } catch (error) {
    if (checkOriginErrorStatus(404, error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Turn what Origin says about a pull request into the columns Argos keeps.
 *
 * `head.ref` and `base.ref` are opaque Origin ref strings: short names or fully
 * qualified `refs/heads/…`. Argos matches them against branch names sent by
 * the CLI, so the prefix is stripped.
 */
export function parseOriginPullRequestData(
  data: OriginApiPullRequest,
): PartialModelObject<OriginPullRequest> {
  return {
    originId: data.id,
    // The column is a varchar(255): a title or a branch name has no length
    // limit worth relying on, and overflowing would wedge every build on the
    // pull request.
    title: truncate(data.title, 255),
    headRef: truncate(stripRefPrefix(data.head.ref), 255),
    baseRef: truncate(stripRefPrefix(data.base.ref), 255),
    baseSha: data.base.sha || null,
    state: data.state,
    date: data.createdAt ?? null,
    closedAt: data.closedAt ?? null,
    mergedAt: data.mergedAt ?? null,
    merged: data.merged,
    draft: data.draft,
  };
}

export function stripRefPrefix(ref: string): string {
  return ref.replace(/^refs\/heads\//, "");
}
