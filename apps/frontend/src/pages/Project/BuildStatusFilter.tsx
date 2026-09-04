import clsx from "clsx";
import { parseAsStringEnum } from "nuqs";

import { BuildStatus } from "@/gql/graphql";
import { Badge } from "@/ui/Badge";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
import { SelectStyleButton } from "@/ui/Select";
import { StackedItems } from "@/ui/StackedItems";
import { buildStatusDescriptors } from "@/util/build";
import { bgSolidColorClassNames, lowTextColorClassNames } from "@/util/colors";
import { parseAsSetOf } from "@/util/search-params";

const BuildStatuses = [
  BuildStatus.Accepted,
  BuildStatus.Rejected,
  BuildStatus.NoChanges,
  BuildStatus.ChangesDetected,
  BuildStatus.Pending,
  BuildStatus.Progress,
  BuildStatus.Error,
  BuildStatus.Expired,
];

export const BuildStatusFilterParser = parseAsSetOf(
  parseAsStringEnum<BuildStatus>(BuildStatuses),
).withDefault(
  new Set([
    BuildStatus.Accepted,
    BuildStatus.Rejected,
    BuildStatus.NoChanges,
    BuildStatus.ChangesDetected,
    BuildStatus.Pending,
    BuildStatus.Progress,
    BuildStatus.Error,
  ]),
);

export function BuildStatusFilter(props: {
  value: Set<BuildStatus>;
  onChange: (value: Set<BuildStatus>) => void;
}) {
  const { value, onChange } = props;
  return (
    <MenuRoot>
      <MenuTrigger>
        <SelectStyleButton className="text-sm">
          <StackedItems>
            {BuildStatuses.map((status) => {
              return (
                <div
                  key={status}
                  className={clsx(
                    "size-2.5 rounded-full border",
                    value.has(status)
                      ? bgSolidColorClassNames[
                          buildStatusDescriptors[status].color
                        ]
                      : "bg-app",
                  )}
                />
              );
            })}
          </StackedItems>
          Status
          <Badge>
            {value.size}/{BuildStatuses.length}
          </Badge>
        </SelectStyleButton>
      </MenuTrigger>
      <Menu aria-label="Build status">
        {BuildStatuses.map((status) => {
          const descriptor = buildStatusDescriptors[status];
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
