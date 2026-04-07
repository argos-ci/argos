import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "./Button";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuSeparator,
  MenuTitle,
  MenuTrigger,
} from "./Menu";
import { Popover } from "./Popover";

const meta = {
  title: "UI/Menu",
  component: Menu,
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MenuTrigger>
      <Button variant="secondary">Open Menu</Button>
      <Popover>
        <Menu>
          <MenuTitle>Actions</MenuTitle>
          <MenuItem>
            <MenuItemIcon>
              <PencilIcon />
            </MenuItemIcon>
            Edit
          </MenuItem>
          <MenuItem>
            <MenuItemIcon>
              <CopyIcon />
            </MenuItemIcon>
            Duplicate
          </MenuItem>
          <MenuSeparator />
          <MenuItem variant="danger">
            <MenuItemIcon>
              <Trash2Icon />
            </MenuItemIcon>
            Delete
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  ),
};
