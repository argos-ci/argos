import type { ScreenshotMetadata } from "@/gql/graphql";

/**
 * Collect tags from both screenshot-level and test-level.
 */
export function getUniqueMetadataTags(metadata: ScreenshotMetadata): string[] {
  const tagSet = new Set([
    ...(metadata.tags ?? []),
    ...(metadata.test?.tags ?? []),
  ]);
  return Array.from(tagSet);
}
