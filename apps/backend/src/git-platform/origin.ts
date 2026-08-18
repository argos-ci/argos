import { commentOriginPr, type OriginApi } from "@/origin";
import { redisLock } from "@/util/redis";

import { getCommentBody } from "./comment";

/**
 * Post the Argos comment on a Cursor Origin pull request.
 */
export async function postOriginComment(args: {
  originPullRequestId: string;
  commit: string;
  api: OriginApi;
  owner: string;
  repo: string;
}) {
  const { originPullRequestId, commit, owner, repo, api } = args;

  // This operation is idempotent.
  await redisLock.coalesce(
    ["post-origin-comment", originPullRequestId, owner, repo, commit],
    async () => {
      const body = await getCommentBody({ commit });
      await commentOriginPr({
        owner,
        repo,
        body,
        api,
        pullRequestId: originPullRequestId,
      });
    },
  );
}
