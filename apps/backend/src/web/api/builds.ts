import express from "express";

import { HTTPError, asyncHandler } from "../util.js";

const router = express.Router();

router.post(
  "/builds",
  asyncHandler(() => {
    throw new HTTPError(
      400,
      "argos-cli is deprecated, use @/cli instead. Check https://argos-ci.com/docs",
    );
  }),
);

export default router;
