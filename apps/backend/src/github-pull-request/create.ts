import { GithubPullRequest } from "@/database/models/GithubPullRequest";
import { redisLock } from "@/util/redis";

import { githubPullRequestJob } from "./job";

export async function getOrCreatePullRequest({
  githubRepositoryId,
  number,
}: {
  githubRepositoryId: string;
  number: number;
}) {
  return redisLock.acquire(
    ["pull-request-creation", githubRepositoryId, number],
    async () => {
      const existingPr = await GithubPullRequest.query().findOne({
        githubRepositoryId,
        number,
      });

      if (existingPr) {
        return existingPr;
      }

      const pr = await GithubPullRequest.query().insertAndFetch({
        githubRepositoryId,
        number,
        jobStatus: "pending",
      });

      await githubPullRequestJob.push(pr.id);

      return pr;
    },
  );
}
