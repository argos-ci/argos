import { HttpError } from "express-err";
import { getInstallationOctokit } from "@argos-ci/github/src";
import { Repository } from "@argos-ci/database/models";

const marker = "tokenless-github-";

function decodeToken(bearerToken, marker) {
  try {
    const payload = Buffer.from(
      bearerToken.split(marker)[1],
      "base64"
    ).toString();
    return JSON.parse(payload);
  } catch (e) {
    throw new HttpError(401, `Invalid token (token: "${bearerToken}")`);
  }
}

function validateToken({ owner, repository, jobId, runId }) {
  return Boolean(owner && repository && jobId && runId);
}

const strategy = {
  detect: (bearerToken) => bearerToken.startsWith(marker),
  getRepository: async (bearerToken) => {
    const token = decodeToken(bearerToken, marker);

    if (!validateToken(token)) {
      return null;
    }

    const repository = await Repository.query()
      .leftJoinRelated("[organization, user]")
      .withGraphJoined("activeInstallation")
      .findOne("repositories.name", token.repository)
      .where((query) =>
        query
          .where("organization.login", token.owner)
          .orWhere("user.login", token.owner)
      );

    if (!repository || !repository.activeInstallation) {
      return null;
    }

    const octokit = await getInstallationOctokit(
      repository.activeInstallation.githubId
    );

    if (!octokit) {
      await repository.activeInstallation.$query().patch({ deleted: true });
      return null;
    }

    const githubRun = await octokit.actions.listJobsForWorkflowRun({
      owner: token.owner,
      repo: token.repository,
      run_id: token.runId,
      filter: "latest",
    });

    if (!githubRun) {
      throw new HttpError(
        401,
        `GitHub run not found (token: "${bearerToken}")`
      );
    }

    const githubJob = githubRun.data.jobs.find(
      (job) => job.name === token.jobId
    );

    if (!githubJob) {
      throw new HttpError(
        401,
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
