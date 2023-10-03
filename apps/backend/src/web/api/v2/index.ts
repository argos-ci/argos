import express from "express";

import builds from "./builds/index.js";
import crawls from "./crawls/index.js";

const router = express.Router();

router.use(builds);
router.use(crawls);

export default router;
