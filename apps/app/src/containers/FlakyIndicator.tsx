import {
  ArrowRightCircleIcon,
  BugAntIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/20/solid";
import moment from "moment";

import { Test, TestStatus } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItemIcon,
  useMenuState,
} from "@/ui/Menu";
import { MagicTooltip } from "@/ui/Tooltip";

export const FlakyChip = ({
  test,
  className,
}: {
  test: Pick<Test, "status" | "unstable" | "resolvedDate"> | null;
  className?: string | undefined;
}) => {
  if (!test || !test.status) {
    return null;
  }

  const { label, color, icon: Icon, tooltip } = getFlakyIndicatorProps(test);
  if (!label) {
    return null;
  }

  return (
    <MagicTooltip tooltip={tooltip}>
      <div className={className}>
        <Chip icon={Icon} color={color} scale="sm">
          {label}
        </Chip>
      </div>
    </MagicTooltip>
  );
};

type updateOption = {
  [key: string]: {
    label: string;
    icon: React.ComponentType<any>;
    tooltip: string;
    status: TestStatus;
  };
};

const updateOptionProps: updateOption = {
  flaky: {
    label: "Mark as Flaky",
    icon: BugAntIcon,
    tooltip:
      "Mark a test as flaky to highlight its inconsistency for future review",
    status: TestStatus.Flaky,
  },
  cancelFlaky: {
    label: "Cancel Flaky flag",
    icon: XCircleIcon,
    tooltip: "Remove flaky flag if mistakenly added",
    status: TestStatus.Pending,
  },
  resolve: {
    label: "Resolve",
    icon: CheckCircleIcon,
    tooltip: "Mark flaky test as resolved after addressing the issue",
    status: TestStatus.Resolved,
  },
};

export const getFlakyIndicatorProps = (
  test: Pick<Test, "status" | "unstable" | "resolvedDate">
) => {
  const { status, unstable, resolvedDate } = test;

  switch (status) {
    case "pending":
      return unstable
        ? {
            label: "Test unstable",
            color: "neutral" as const,
            icon: ExclamationTriangleIcon,
            tooltip:
              "High instability and potential flakiness detected in the past 7 days",
            updateOptions: ["flaky"],
          }
        : {
            label: null,
            color: "neutral" as const,
            icon: null,
            updateOptions: [],
          };

    case "flaky":
      return {
        label: "Flaky",
        color: "warning" as const,
        icon: BugAntIcon,
        tooltip: "Unreliable test that may have false positives",
        updateOptions: ["resolve", "cancelFlaky"],
      };

    case "resolved":
      return {
        label: "Resolved",
        color: "success" as const,
        icon: CheckCircleIcon,
        tooltip: `This test has been resolved and its stability score reset${
          resolvedDate ? ` on: ${moment(resolvedDate).format("LLL")}` : ""
        }`,
        updateOptions: unstable ? ["flaky"] : [],
      };

    default:
      throw new Error(`Invalid test status: ${status}`);
  }
};

export const FlakyDropdown = ({
  test,
  className = "",
  handleTestStatusChange,
}: {
  test: Pick<Test, "id" | "status" | "unstable" | "resolvedDate"> | null;
  className?: string;
  handleTestStatusChange: ({
    id,
    status,
  }: {
    id: string;
    status: TestStatus;
  }) => void;
}) => {
  const menu = useMenuState({ placement: "right", gutter: 4 });
  if (!test || !test.status) {
    return null;
  }

  const indicatorProps = getFlakyIndicatorProps(test);
  if (!indicatorProps?.label) {
    return null;
  }

  const { tooltip, icon: Icon, color, label, updateOptions } = indicatorProps;
  return (
    <MagicTooltip tooltip={tooltip}>
      <div className={className}>
        <MenuButton state={menu}>
          <Chip icon={Icon} color={color} scale="sm">
            {label}
            <ArrowRightCircleIcon className="mr-[-4px] h-3 w-3 shrink-0" />
          </Chip>
        </MenuButton>

        <Menu state={menu} aria-label="Flaky options">
          {updateOptions.map((option, index) => {
            const optionProps = updateOptionProps[option];
            if (!optionProps) {
              return null;
            }

            const { icon: OptionIcon } = optionProps;
            return (
              <MagicTooltip tooltip={optionProps.tooltip} key={index}>
                <MenuItem
                  state={menu}
                  onClick={() => {
                    handleTestStatusChange({
                      id: test.id,
                      status: optionProps.status,
                    });
                    menu.hide();
                  }}
                >
                  <MenuItemIcon>
                    <OptionIcon />
                  </MenuItemIcon>
                  {optionProps.label}
                </MenuItem>
              </MagicTooltip>
            );
          })}
        </Menu>
      </div>
    </MagicTooltip>
  );
};
