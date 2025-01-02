import clsx from "clsx";
import { MenuTrigger } from "react-aria-components";

import { buildStatusDescriptors } from "@/containers/Build";
import { BuildStatus } from "@/gql/graphql";
import { Badge } from "@/ui/Badge";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { SelectButton } from "@/ui/Select";
import { bgColorClassNames, lowTextColorClassNames } from "@/util/colors";
import { useMultipleSearchParamsState } from "@/util/search-params";

const buildStatuses = [
  BuildStatus.Accepted,
  BuildStatus.Rejected,
  BuildStatus.NoChanges,
  BuildStatus.ChangesDetected,
  BuildStatus.Pending,
  BuildStatus.Progress,
  BuildStatus.Error,
  BuildStatus.Expired,
];

const defaultStatuses = new Set([
  BuildStatus.Accepted,
  BuildStatus.Rejected,
  BuildStatus.NoChanges,
  BuildStatus.ChangesDetected,
  BuildStatus.Pending,
  BuildStatus.Progress,
  BuildStatus.Error,
]);

export function useBuildStatusFilterState() {
  return useMultipleSearchParamsState<BuildStatus>("status", {
    defaultValue: defaultStatuses,
  });
}

export function BuildStatusFilter(props: {
  value: Set<BuildStatus>;
  onChange: (value: Set<BuildStatus>) => void;
}) {
  const { value, onChange } = props;
  return (
    <MenuTrigger>
      <SelectButton className="text-sm">
        <div className="flex -space-x-1">
          {buildStatuses.map((status) => {
            return (
              <div
                key={status}
                className={clsx(
                  "size-2.5 rounded-full border",
                  value.has(status)
                    ? bgColorClassNames[buildStatusDescriptors[status].color]
                    : "bg-app",
                )}
              />
            );
          })}
        </div>
        Status
        <Badge>
          {value.size}/{buildStatuses.length}
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
          {buildStatuses.map((status) => {
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
