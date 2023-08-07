import express, { Router } from "express";

import type { Project } from "@argos-ci/database/models";

import { SHA1_REGEX_STR } from "../../../constants.js";
import { repoAuth } from "../../../middlewares/repoAuth.js";
import { validate } from "../../../middlewares/validate.js";
import { asyncHandler } from "../../../util.js";
import { createBuildFromRequest, createCrawl } from "../util.js";

const router = Router();
export default router;

const validateRoute = validate({
  body: {
    type: "object",
    required: ["commit", "branch", "baseUrl"],
    properties: {
      commit: {
        type: "string",
        pattern: SHA1_REGEX_STR,
      },
      branch: {
        type: "string",
      },
      baseUrl: {
        type: "string",
      },
      name: {
        type: "string",
        nullable: true,
      },
    },
  },
});

type CreateRequest = express.Request<
  Record<string, never>,
  Record<string, never>,
  {
    commit: string;
    branch: string;
    baseUrl: string;
    name?: string | null;
  }
> & { authProject: Project };

router.post(
  "/crawls",
  repoAuth,
  express.json(),
  validateRoute,
  asyncHandler(async (req, res) => {
    const ctx = { req } as { req: CreateRequest };

    const build = await createBuildFromRequest({ req: ctx.req });
    const crawl = await createCrawl({
      build,
      baseUrl: req.body.baseUrl,
    });

    const buildUrl = await build.getUrl();

    res.status(201).send({
      build: { id: build.id, url: buildUrl },
      crawl: { id: crawl.id, baseUrl: crawl.baseUrl },
    });
  }),
);
