import { assertNever } from "@argos/util/assertNever";
import { TagIcon } from "lucide-react";

import { Chip, type ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { FilterableIndicator } from "../filters/FilterableIndicator";
import { getFilterKey } from "../filters/util";
import { MetadataCategory } from "../metadataCategories";

export const TagSource = {
  snapshot: "snapshot",
  story: "story",
  test: "test",
} as const;

export type TagSource = keyof typeof TagSource;

export type TagWithSource = {
  name: string;
  source: TagSource;
};

const TAG_SOURCE_META: Record<
  TagSource,
  { color: ChipProps["color"]; tooltip: string }
> = {
  test: { color: "primary", tooltip: "Test tag" },
  story: { color: "storybook", tooltip: "Story tag" },
  snapshot: { color: "info", tooltip: "Snapshot tag" },
};

type TagProps = { tag: TagWithSource };

const Tag = ({ tag }: TagProps) => {
  const meta = TAG_SOURCE_META[tag.source];
  return (
    <Tooltip content={meta.tooltip}>
      <Chip color={meta.color} icon={TagIcon} scale="xs">
        {tag.name}
      </Chip>
    </Tooltip>
  );
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
export const TagIndicator = ({ tag }: TagProps) => {
  return (
    <FilterableIndicator filterKey={getTagFilterKey(tag)}>
      <Tag tag={tag} />
    </FilterableIndicator>
  );
};
