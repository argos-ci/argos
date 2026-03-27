import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./Label";
import { ListBox, ListBoxItem } from "./ListBox";
import { Popover } from "./Popover";
import { Select, SelectButton } from "./Select";

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
        <Popover>
          <ListBox>
            <ListBoxItem id="a">Option A</ListBoxItem>
            <ListBoxItem id="b">Option B</ListBoxItem>
          </ListBox>
        </Popover>
      </Select>
      <Select placeholder="Choose…">
        <Label>Medium</Label>
        <SelectButton size="md">Choose…</SelectButton>
        <Popover>
          <ListBox>
            <ListBoxItem id="a">Option A</ListBoxItem>
            <ListBoxItem id="b">Option B</ListBoxItem>
          </ListBox>
        </Popover>
      </Select>
    </div>
  ),
};
