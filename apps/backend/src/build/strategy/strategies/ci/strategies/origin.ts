import { invariant } from "@argos/util/invariant";
import pRetry from "p-retry";

import type { OriginInstallation, Project } from "@/database/models";
import { UnretryableError } from "@/job-core";
import {
  checkOriginErrorStatus,
  getInstallationOriginApi,
  ORIGIN_CONTENTS_READ_SCOPE,
  type OriginApi,
} from "@/origin";
import { boom } from "@/util/error";

import type { MergeBaseStrategy } from "../types";

export const OriginStrategy: MergeBaseStrategy<{
  api: OriginApi;
  owner: string;
  repo: string;
  installation: OriginInstallation;
}> = {
  detect: (project: Project) => Boolean(project.originRepositoryId),
  getContext: async (project: Project) => {
    await project.$fetchGraph("originRepository.installation", {
      skipFetched: true,
    });

    invariant(
      project.originRepository,
      "no origin repository found",
      UnretryableError,
    );

    const { installation } = project.originRepository;

    invariant(
      installation && !installation.deleted,
      "no installation found, repository should be unlinked from project at this point",
      UnretryableError,
    );

    const api = await getInstallationOriginApi(installation);
    if (!api) {
      return null;
    }

    return {
      api,
      owner: project.originRepository.ownerSlug,
      repo: project.originRepository.name,
      installation,
    };
  },

  getMergeBaseCommitSha: async (args) => {
    // Without content access, we rely on the base commit provided by the CLI.
    // It is already handled in the common logic, so at this point we return
    // null. Note it may indicate a bad setup.
    if (!args.ctx.installation.hasScope(ORIGIN_CONTENTS_READ_SCOPE)) {
      return null;
    }

    return pRetry(
      async () => {
        try {
          const comparison = await args.ctx.api.compareCommits(
            { owner: args.ctx.owner, repo: args.ctx.repo },
            { base: args.base, head: args.head },
          );
          return comparison.mergeBaseCommit?.sha ?? null;
        } catch (error) {
          // Unrelated histories, or a revision Origin does not know: no base.
          if (checkOriginErrorStatus(404, error)) {
            return null;
          }
          throw error;
        }
      },
      { retries: 3 },
    );
  },
  listParentCommitShas: async (args) => {
    // Same as above: without content access, the common logic falls back to
    // the last bucket on the base branch.
    if (!args.ctx.installation.hasScope(ORIGIN_CONTENTS_READ_SCOPE)) {
      return [];
    }

    try {
      const commits = await args.ctx.api.listCommits(
        { owner: args.ctx.owner, repo: args.ctx.repo },
        { sha: args.sha },
      );
      return commits.map((commit) => commit.sha);
    } catch (error) {
      if (checkOriginErrorStatus(404, error)) {
        throw boom(
          404,
          `"${args.sha}" not found on repository "${args.ctx.repo}"`,
          { retryable: false },
        );
      }
      throw error;
    }
  },
};
