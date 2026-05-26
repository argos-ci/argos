import { BookMarkedIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { FilterableIndicator } from "../../metadata/filters/FilterableIndicator";
import {
  getFilterKey,
  getStoryKindFromStoryId,
} from "../../metadata/filters/util";
import { MetadataCategory } from "../../metadata/metadataCategories";
import { MetadataRow } from "./MetadataRow";

export function StoryRow(props: { storyId: string | null }) {
  const { storyId } = props;
  if (!storyId) {
    return null;
  }
  const storyKind = getStoryKindFromStoryId(storyId);
  if (!storyKind) {
    return null;
  }
  const filterKey = getFilterKey({
    category: MetadataCategory.storyKind,
    value: storyKind,
  });
  return (
    <MetadataRow>
      <FilterableIndicator filterKey={filterKey}>
        <Tooltip content="Story kind">
          <Chip icon={<BookMarkedIcon className="text-storybook-low" />}>
            {storyKind}
          </Chip>
        </Tooltip>
      </FilterableIndicator>
    </MetadataRow>
  );
}
