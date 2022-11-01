import express from "express";
// @ts-ignore
import { HttpError } from "express-err";

import { asyncHandler } from "../util.js";

const router = express.Router();

router.post(
  "/builds",
  asyncHandler(() => {
    throw new HttpError(
      400,
      "argos-cli is deprecated, use @argos-ci/cli instead. Check https://docs.argos-ci.com"
    );
  })
);

export default router;
