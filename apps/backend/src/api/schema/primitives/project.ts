import { z } from "zod";

export const ProjectSchema = z
  .object({
    id: z.string(),
    defaultBaseBranch: z.string(),
    hasRemoteContentAccess: z.boolean(),
  })
  .meta({
    description: "Project",
    id: "Project",
  });
