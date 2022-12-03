import { Router } from "express";

import config from "@argos-ci/config";
import { s3 as getS3, getSignedGetObjectUrl } from "@argos-ci/storage";

import { asyncHandler } from "../util.js";

const router = Router();

router.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const s3 = getS3();
    const url = await getSignedGetObjectUrl({
      s3,
      Bucket: config.get("s3.screenshotsBucket"),
      Key: req.params["key"] as string,
      expiresIn: 3600,
    });
    res.redirect(url);
  })
);

export { router as screenshots };
