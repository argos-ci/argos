import { Router } from "express";

import { asyncHandler } from "./util.js";

const router = Router();

router.get(
  "/vercel/event-handler",
  asyncHandler(async (_req, res) => {
    res.send("OK");
  })
);

export const middleware = router;
