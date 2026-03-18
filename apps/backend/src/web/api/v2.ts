import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { openAPIRouter } from "@/api";
import config from "@/config";
import { createRedisStore } from "@/util/rate-limit";

const router: Router = Router();

const limiter = rateLimit({
  windowMs: config.get("api.rateLimit.window"),
  limit: config.get("api.rateLimit.limit"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("api"),
});

router.use(limiter);
router.use(openAPIRouter);

export default router;
