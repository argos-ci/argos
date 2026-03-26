import { TagIcon } from "lucide-react";

import { Chip, type ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { FilterableIndicator } from "../filters/FilterableIndicator";
import { getFilterKey } from "../filters/util";
import { MetadataCategory } from "../metadataCategories";

export const TagSource = {
  snapshot: "snapshot",
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
  return getFilterKey({
    category:
      tag.source === "snapshot"
        ? MetadataCategory.snapshotTag
        : MetadataCategory.testTag,
    value: tag.name,
  });
}

export const TagIndicator = ({ tag }: TagProps) => {
  return (
    <FilterableIndicator filterKey={getTagFilterKey(tag)}>
      <Tag tag={tag} />
    </FilterableIndicator>
  );
};
