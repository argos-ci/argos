import clsx from "clsx";
import { parseAsStringEnum } from "nuqs";

import { BuildType } from "@/gql/graphql";
import { Badge } from "@/ui/Badge";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
import { SelectStyleButton } from "@/ui/Select";
import { StackedItems } from "@/ui/StackedItems";
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
    <MenuRoot>
      <MenuTrigger>
        <SelectStyleButton className="text-sm">
          <StackedItems>
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
          </StackedItems>
          Type
          <Badge>
            {value.size}/{BuildTypes.length}
          </Badge>
        </SelectStyleButton>
      </MenuTrigger>
      <Menu aria-label="Build type">
        {BuildTypes.map((status) => {
          const descriptor = buildTypeDescriptors[status];
          const Icon = descriptor.icon;
          return (
            <MenuItem
              icon={
                <Icon className={lowTextColorClassNames[descriptor.color]} />
              }
              checkbox
              key={status}
              textValue={descriptor.label}
              checked={value.has(status)}
              onAction={() => onChange(new Set([status]))}
              onCheckedChange={(checked: boolean) => {
                const next = new Set(value);
                if (checked) {
                  next.add(status);
                } else {
                  next.delete(status);
                }
                onChange(next);
              }}
            >
              {descriptor.label}
            </MenuItem>
          );
        })}
      </Menu>
    </MenuRoot>
  );
}
