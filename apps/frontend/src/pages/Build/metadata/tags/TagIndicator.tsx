import { use, useRef, useState } from "react";
import { FunnelPlusIcon, FunnelXIcon, TagIcon } from "lucide-react";

import { Chip, type ChipProps } from "@/ui/Chip";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";

import { FilterState, FilterStateContext } from "../filters/FilterState";
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

type TagIndicatorWithMenuProps = TagProps & {
  filterState: FilterState;
};

type TagIndicatorMenuProps = {
  isActive: boolean;
  onToggle: () => void;
};

const TagIndicatorMenu = ({ isActive, onToggle }: TagIndicatorMenuProps) => {
  const [initialIsActive] = useState(isActive);
  const action = initialIsActive
    ? { icon: FunnelXIcon, label: "Remove filter" }
    : { icon: FunnelPlusIcon, label: "Add filter" };
  return (
    <Menu autoFocus className="text-sm" aria-label="Actions">
      <MenuItem onPress={onToggle}>
        <MenuItemIcon>
          <action.icon />
        </MenuItemIcon>
        {action.label}
      </MenuItem>
    </Menu>
  );
};

function getTagFilterState(props: {
  filterState: FilterState;
  tag: TagWithSource;
}) {
  const filterKey = getTagFilterKey(props.tag);
  const isActive = props.filterState.active.has(filterKey);

  const toggle = () => {
    props.filterState.setActive(
      isActive
        ? props.filterState.active.difference(new Set([filterKey]))
        : props.filterState.active.union(new Set([filterKey])),
    );
  };

  return { isActive, toggle };
}

const TagIndicatorWithMenu = ({
  filterState,
  tag,
}: TagIndicatorWithMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { isActive, toggle } = getTagFilterState({ filterState, tag });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
  };

  return (
    <div ref={ref} onContextMenu={handleContextMenu}>
      <Tag tag={tag} />
      <Popover
        triggerRef={ref}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom start"
      >
        <TagIndicatorMenu
          isActive={isActive}
          onToggle={() => {
            toggle();
            setIsOpen(false);
          }}
        />
      </Popover>
    </div>
  );
};

export const TagIndicator = ({ tag }: TagProps) => {
  const filterState = use(FilterStateContext);
  if (filterState) {
    return <TagIndicatorWithMenu filterState={filterState} tag={tag} />;
  }

  return <Tag tag={tag} />;
};
