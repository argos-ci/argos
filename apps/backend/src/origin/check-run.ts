import parentLogger from "@/logger";
import { redisLock } from "@/util/redis";

import type { OriginApi, PostCheckRunInput } from "./api";
import { checkOriginErrorStatus } from "./error";

const logger = parentLogger.child({ module: "origin/check-run" });

/**
 * The suite every Argos check run belongs to. Required checks on Origin match
 * on the suite key plus the run key, so both are the stable, readable strings
 * users see in the branch protection UI: `argos` and the status context
 * (`argos`, `argos/<build>`, `argos/summary`).
 */
const CHECK_SUITE_KEY = "argos";
const CHECK_SUITE_NAME = "Argos";

/**
 * Report an Argos status as a check run on a commit.
 *
 * Origin has no commit status API: check runs play that role. A run is
 * identified by `(commit, suite key, run key)` and updated in place, so this is
 * called with the same `context` for every notification of a build.
 */
export async function postOriginCheckRun(
  api: OriginApi,
  params: {
    owner: string;
    repo: string;
    sha: string;
    /** The status context, used as the run key and name. */
    context: string;
    /**
     * Identity of what is being checked (a build id, a commit for the
     * summary): a new value is a new attempt, the same value an update.
     */
    externalId: string;
    status: PostCheckRunInput["checkRun"]["status"];
    conclusion: PostCheckRunInput["checkRun"]["conclusion"] | null;
    description: string;
    detailsUrl: string;
    startedAt: string | null;
  },
) {
  await redisLock.acquire(
    [
      "create-origin-check-run",
      params.owner,
      params.repo,
      params.sha,
      params.context,
    ],
    async () => {
      const now = new Date().toISOString();
      const isCompleted = params.status === "completed";
      try {
        await api.postCheckRun(
          { owner: params.owner, repo: params.repo },
          {
            headSha: params.sha,
            checkSuite: {
              key: CHECK_SUITE_KEY,
              name: CHECK_SUITE_NAME,
              externalId: params.sha,
            },
            checkRun: {
              key: params.context,
              name: params.context,
              status: params.status,
              ...(isCompleted && params.conclusion
                ? { conclusion: params.conclusion }
                : {}),
              externalId: params.externalId,
              externalUpdatedAt: now,
              detailsUrl: params.detailsUrl,
              ...(params.startedAt ? { startedAt: params.startedAt } : {}),
              ...(isCompleted ? { completedAt: now } : {}),
              output: {
                title: params.description.slice(0, 255),
                summary: `${params.description}\n\n[View on Argos](${params.detailsUrl})`,
              },
            },
          },
        );
      } catch (error) {
        // The commit is unknown to Origin (force-pushed away before the
        // notification, say) or the repository is out of reach: not an error
        // worth retrying, same as GitHub's 422 / 403.
        if (
          checkOriginErrorStatus(404, error) ||
          checkOriginErrorStatus(400, error) ||
          checkOriginErrorStatus(403, error)
        ) {
          logger.info(
            {
              owner: params.owner,
              repo: params.repo,
              sha: params.sha,
              context: params.context,
              error,
            },
            "Origin check run rejected",
          );
          return;
        }
        throw error;
      }
    },
  );
}
