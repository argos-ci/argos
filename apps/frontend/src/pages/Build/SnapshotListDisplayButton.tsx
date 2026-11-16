import {
  CircleDotIcon,
  FlaskConicalIcon,
  ImageIcon,
  ListIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { Button } from "@/ui/Button";
import {
  Menu,
  MenuHeading,
  MenuItem,
  MenuRoot,
  MenuSection,
  MenuTrigger,
} from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildDiffState } from "./BuildDiffState";
import { useSnapshotDisplay } from "./SnapshotListPreferences";

export function SnapshotListDisplayButton() {
  const { grouping, setGrouping } = useBuildDiffState();
  const [display, setDisplay] = useSnapshotDisplay();
  return (
    <MenuRoot>
      <Tooltip content="Display options">
        <MenuTrigger>
          <Button
            variant="ghost"
            iconOnly
            size="small"
            aria-label="Display options"
          >
            <SlidersHorizontalIcon />
          </Button>
        </MenuTrigger>
      </Tooltip>
      <Menu aria-label="Display options">
        <MenuSection>
          <MenuHeading>Group by</MenuHeading>
          <MenuItem
            icon={<CircleDotIcon />}
            checked={grouping === "status"}
            onAction={() => setGrouping("status")}
          >
            Status
          </MenuItem>
          <MenuItem
            icon={<FlaskConicalIcon />}
            checked={grouping === "test"}
            onAction={() => setGrouping("test")}
          >
            Test
          </MenuItem>
        </MenuSection>
        <MenuSection>
          <MenuHeading>Show</MenuHeading>
          <MenuItem
            icon={<ImageIcon />}
            checked={display === "screenshots"}
            onAction={() => setDisplay("screenshots")}
          >
            Screenshots
          </MenuItem>
          <MenuItem
            icon={<ListIcon />}
            checked={display === "names"}
            onAction={() => setDisplay("names")}
          >
            Names
          </MenuItem>
        </MenuSection>
      </Menu>
    </MenuRoot>
  );
}
