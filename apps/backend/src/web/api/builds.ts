import express from "express";

import { asyncHandler, boom } from "../util.js";

const router = express.Router();

router.post(
  "/builds",
  asyncHandler(() => {
    throw boom(
      400,
      "argos-cli is deprecated, use @argos-ci/cli instead. Check https://argos-ci.com/docs",
    );
  }),
);

export default router;
