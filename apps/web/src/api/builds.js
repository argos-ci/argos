import { HttpError } from "express-err";
import express from "express";

const router = express.Router();
export default router;

router.post("/builds", (req, res, next) => {
  next(
    new HttpError(
      400,
      "argos-cli is deprecated, use @argos-ci/cli instead. Check https://docs.argos-ci.com"
    )
  );
});
