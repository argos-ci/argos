import { render } from "@react-email/render";
import { Router } from "express";

import { asyncHandler } from "@/web/util.js";

import { WelcomeEmail } from "./welcome.js";

const router = Router();

router.get(
  "/welcome",
  asyncHandler(async (_req, res) => {
    const html = await render(<WelcomeEmail baseUrl="/" />);
    res.send(html);
  }),
);

export { router as emailPreview };
