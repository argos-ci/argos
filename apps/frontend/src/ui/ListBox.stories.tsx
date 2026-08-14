import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  ListBox,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
  ListBoxSeparator,
} from "./ListBox";
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
      <div className="border-thin max-w-xs rounded-lg">
        <ListBox aria-label="Options" selectionMode="single">
          <ListBoxItem id="edit">Edit</ListBoxItem>
          <ListBoxItem id="duplicate">Duplicate</ListBoxItem>
          <ListBoxSeparator />
          <ListBoxItem id="delete">Delete</ListBoxItem>
        </ListBox>
      </div>

      <StoryTitle>Multiple Selection</StoryTitle>
      <div className="border-thin max-w-xs rounded-lg">
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

/**
 * Label and description rows are styled through the `slot` DOM attribute
 * (`has-[[slot=description]]:flex-wrap`, `**:[[slot=label]]:truncate`), which
 * react-aria's `Text` sets for us. A replacement that drops the attribute
 * breaks these silently.
 */
export const LabelAndDescription: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Label and description</StoryTitle>
      <div className="border-thin max-w-xs rounded-lg">
        <ListBox aria-label="Reviewers" selectionMode="single">
          <ListBoxItem id="jane" textValue="Jane Doe">
            <ListBoxItemLabel>Jane Doe</ListBoxItemLabel>
            <ListBoxItemDescription>jane@argos-ci.com</ListBoxItemDescription>
          </ListBoxItem>
          <ListBoxItem id="long" textValue="A very long name">
            <ListBoxItemLabel>
              A reviewer whose name is long enough to be truncated
            </ListBoxItemLabel>
            <ListBoxItemDescription>
              someone.with.a.long.address@example.com
            </ListBoxItemDescription>
          </ListBoxItem>
        </ListBox>
      </div>
    </div>
  ),
};
