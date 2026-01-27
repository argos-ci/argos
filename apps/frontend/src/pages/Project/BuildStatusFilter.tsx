import clsx from "clsx";
import { parseAsStringEnum } from "nuqs";
import { MenuTrigger } from "react-aria-components";

import { BuildStatus } from "@/gql/graphql";
import { Badge } from "@/ui/Badge";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { SelectButton } from "@/ui/Select";
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
    <MenuTrigger>
      <SelectButton className="text-sm">
        <div className="flex -space-x-1">
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
        </div>
        Status
        <Badge>
          {value.size}/{BuildStatuses.length}
        </Badge>
      </SelectButton>
      <Popover>
        <Menu
          aria-label="Build status"
          selectionMode="multiple"
          selectedKeys={value}
          onSelectionChange={(keys) => {
            if (keys === "all") {
              return;
            }
            onChange(keys as Set<BuildStatus>);
          }}
        >
          {BuildStatuses.map((status) => {
            const descriptor = buildStatusDescriptors[status];
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
