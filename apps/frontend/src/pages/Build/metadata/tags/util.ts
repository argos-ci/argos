import type { ScreenshotMetadata } from "@/gql/graphql";

import { TagSource, TagWithSource } from "./TagIndicator";

/**
 * Collect tags with their source (screenshot-level, story-level, or test-level).
 */
export function getTagsWithSource(
  metadata: ScreenshotMetadata | null,
): TagWithSource[] {
  if (!metadata) {
    return [];
  }
  const tags: TagWithSource[] = [];

  for (const tag of metadata.tags ?? []) {
    tags.push({ name: tag, source: TagSource.snapshot });
  }

  for (const tag of metadata.story?.tags ?? []) {
    tags.push({ name: tag, source: TagSource.story });
  }

  for (const tag of metadata.test?.tags ?? []) {
    tags.push({ name: tag, source: TagSource.test });
  }

  return tags;
}
