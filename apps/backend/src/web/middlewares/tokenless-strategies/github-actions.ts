import { invariant } from "@argos/util/invariant";
import pRetry from "p-retry";

import { GithubRepository, Project } from "@/database/models/index.js";
import { checkErrorStatus, getInstallationOctokit } from "@/github/index.js";
import { boom } from "@/web/util.js";

const marker = "tokenless-github-";

/**
 * Decode bearer token.
 */
const decodeToken = (bearerToken: string, marker: string) => {
  try {
    const parts = bearerToken.split(marker);
    const base64 = parts[1];
    invariant(base64, "missing marker");
    const payload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    throw boom(401, `Invalid token (token: "${bearerToken}")`);
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
      .withGraphJoined("[repoInstallations.installation, projects]")
      .where("githubAccount.login", authData.owner)
      .findOne("github_repositories.name", authData.repository)
      .orderBy("github_repositories.updatedAt", "desc")
      .first();

    if (!repository) {
      return null;
    }

    invariant(repository.projects);

    if (!repository.projects[0]) {
      return null;
    }

    const installation = GithubRepository.pickBestInstallation(repository);

    if (!installation) {
      return null;
    }

    if (repository.projects.length > 1) {
      throw boom(
        400,
        `Multiple projects found for GitHub repository (token: "${bearerToken}"). Please specify a Project token.`,
      );
    }

    const octokit = await getInstallationOctokit(installation);

    if (!octokit) {
      return null;
    }

    const githubRun = await pRetry(
      async () => {
        try {
          const result = await octokit.actions.getWorkflowRun({
            owner: authData.owner,
            repo: authData.repository,
            run_id: Number(authData.runId),
            filter: "latest",
          });
          return result;
        } catch (error) {
          if (checkErrorStatus(404, error)) {
            return null;
          }
          throw error;
        }
      },
      { retries: 3 },
    );

    if (!githubRun) {
      throw boom(404, `GitHub run not found (token: "${bearerToken}")`);
    }

    const isRunInProgress =
      githubRun.data.status === "in_progress" ||
      // For some reason GitHub sometimes considers the job "queued"
      // It is not "unsafe" to allow this.
      githubRun.data.status === "queued";

    if (!isRunInProgress) {
      throw boom(
        401,
        `GitHub job is not in progress (token: "${bearerToken}")`,
      );
    }

    return repository.projects[0];
  },
};

export default strategy;
