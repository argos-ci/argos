import { z } from "zod";

export const BuildStatsSchema = z.object({
  added: z.number().meta({ description: "Added snapshots" }),
  removed: z.number().meta({ description: "Removed snapshots" }),
  unchanged: z.number().meta({ description: "Unchanged snapshots" }),
  changed: z.number().meta({ description: "Changed snapshots" }),
  ignored: z.number().meta({ description: "Ignored snapshots" }),
  failure: z.number().meta({ description: "Failure screenshots" }),
  retryFailure: z.number().meta({ description: "Retry failure screenshots" }),
  total: z.number().meta({ description: "Total number of snapshots" }),
});

export type BuildStats = z.infer<typeof BuildStatsSchema>;
