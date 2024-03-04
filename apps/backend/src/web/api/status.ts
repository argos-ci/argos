import { knex } from "@/database";
import express from "express";
import { asyncHandler } from "../util.js";
import { ScreenshotDiff } from "@/database/models/ScreenshotDiff.js";
const router = express.Router();

router.get("/status", (_req, res) => {
  res.sendStatus(200);
});

router.get(
  "/status/screenshot-diffs",
  asyncHandler(async (_req, res) => {
    // Check if we have any pending screenshot diffs that are older than 5 minutes
    // and newer than 30 minutes (to automatically resolve the issue after 30 minutes).
    const count = await ScreenshotDiff.query()
      .where("jobStatus", "pending")
      .where("createdAt", ">", knex.raw("now() - interval '30 minutes'"))
      .where("createdAt", "<", knex.raw("now() - interval '5 minutes'"))
      .resultSize();

    if (count > 0) {
      res.sendStatus(503);
      return;
    }
    res.sendStatus(200);
  }),
);

export default router;
