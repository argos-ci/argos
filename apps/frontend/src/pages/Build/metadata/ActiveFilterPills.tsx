import { XIcon } from "lucide-react";
import { Button, Key, Tag, TagGroup, TagList } from "react-aria-components";

import { useMetadataFilterState } from "./MetadataFilterState";

export function ActiveFilterPills() {
  const { tags, selectedFilters, setSelectedFilters } =
    useMetadataFilterState();

  if (selectedFilters.length === 0) {
    return null;
  }

  const activeTags = selectedFilters
    .map((filterKey) => {
      const tag = tags.find((t) => `${t.category}:${t.value}` === filterKey);
      return tag ? { id: filterKey, name: tag.label } : null;
    })
    .filter((tag): tag is { id: string; name: string } => tag !== null);

  function handleOnRemove(keys: Set<Key>) {
    const removedKeys = new Set(Array.from(keys, String));
    setSelectedFilters(
      selectedFilters.filter((filter) => !removedKeys.has(filter)),
    );
  }

  return (
    <div className="flex flex-col gap-1 border-b px-2 pt-1 pb-2">
      <div className="text-low text-xxs font-semibold">Filters</div>
      <TagGroup aria-label="Active metadata filters" onRemove={handleOnRemove}>
        <TagList items={activeTags} className="flex flex-wrap gap-1">
          {(item) => (
            <Tag
              id={item.id}
              className="text-xxs border-primary text-low flex w-fit items-center gap-0.5 rounded-xl border px-1.5 py-0.5 leading-none font-semibold tabular-nums"
            >
              {item.name}
              <Button slot="remove" className="mt-px -mr-0.5">
                <XIcon className="size-3" />
              </Button>
            </Tag>
          )}
        </TagList>
      </TagGroup>
    </div>
  );
}
