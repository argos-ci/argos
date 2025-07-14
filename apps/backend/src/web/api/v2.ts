import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { openAPIRouter } from "@/api/index.js";
import { createRedisStore } from "@/util/rate-limit.js";

const router: Router = Router();

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // Limit each IP to 500 requests per `window` (here, per 5 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: createRedisStore("api"),
});

// @ts-expect-error probably a problem of types in the `express-rate-limit` package
router.use(limiter);
router.use(openAPIRouter);

export default router;
