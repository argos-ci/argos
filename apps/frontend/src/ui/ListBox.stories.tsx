import type { Meta, StoryObj } from "@storybook/react-vite";

import { ListBox, ListBoxItem, ListBoxSeparator } from "./ListBox";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/ListBox",
  component: ListBox,
} satisfies Meta<typeof ListBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Single Selection</StoryTitle>
      <div className="max-w-xs rounded-lg border p-1">
        <ListBox aria-label="Options" selectionMode="single">
          <ListBoxItem id="edit">Edit</ListBoxItem>
          <ListBoxItem id="duplicate">Duplicate</ListBoxItem>
          <ListBoxSeparator />
          <ListBoxItem id="delete">Delete</ListBoxItem>
        </ListBox>
      </div>

      <StoryTitle>Multiple Selection</StoryTitle>
      <div className="max-w-xs rounded-lg border p-1">
        <ListBox aria-label="Browsers" selectionMode="multiple">
          <ListBoxItem id="chrome">Chrome</ListBoxItem>
          <ListBoxItem id="firefox">Firefox</ListBoxItem>
          <ListBoxItem id="safari">Safari</ListBoxItem>
          <ListBoxItem id="edge">Edge</ListBoxItem>
        </ListBox>
      </div>
    </div>
  ),
};
