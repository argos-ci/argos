import { z } from "zod";

export const GitBranchSchema = z.string().min(1).meta({ id: "GitBranch" });

export const GitPRNumberSchema = z.number().int().min(1);
