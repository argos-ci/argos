import express from "express";

import builds from "./builds/index.js";

const router = express.Router();

router.use(builds);

export default router;
