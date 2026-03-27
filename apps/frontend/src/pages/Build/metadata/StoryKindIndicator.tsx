import { BookMarkedIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { FilterableIndicator } from "./filters/FilterableIndicator";
import { getFilterKey, getStoryKindFromStoryId } from "./filters/util";
import { MetadataCategory } from "./metadataCategories";

export function StoryKindIndicator(props: { storyId: string }) {
  const storyKind = getStoryKindFromStoryId(props.storyId);
  if (!storyKind) {
    return null;
  }

  const filterKey = getFilterKey({
    category: MetadataCategory.storyKind,
    value: storyKind,
  });

  return (
    <FilterableIndicator filterKey={filterKey}>
      <Tooltip content="Story kind">
        <Chip color="storybook" icon={BookMarkedIcon} scale="xs">
          {storyKind}
        </Chip>
      </Tooltip>
    </FilterableIndicator>
  );
}
