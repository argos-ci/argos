import { Fragment } from "react";
import type { Selection } from "react-aria-components";

import { Menu, MenuCheckboxItem, MenuSeparator } from "@/ui/Menu";

import { TagValueIcon } from "./MetadataCategories";
import type { MetadataTag } from "./MetadataFilterState";
import type { MetadataCategory } from "./metadataIcons";

type MetadataCategoryMenuProps = {
  category: MetadataCategory;
  tags: MetadataTag[];
  selectedKeys: Set<string>;
  onSelectionChange: (selection: Selection) => void;
  className?: string;
  onOptionClick?: () => void;
  splitSelected?: boolean;
};

const MetadataCategoryMenuOption = (props: {
  category: MetadataCategory;
  tag: MetadataTag;
  onOptionClick?: () => void;
}) => {
  const { category, tag } = props;
  const key = `${tag.category}:${tag.value}`;

  return (
    <MenuCheckboxItem key={key} id={key} textValue={tag.label}>
      <div
        className="flex flex-1 items-center justify-between gap-6"
        onClick={props.onOptionClick}
      >
        <div className="flex items-center gap-1.5">
          <TagValueIcon category={category} value={tag.value} />
          <span className="truncate">{tag.label}</span>
        </div>
        <span className="text-low shrink-0 text-xs">{tag.count}</span>
      </div>
    </MenuCheckboxItem>
  );
};

export const MetadataCategoryMenu = (props: MetadataCategoryMenuProps) => {
  const checkedTags = props.tags.filter((tag) =>
    props.selectedKeys.has(`${tag.category}:${tag.value}`),
  );
  const uncheckedTags = props.tags.filter(
    (tag) => !props.selectedKeys.has(`${tag.category}:${tag.value}`),
  );
  const visibleTags = props.splitSelected
    ? [...checkedTags, ...uncheckedTags]
    : props.tags;
  const showMenuSeparator =
    props.splitSelected && checkedTags.length > 0 && uncheckedTags.length > 0;

  return (
    <Menu
      aria-label={`${props.category} filters`}
      selectionMode="multiple"
      selectedKeys={props.selectedKeys}
      onSelectionChange={props.onSelectionChange}
      className={props.className}
    >
      {visibleTags.map((tag, index) => {
        return (
          <Fragment key={`${tag.category}:${tag.value}`}>
            {showMenuSeparator && index === checkedTags.length && (
              <MenuSeparator />
            )}

            <MetadataCategoryMenuOption
              category={props.category}
              tag={tag}
              onOptionClick={props.onOptionClick}
            />
          </Fragment>
        );
      })}
    </Menu>
  );
};
