import express from "express";
import create from "./create";
import update from "./update";

const router = express.Router();
export default router;

router.use(create);
router.use(update);
