import { knex } from "@/database";
import express from "express";
import { asyncHandler } from "../util.js";
import { ScreenshotDiff } from "@/database/models/ScreenshotDiff.js";
import { Build } from "@/database/models/Build.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  res.sendStatus(200);
});

const MIN = knex.raw("now() - interval '30 minute'");
const MAX = knex.raw("now() - interval '2 minute'");

router.get(
  "/status/screenshot-diffs",
  asyncHandler(async (_req, res) => {
    const count = await ScreenshotDiff.query()
      .where("jobStatus", "pending")
      .where("createdAt", ">", MIN)
      .where("createdAt", "<", MAX)
      .resultSize();

    if (count > 0) {
      res.sendStatus(503);
      return;
    }
    res.sendStatus(200);
  }),
);

router.get(
  "/status/builds",
  asyncHandler(async (_req, res) => {
    const count = await Build.query()
      .where("jobStatus", "pending")
      .where("createdAt", ">", MIN)
      .where("createdAt", "<", MAX)
      .resultSize();

    if (count > 0) {
      res.sendStatus(503);
      return;
    }
    res.sendStatus(200);
  }),
);

export default router;
