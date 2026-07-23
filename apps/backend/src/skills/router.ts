/**
 * Serves the agent-skills discovery index and redirects individual skill files
 * to their canonical location in the `argos-javascript` repo.
 *
 * Mounted on the app subdomain BEFORE the SPA static handler and catch-all, so
 * these paths return JSON / redirects instead of the SPA shell.
 *
 * The `skills` CLI (`npx skills add https://argos-ci.com`) probes
 * `/.well-known/agent-skills/index.json` first, then `/.well-known/skills/…`,
 * and for the legacy index format fetches each file from
 * `<well-known>/<name>/<file>`. We answer both prefixes and redirect the files
 * to `raw.githubusercontent.com`, so the skill content is never copied here.
 * (`argos-ci.com` reaches this via its `/.well-known/*` → app redirect.)
 */
import cors from "cors";
import { Router } from "express";

import { asyncHandler } from "../web/util";
import { buildDiscoveryIndex, getSkillFileUrl, getSkills } from "./registry";

export function installSkillsRoutes(router: Router): void {
  const skills = Router();

  skills.use(cors({ origin: "*" }));

  skills.get(
    "/index.json",
    asyncHandler(async (_req, res) => {
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json(buildDiscoveryIndex(await getSkills()));
    }),
  );

  skills.get(
    "/:name/{*file}",
    asyncHandler(async (req, res) => {
      const raw = (req.params as { file?: string | string[] }).file;
      const file = Array.isArray(raw) ? raw.join("/") : (raw ?? "");
      const name = req.params["name"];
      const skill = (await getSkills()).find((s) => s.name === name);
      // Only redirect files the skill actually declares, so this can't be used
      // as an open redirect or to path-traverse into the repo.
      if (!skill || !skill.files.includes(file)) {
        res.sendStatus(404);
        return;
      }
      res.redirect(302, getSkillFileUrl(skill.name, file));
    }),
  );

  router.use("/.well-known/agent-skills", skills);
  router.use("/.well-known/skills", skills);
}
