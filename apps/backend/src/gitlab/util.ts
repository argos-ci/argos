import type { ProjectSchema } from "@gitbeaker/rest";
import { z } from "zod";

export const formatGlProject = (glProject: ProjectSchema) => {
  const visibility = z
    .enum(["public", "private", "internal"])
    .parse(glProject.visibility);

  return {
    name: glProject.name,
    path: glProject.path,
    pathWithNamespace: glProject.path_with_namespace,
    visibility,
    defaultBranch: glProject.default_branch,
    gitlabId: glProject.id,
  };
};
