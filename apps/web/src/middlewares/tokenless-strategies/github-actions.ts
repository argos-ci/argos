// @ts-ignore
import { HttpError } from "express-err";

import { Repository } from "@argos-ci/database/models";
import { getInstallationOctokit } from "@argos-ci/github";

const marker = "tokenless-github-";

/**
 * Decode bearer token.
 */
const decodeToken = (bearerToken: string, marker: string) => {
  try {
    const parts = bearerToken.split(marker);
    const base64 = parts[1];
    if (!base64) {
      throw new Error("Missing marker");
    }
    const payload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(payload);
  } catch (error) {
    throw new HttpError(401, `Invalid token (token: "${bearerToken}")`);
  }
};

interface AuthData {
  owner: string;
  repository: string;
  jobId: string;
  runId: string;
}

/**
 * Validate auth data.
 */
const validateAuthData = (infos: any): infos is AuthData => {
  return Boolean(infos.owner && infos.repository && infos.jobId && infos.runId);
};

const strategy = {
  detect: (bearerToken: string) => bearerToken.startsWith(marker),
  getRepository: async (bearerToken: string) => {
    const authData = decodeToken(bearerToken, marker);

    if (!validateAuthData(authData)) {
      return null;
    }

    const repository = await Repository.query()
      .leftJoinRelated("[organization, user]")
      .withGraphJoined("activeInstallation")
      .findOne("repositories.name", authData.repository)
      .where((query) =>
        query
          .where("organization.login", authData.owner)
          .orWhere("user.login", authData.owner)
      );

    if (!repository || !repository.activeInstallation) {
      return null;
    }

    const octokit = await getInstallationOctokit(
      Number(repository.activeInstallation.githubId)
    );

    if (!octokit) {
      await repository.activeInstallation.$query().patch({ deleted: true });
      return null;
    }

    const githubRun = await (async () => {
      try {
        const result = await octokit.actions.listJobsForWorkflowRun({
          owner: authData.owner,
          repo: authData.repository,
          run_id: Number(authData.runId),
          filter: "latest",
        });
        return result;
      } catch (error: any) {
        if (error.status === 404) {
          return null;
        }
        throw error;
      }
    })();

    if (!githubRun) {
      throw new HttpError(
        404,
        `GitHub run not found (token: "${bearerToken}")`
      );
    }

    const githubJob = githubRun.data.jobs.find(
      (job) => job.name === authData.jobId
    );

    if (!githubJob) {
      throw new HttpError(
        404,
        `GitHub job not found (token: "${bearerToken}")`
      );
    }

    if (githubJob.status !== "in_progress") {
      throw new HttpError(
        401,
        `GitHub job is not in progress (token: "${bearerToken}")`
      );
    }

    return repository;
  },
};

export default strategy;
