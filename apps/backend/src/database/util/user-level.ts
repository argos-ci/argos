import { z } from "zod";

const UserLevelSchema = z.enum(["admin", "reviewer", "viewer"]);

export type UserLevel = z.infer<typeof UserLevelSchema>;

export const UserLevelJsonSchema = z.toJSONSchema(UserLevelSchema);
