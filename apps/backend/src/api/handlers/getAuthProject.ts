import { invariant } from "@argos/util/invariant";

import { GithubRepository } from "@/database/models/GithubRepository.js";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { CreateAPIHandler } from "../util.js";

export const getAuthProject: CreateAPIHandler = ({ get }) => {
  return get("/project", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const [referenceBranch] = await Promise.all([
      req.authProject.$getReferenceBranch(),
      req.authProject.$fetchGraph("githubRepository.activeInstallations"),
    ]);

    invariant(req.authProject.githubRepository?.activeInstallations);

    const installation = GithubRepository.pickBestInstallation(
      req.authProject.githubRepository.activeInstallations,
    );

    // We have remote content access if the installation is the main app
    const hasRemoteContentAcess = Boolean(
      installation && installation.app === "main",
    );

    res.send({
      id: req.authProject.id,
      defaultBaseBranch: referenceBranch,
      hasRemoteContentAcess,
    });
  });
};
