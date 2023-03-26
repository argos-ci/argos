import {
  CalendarDaysIcon,
  ClockIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/20/solid";
import moment from "moment";

import { ButtonArrow } from "@/ui/Button";
import { ListHeaderButton } from "@/ui/List";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItemIcon,
  useMenuState,
} from "@/ui/Menu";
import { MagicTooltip } from "@/ui/Tooltip";

type muteOption = {
  label: string;
  tooltip?: string;
  icon: React.ComponentType<any>;
  muted: boolean;
  muteUntil: string | null;
};

const muteOptions: muteOption[] = [
  {
    label: "Unmute",
    icon: SpeakerWaveIcon,
    muted: false,
    muteUntil: null,
  },
  {
    label: "Mute for 48H",
    icon: ClockIcon,
    muted: true,
    muteUntil: moment().add(2, "days").toISOString(),
  },
  {
    label: "Mute for 1 week",
    icon: CalendarDaysIcon,
    muted: true,
    muteUntil: moment().add(1, "week").toISOString(),
  },
  {
    label: "Mute for 1 month",
    icon: CalendarDaysIcon,
    muted: true,
    muteUntil: moment().add(1, "month").toISOString(),
  },
  {
    label: "Mute indefinitely",
    icon: SpeakerXMarkIcon,
    muted: true,
    muteUntil: null,
    tooltip:
      "It's recommended to fix or remove the test instead of muting it indefinitely",
  },
];

export const MuteTestDropdown = ({
  onClick,
  disabled = true,
  onlyUnmuteSelected,
}: {
  onClick: ({
    muted,
    muteUntil,
  }: {
    muted: boolean;
    muteUntil: string | null;
  }) => void;
  disabled: boolean;
  onlyUnmuteSelected: boolean;
}) => {
  const menu = useMenuState({ placement: "bottom-start", gutter: 4 });

  return (
    <MagicTooltip
      tooltip={
        disabled
          ? "Select a test to mute it"
          : "Mute a test to prevent it from triggering the GitHub status check"
      }
    >
      <div>
        <MenuButton state={menu} as={ListHeaderButton} disabled={disabled}>
          <SpeakerXMarkIcon className="mr-2 h-4 w-4" />
          Mute
          <ButtonArrow />
        </MenuButton>
        <Menu state={menu} aria-label="Mute options">
          {muteOptions.map(
            ({ label, tooltip, icon: Icon, muted, muteUntil }, index) => (
              <MagicTooltip tooltip={tooltip} key={index}>
                <MenuItem
                  state={menu}
                  onClick={() => {
                    onClick({ muted, muteUntil });
                    menu.hide();
                  }}
                  disabled={onlyUnmuteSelected && !muted}
                >
                  <MenuItemIcon>
                    <Icon />
                  </MenuItemIcon>
                  {label}
                </MenuItem>
              </MagicTooltip>
            )
          )}
        </Menu>
      </div>
    </MagicTooltip>
  );
};
