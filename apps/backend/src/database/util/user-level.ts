import { z } from "zod";

import { zodToJsonSchema } from "@/util/zod";

const UserLevelSchema = z.enum(["admin", "reviewer", "viewer"]);

export type UserLevel = z.infer<typeof UserLevelSchema>;

export const UserLevelJsonSchema = zodToJsonSchema(UserLevelSchema);
