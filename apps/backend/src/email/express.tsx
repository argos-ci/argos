import { render } from "@react-email/render";
import { Router } from "express";

import config from "@/config/index.js";
import { asyncHandler } from "@/web/util.js";

import { WelcomeEmail } from "./welcome.js";

const router: Router = Router();

router.get(
  "/welcome",
  asyncHandler(async (_req, res) => {
    const html = await render(
      <WelcomeEmail baseUrl={config.get("server.url")} />,
    );
    res.send(html);
  }),
);

export { router as emailPreview };
