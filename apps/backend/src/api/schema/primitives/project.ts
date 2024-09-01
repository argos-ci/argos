import { z } from "../util/zod.js";

export const ProjectSchema = z
  .object({
    id: z.string(),
    defaultBaseBranch: z.string(),
    hasRemoteContentAccess: z.boolean(),
  })
  .openapi({
    description: "Project",
    ref: "Project",
  });
