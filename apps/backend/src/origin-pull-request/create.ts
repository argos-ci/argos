import { OriginPullRequest } from "@/database/models";

import { originPullRequestJob } from "./job";

/**
 * Get the pull request row, creating it and enqueuing its fetch when Argos
 * has never seen it. Concurrent callers (a build upload and the
 * `pull_request.created` webhook, say) resolve to the same row through the
 * unique index on `(originRepositoryId, number)`.
 */
export async function getOrCreateOriginPullRequest(input: {
  originRepositoryId: string;
  number: number;
}): Promise<OriginPullRequest> {
  // On an ignored conflict Objection hands back the input, without an id:
  // that is how a row that already existed reads.
  const [inserted] = await OriginPullRequest.query()
    .insert([
      {
        originRepositoryId: input.originRepositoryId,
        number: input.number,
        jobStatus: "pending" as const,
      },
    ])
    .onConflict(["originRepositoryId", "number"])
    .ignore()
    .returning("*");

  if (inserted?.id) {
    await originPullRequestJob.push(inserted.id);
    return inserted;
  }

  return OriginPullRequest.query().findOne(input).throwIfNotFound();
}
