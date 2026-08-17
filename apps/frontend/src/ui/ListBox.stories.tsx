import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  ListBox,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
  ListBoxSeparator,
} from "./ListBox";
import { Select, SelectButton, SelectValue } from "./Select";
import {
  openOverlayParameters,
  OverlaySlot,
  OverlayStage,
} from "./storyOverlay";

/**
 * The options a `Select` drops. They are Base UI select parts now rather than
 * a standalone react-aria list box, so they only exist inside a select — which
 * is how all sixteen call sites already used them.
 */
const meta = {
  title: "UI/ListBox",
  component: ListBox,
  args: { children: null },
} satisfies Meta<typeof ListBox>;

export default meta;
type Story = StoryObj<typeof meta>;

const ACTIONS = { edit: "Edit", duplicate: "Duplicate", delete: "Delete" };
const REVIEWERS = { jane: "Jane Doe", long: "A reviewer with a long name" };

export const Default: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <OverlaySlot>
        <Select items={ACTIONS} value="edit" aria-label="Options" defaultOpen>
          <SelectButton>
            <SelectValue />
          </SelectButton>
          <ListBox>
            <ListBoxItem value="edit">Edit</ListBoxItem>
            <ListBoxItem value="duplicate">Duplicate</ListBoxItem>
            <ListBoxSeparator />
            <ListBoxItem value="delete">Delete</ListBoxItem>
          </ListBox>
        </Select>
      </OverlaySlot>
    </OverlayStage>
  ),
};

/**
 * An option can carry a second line saying what choosing it means. The name
 * ellipsizes; the description wraps under it.
 */
export const LabelAndDescription: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <OverlaySlot>
        <Select
          items={REVIEWERS}
          value="jane"
          aria-label="Reviewers"
          defaultOpen
        >
          <SelectButton>
            <SelectValue />
          </SelectButton>
          <ListBox className="w-64">
            <ListBoxItem value="jane">
              <ListBoxItemLabel>Jane Doe</ListBoxItemLabel>
              <ListBoxItemDescription>jane@argos-ci.com</ListBoxItemDescription>
            </ListBoxItem>
            <ListBoxItem value="long">
              <ListBoxItemLabel>
                A reviewer whose name is long enough to be truncated
              </ListBoxItemLabel>
              <ListBoxItemDescription>
                someone.with.a.long.address@example.com
              </ListBoxItemDescription>
            </ListBoxItem>
          </ListBox>
        </Select>
      </OverlaySlot>
    </OverlayStage>
  ),
};
