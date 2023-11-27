import { render } from "@react-email/render";
import { WelcomeEmail } from "./welcome.js";
import config from "@/config/index.js";
import { Router } from "express";

const router = Router();

router.get("/welcome", (_req, res) => {
  const html = render(<WelcomeEmail baseUrl={config.get("server.url")} />);
  res.send(html);
});

export { router as emailPreview };
