import { Build } from "@/database/models/index.js";

export const getStatsMessage = async (buildId: string) => {
  const stats = await Build.getStats(buildId);
  const parts = [];
  if (stats.changed) {
    parts.push(`${stats.changed} change${stats.changed > 1 ? "s" : ""}`);
  }
  if (stats.failure) {
    parts.push(`${stats.failure} failure${stats.failure > 1 ? "s" : ""}`);
  }
  return parts.join(", ");
};
