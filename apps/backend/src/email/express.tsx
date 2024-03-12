import { render } from "@react-email/render";
import { Router } from "express";

import config from "@/config/index.js";

import { WelcomeEmail } from "./welcome.js";

const router = Router();

router.get("/welcome", (_req, res) => {
  const html = render(<WelcomeEmail baseUrl={config.get("server.url")} />);
  res.send(html);
});

export { router as emailPreview };
