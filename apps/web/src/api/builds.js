import { HttpError } from "express-err";
import express from "express";
import { asyncHandler } from "../util";

const router = express.Router();
export default router;

router.post(
  "/builds",
  asyncHandler(() => {
    throw new HttpError(
      400,
      "argos-cli is deprecated, use @argos-ci/cli instead. Check https://docs.argos-ci.com"
    );
  })
);
