import { pipeline } from "node:stream/promises";
import { asyncHandler } from "../util.js";
import config from "@argos-ci/config";
import { s3 as getS3, get } from "@argos-ci/storage";
import { Router } from "express";

const router = Router();

router.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const s3 = getS3();
    const result = await get({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: req.params["key"] as string,
    });
    res.set("Content-Type", result.ContentType);
    if (result.ContentLength != null) {
      res.set("Content-Length", String(result.ContentLength));
    }
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    await pipeline(result.Body, res);
  })
);

export { router as screenshots };
