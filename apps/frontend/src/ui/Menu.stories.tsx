import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { SubmenuTrigger } from "react-aria-components";

import { Button } from "./Button";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuItemShortcut,
  MenuSeparator,
  MenuTitle,
  MenuTrigger,
} from "./Menu";
import { Popover } from "./Popover";
import {
  openOverlayParameters,
  OverlaySlot,
  OverlayStage,
} from "./storyOverlay";

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

/**
 * The menu popup itself. `Default` only ever photographs the closed trigger, so
 * without this the surface, the row states and the three `MenuItem` shapes
 * (plain, submenu, single- and multi-selection) have no visual baseline at all.
 */
export const Open: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuTrigger defaultOpen>
        <Button variant="secondary">Actions</Button>
        <Popover placement="bottom start">
          <Menu>
            <MenuTitle>Actions</MenuTitle>
            <MenuItem>
              <MenuItemIcon>
                <PencilIcon />
              </MenuItemIcon>
              Edit
              <MenuItemShortcut>⌘E</MenuItemShortcut>
            </MenuItem>
            <MenuItem>
              <MenuItemIcon>
                <CopyIcon />
              </MenuItemIcon>
              Duplicate
            </MenuItem>
            <SubmenuTrigger>
              <MenuItem>Move to</MenuItem>
              <Popover>
                <Menu>
                  <MenuItem>Archive</MenuItem>
                  <MenuItem>Backlog</MenuItem>
                </Menu>
              </Popover>
            </SubmenuTrigger>
            <MenuSeparator />
            <MenuItem isDisabled>Transfer ownership</MenuItem>
            <MenuItem variant="danger">
              <MenuItemIcon>
                <Trash2Icon />
              </MenuItemIcon>
              Delete
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
    </OverlayStage>
  ),
};

/** Single selection draws a check mark; multiple draws a checkbox. */
export const OpenWithSelection: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <OverlaySlot>
        <MenuTrigger defaultOpen>
          <Button variant="secondary">Sort by</Button>
          <Popover placement="bottom start">
            <Menu selectionMode="single" selectedKeys={["recent"]}>
              <MenuItem id="recent">Most recent</MenuItem>
              <MenuItem id="name">Name</MenuItem>
              <MenuItem id="status">Status</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </OverlaySlot>

      <OverlaySlot>
        <MenuTrigger defaultOpen>
          <Button variant="secondary">Status</Button>
          <Popover placement="bottom start">
            <Menu
              selectionMode="multiple"
              selectedKeys={["accepted", "pending"]}
            >
              <MenuItem id="accepted">Accepted</MenuItem>
              <MenuItem id="rejected">Rejected</MenuItem>
              <MenuItem id="pending">Pending</MenuItem>
              <MenuItem id="expired" isDisabled>
                Expired
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </OverlaySlot>
    </OverlayStage>
  ),
};
