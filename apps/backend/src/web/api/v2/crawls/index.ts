import express from "express";

import create from "./create.js";

const router = express.Router();

router.use(create);

export default router;
