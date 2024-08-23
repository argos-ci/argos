import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { CreateAPIHandler } from "../util.js";

export const getAuthProject: CreateAPIHandler = ({ get }) => {
  return get("/project", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const referenceBranch = await req.authProject.$getReferenceBranch();

    res.send({
      id: req.authProject.id,
      defaultBaseBranch: referenceBranch,
    });
  });
};
