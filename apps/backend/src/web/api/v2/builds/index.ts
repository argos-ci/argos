import express from "express";

import create from "./create.js";
import update from "./update.js";

const router = express.Router();

router.use(create);
router.use(update);

export default router;
