import { z } from "zod";

export const TeamUserLevelSchema = z.enum([
  "owner",
  "billing",
  "member",
  "contributor",
]);
