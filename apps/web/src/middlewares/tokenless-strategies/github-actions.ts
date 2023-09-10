// @ts-ignore
import { HttpError } from "express-err";

import { GithubRepository, Project } from "@argos-ci/database/models";
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
  getProject: async (bearerToken: string): Promise<Project | null> => {
    const authData = decodeToken(bearerToken, marker);

    if (!validateAuthData(authData)) {
      return null;
    }

    const repository = await GithubRepository.query()
      .joinRelated("githubAccount")
      .withGraphJoined("[activeInstallation, projects]")
      .where("githubAccount.login", authData.owner)
      .findOne("github_repositories.name", authData.repository)
      .first();

    if (
      !repository ||
      !repository.activeInstallation ||
      !repository.projects?.[0]
    ) {
      return null;
    }

    if (repository.projects.length > 1) {
      throw new HttpError(
        400,
        `Multiple projects found for GitHub repository (token: "${bearerToken}"). Please specify a Project token.`,
      );
    }

    const octokit = await getInstallationOctokit(
      repository.activeInstallation.id,
    );

    if (!octokit) {
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
        `GitHub run not found (token: "${bearerToken}")`,
      );
    }

    const hasInProgressJob = githubRun.data.jobs.some(
      (job) => job.status === "in_progress",
    );

    if (!hasInProgressJob) {
      throw new HttpError(
        401,
        `GitHub job is not in progress (token: "${bearerToken}")`,
      );
    }

    return repository.projects[0];
  },
};

export default strategy;
