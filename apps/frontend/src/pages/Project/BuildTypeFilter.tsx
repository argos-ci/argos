import clsx from "clsx";
import { parseAsStringEnum } from "nuqs";
import { MenuTrigger } from "react-aria-components";

import { BuildType } from "@/gql/graphql";
import { Badge } from "@/ui/Badge";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { SelectButton } from "@/ui/Select";
import { buildTypeDescriptors } from "@/util/build";
import { bgSolidColorClassNames, lowTextColorClassNames } from "@/util/colors";
import { parseAsSetOf } from "@/util/search-params";

const BuildTypes = [
  BuildType.Check,
  BuildType.Orphan,
  BuildType.Reference,
  BuildType.Skipped,
];

export const BuildTypeFilterParser = parseAsSetOf(
  parseAsStringEnum<BuildType>(BuildTypes),
).withDefault(new Set(BuildTypes));

export function BuildTypeFilter(props: {
  value: Set<BuildType>;
  onChange: (value: Set<BuildType>) => void;
}) {
  const { value, onChange } = props;
  return (
    <MenuTrigger>
      <SelectButton className="text-sm">
        <div className="flex -space-x-1">
          {BuildTypes.map((type) => {
            return (
              <div
                key={type}
                className={clsx(
                  "size-2.5 rounded-full border",
                  value.has(type)
                    ? bgSolidColorClassNames[buildTypeDescriptors[type].color]
                    : "bg-app",
                )}
              />
            );
          })}
        </div>
        Type
        <Badge>
          {value.size}/{BuildTypes.length}
        </Badge>
      </SelectButton>
      <Popover>
        <Menu
          aria-label="Build type"
          selectionMode="multiple"
          selectedKeys={value}
          onSelectionChange={(keys) => {
            if (keys === "all") {
              return;
            }
            onChange(keys as Set<BuildType>);
          }}
        >
          {BuildTypes.map((status) => {
            const descriptor = buildTypeDescriptors[status];
            const Icon = descriptor.icon;
            return (
              <MenuItem key={status} id={status} textValue={descriptor.label}>
                <MenuItemIcon>
                  <Icon className={lowTextColorClassNames[descriptor.color]} />
                </MenuItemIcon>
                {descriptor.label}
              </MenuItem>
            );
          })}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
