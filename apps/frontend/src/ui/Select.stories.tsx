import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./Label";
import { ListBox, ListBoxItem } from "./ListBox";
import { Select, SelectButton, SelectValue } from "./Select";
import {
  openOverlayParameters,
  OverlaySlot,
  OverlayStage,
} from "./storyOverlay";

const OPTIONS = { a: "Option A", b: "Option B", c: "Option C" };

const meta = {
  title: "UI/Select",
  component: Select,
  args: { children: null },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-6">
      <Select items={OPTIONS}>
        <Label>Small</Label>
        <SelectButton size="sm">
          <SelectValue placeholder="Choose…" />
        </SelectButton>
        <ListBox>
          <ListBoxItem value="a">Option A</ListBoxItem>
          <ListBoxItem value="b">Option B</ListBoxItem>
        </ListBox>
      </Select>
      <Select items={OPTIONS}>
        <Label>Medium</Label>
        <SelectButton size="md">
          <SelectValue placeholder="Choose…" />
        </SelectButton>
        <ListBox>
          <ListBoxItem value="a">Option A</ListBoxItem>
          <ListBoxItem value="b">Option B</ListBoxItem>
        </ListBox>
      </Select>
    </div>
  ),
};

/**
 * The list a select drops. Worth pinning carefully: Base UI's
 * `Select.Positioner` defaults to laying the chosen option over the trigger
 * rather than dropping the list below it, and this is the baseline that
 * catches it.
 */
export const Open: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <OverlaySlot>
        <Select items={OPTIONS} value="b" aria-label="Small" defaultOpen>
          <SelectButton size="sm">
            <SelectValue />
          </SelectButton>
          <ListBox>
            <ListBoxItem value="a">Option A</ListBoxItem>
            <ListBoxItem value="b">Option B</ListBoxItem>
            <ListBoxItem value="c">Option C</ListBoxItem>
          </ListBox>
        </Select>
      </OverlaySlot>

      <OverlaySlot>
        <Select items={OPTIONS} value="b" aria-label="Medium" defaultOpen>
          <SelectButton size="md">
            <SelectValue />
          </SelectButton>
          <ListBox>
            <ListBoxItem value="a">Option A</ListBoxItem>
            <ListBoxItem value="b">Option B</ListBoxItem>
            <ListBoxItem value="c" disabled>
              Option C
            </ListBoxItem>
          </ListBox>
        </Select>
      </OverlaySlot>
    </OverlayStage>
  ),
};
