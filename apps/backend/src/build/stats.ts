import { Build } from "@/database/models";

/**
 * Get a message for the build stats.
 * Example: 40 changed, 20 added, 10 removed, 5 failures
 * Around 45 characters max.
 */
export function getStatsMessage(stats: NonNullable<Build["stats"]>): string {
  const parts = [];
  if (stats.changed > 0) {
    parts.push(`${stats.changed} changed`);
  }
  if (stats.added > 0) {
    parts.push(`${stats.added} added`);
  }
  if (stats.removed > 0) {
    parts.push(`${stats.removed} removed`);
  }
  if (stats.failure > 0) {
    parts.push(`${stats.failure} failure${stats.failure > 1 ? "s" : ""}`);
  }
  return parts.join(", ");
}
