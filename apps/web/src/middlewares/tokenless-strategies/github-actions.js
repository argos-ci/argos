// @ts-check
import { HttpError } from "express-err";
import { getInstallationOctokit } from "@argos-ci/github/src";
import { Repository } from "@argos-ci/database/models";

const marker = "tokenless-github-";

/**
 * Decode bearer token.
 * @param {string} bearerToken
 * @param {string} marker
 * @returns {any}
 */
function decodeToken(bearerToken, marker) {
  try {
    const payload = Buffer.from(
      bearerToken.split(marker)[1],
      "base64"
    ).toString("utf-8");
    return JSON.parse(payload);
  } catch (error) {
    throw new HttpError(401, `Invalid token (token: "${bearerToken}")`);
  }
}

/**
 * @typedef {object} AuthData
 * @property {string} owner
 * @property {string} repository
 * @property {string} jobId
 * @property {string} runId
 */

/**
 * Validate auth data.
 * @param {any} infos
 * @returns {infos is AuthData}
 */
function validateAuthData(infos) {
  return Boolean(infos.owner && infos.repository && infos.jobId && infos.runId);
}

const strategy = {
  detect: (bearerToken) => bearerToken.startsWith(marker),
  getRepository: async (bearerToken) => {
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
        return await octokit.actions.listJobsForWorkflowRun({
          owner: authData.owner,
          repo: authData.repository,
          run_id: Number(authData.runId),
          filter: "latest",
        });
      } catch (error) {
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
