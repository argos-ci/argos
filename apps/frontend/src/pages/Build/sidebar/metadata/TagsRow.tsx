import { assertNever } from "@argos/util/assertNever";
import { TagIcon } from "lucide-react";

import { Chip, type ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { FilterableIndicator } from "../../metadata/filters/FilterableIndicator";
import { getFilterKey } from "../../metadata/filters/util";
import { MetadataCategory } from "../../metadata/metadataCategories";
import {
  getTagsWithSource,
  isRelevantTag,
  type TagWithSource,
} from "../../metadata/tags/util";
import { MetadataRow } from "./MetadataRow";
import type { Metadata } from "./utils";

const TAG_SOURCE_META: Record<
  TagWithSource["source"],
  { color: ChipProps["color"]; tooltip: string }
> = {
  test: { color: "primary", tooltip: "Test tag" },
  story: { color: "storybook", tooltip: "Story tag" },
  snapshot: { color: "info", tooltip: "Snapshot tag" },
};

function getTagFilterKey(tag: TagWithSource) {
  const category = (() => {
    switch (tag.source) {
      case "snapshot":
        return MetadataCategory.snapshotTag;
      case "story":
        return MetadataCategory.storyTag;
      case "test":
        return MetadataCategory.testTag;
      default:
        assertNever(tag.source);
    }
  })();
  return getFilterKey({ category, value: tag.name });
}

export function TagsRow(props: { metadata: Metadata | null }) {
  const tags = props.metadata
    ? getTagsWithSource(props.metadata)
        .filter(isRelevantTag)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  if (tags.length === 0) {
    return null;
  }
  return (
    <MetadataRow>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => {
          const meta = TAG_SOURCE_META[tag.source];
          return (
            <FilterableIndicator
              key={`${tag.source}:${tag.name}`}
              filterKey={getTagFilterKey(tag)}
            >
              <Tooltip content={meta.tooltip}>
                <Chip color={meta.color} icon={TagIcon}>
                  {tag.name}
                </Chip>
              </Tooltip>
            </FilterableIndicator>
          );
        })}
      </div>
    </MetadataRow>
  );
}
