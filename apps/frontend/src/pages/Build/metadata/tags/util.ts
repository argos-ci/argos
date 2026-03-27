import type { ScreenshotMetadata } from "@/gql/graphql";

import { TagSource, TagWithSource } from "./TagIndicator";

/**
 * Storybook internal tags that should be hidden from display and filters.
 */
const STORYBOOK_INTERNAL_TAGS = new Set([
  "autodocs",
  "dev",
  "manifest",
  "play-fn",
  "test-fn",
  "test",
]);

export const isRelevantStoryTag = (tag: string) => {
  return !STORYBOOK_INTERNAL_TAGS.has(tag);
};

export const isRelevantTag = (tag: TagWithSource) => {
  return !(tag.source === "story" && STORYBOOK_INTERNAL_TAGS.has(tag.name));
};

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
