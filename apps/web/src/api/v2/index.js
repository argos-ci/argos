import express from "express";

import builds from "./builds";

const router = express.Router();

router.use(builds);

export default router;
