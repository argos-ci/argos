import express from "express";
import { rateLimit } from "express-rate-limit";

import { openAPIRouter } from "@/api/index.js";

import builds from "./builds/index.js";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // Limit each IP to 500 requests per `window` (here, per 5 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.use(limiter);
router.use(openAPIRouter);
router.use(builds);

export default router;
