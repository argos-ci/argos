/* eslint-disable @typescript-eslint/no-namespace */
// @ts-ignore
import { HttpError } from "express-err";

import { Project } from "@/database/models/index.js";

import { asyncHandler } from "../util.js";
import { bearerAuth } from "./bearerAuth.js";
import githubActions from "./tokenless-strategies/github-actions.js";

declare global {
  namespace Express {
    interface Request {
      authProject?: Project;
    }
  }
}

const tokenlessStrategies = [githubActions];

export const repoAuth = [
  bearerAuth,
  asyncHandler(async (req, _res, next) => {
    const { bearerToken } = req;

    if (!bearerToken) {
      throw new HttpError(
        401,
        `Missing bearer token. Please provide a token in the Authorization header.`,
      );
    }

    const strategy =
      tokenlessStrategies.find((strategy) => strategy.detect(bearerToken)) ??
      null;

    const project = strategy
      ? await strategy.getProject(bearerToken)
      : await Project.query().findOne({ token: bearerToken });

    if (!project && strategy) {
      throw new HttpError(
        401,
        `Argos Error: Project not found. Ensure a project exists in Argos (https://app.argos-ci.com) and restart your test after setup. Persisting issue? Consider adding 'ARGOS_TOKEN' to your CI environment variables. (token: "${bearerToken}").`,
      );
    }

    if (!project) {
      throw new HttpError(
        401,
        `Project not found in Argos. If the issue persists, verify your token. (token: "${bearerToken}").`,
      );
    }

    req.authProject = project;
    next();
  }),
];
