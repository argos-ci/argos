import type { JSONSchema } from "objection";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const UserLevelSchema = z.enum(["admin", "reviewer", "viewer"]);

export type UserLevel = z.infer<typeof UserLevelSchema>;

export const UserLevelJsonSchema = zodToJsonSchema(
  UserLevelSchema,
) as JSONSchema;
