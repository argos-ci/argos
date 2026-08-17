import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./Label";
import { ListBox, ListBoxItem } from "./ListBox";
import { SelectPopover } from "./Popover";
import { Select, SelectButton, SelectValue } from "./Select";
import {
  openOverlayParameters,
  OverlaySlot,
  OverlayStage,
} from "./storyOverlay";

const meta = {
  title: "UI/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-6">
      <Select placeholder="Choose…">
        <Label>Small</Label>
        <SelectButton size="sm">Choose…</SelectButton>
        <SelectPopover>
          <ListBox>
            <ListBoxItem id="a">Option A</ListBoxItem>
            <ListBoxItem id="b">Option B</ListBoxItem>
          </ListBox>
        </SelectPopover>
      </Select>
      <Select placeholder="Choose…">
        <Label>Medium</Label>
        <SelectButton size="md">Choose…</SelectButton>
        <SelectPopover>
          <ListBox>
            <ListBoxItem id="a">Option A</ListBoxItem>
            <ListBoxItem id="b">Option B</ListBoxItem>
          </ListBox>
        </SelectPopover>
      </Select>
    </div>
  ),
};

/**
 * The list box a select drops. Worth pinning carefully: Base UI's
 * `Select.Positioner` defaults to aligning the selected item over the trigger
 * rather than dropping below it, so this is the baseline that catches it.
 */
export const Open: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <OverlaySlot>
        <Select selectedKey="b" aria-label="Small" defaultOpen>
          <SelectButton size="sm">
            <SelectValue />
          </SelectButton>
          <SelectPopover>
            <ListBox>
              <ListBoxItem id="a">Option A</ListBoxItem>
              <ListBoxItem id="b">Option B</ListBoxItem>
              <ListBoxItem id="c">Option C</ListBoxItem>
            </ListBox>
          </SelectPopover>
        </Select>
      </OverlaySlot>

      <OverlaySlot>
        <Select selectedKey="b" aria-label="Medium" defaultOpen>
          <SelectButton size="md">
            <SelectValue />
          </SelectButton>
          <SelectPopover>
            <ListBox>
              <ListBoxItem id="a">Option A</ListBoxItem>
              <ListBoxItem id="b">Option B</ListBoxItem>
              <ListBoxItem id="c" isDisabled>
                Option C
              </ListBoxItem>
            </ListBox>
          </SelectPopover>
        </Select>
      </OverlaySlot>
    </OverlayStage>
  ),
};
