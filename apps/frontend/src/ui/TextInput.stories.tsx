import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent } from "storybook/test";

import { Label } from "./Label";
import { StoryTitle } from "./StoryTitle";
import { TextInput } from "./TextInput";

const meta = {
  title: "UI/TextInput",
  component: TextInput,
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Scales</StoryTitle>
      <div className="flex max-w-xs flex-col gap-4">
        <div>
          <Label>Small</Label>
          <TextInput scale="sm" placeholder="Small input" />
        </div>
        <div>
          <Label>Medium</Label>
          <TextInput scale="md" placeholder="Medium input" />
        </div>
        <div>
          <Label>Large</Label>
          <TextInput scale="lg" placeholder="Large input" />
        </div>
      </div>

      <StoryTitle>States</StoryTitle>
      <div className="flex max-w-xs flex-col gap-4">
        <TextInput placeholder="Default" />
        <TextInput placeholder="Disabled" disabled />
        <TextInput placeholder="Invalid" aria-invalid="true" />
      </div>
    </div>
  ),
};

/**
 * Keyboard focus, reached by tabbing. This is the one place `:focus-visible` is
 * not a drop-in for react-aria's modality tracking — a text input matches
 * `:focus-visible` on a plain click too, so the ring here has to keep coming
 * from "was the keyboard used", not from the browser's own heuristic. Argos
 * moves the pointer away before capturing but does not blur, so the ring
 * survives the shutter.
 */
export const KeyboardFocus: Story = {
  play: async () => {
    await userEvent.tab();
  },
  render: () => (
    <div className="flex max-w-xs flex-col gap-4 p-4">
      <div>
        <Label>Focused</Label>
        <TextInput placeholder="Focused" />
      </div>
      <div>
        <Label invalid>Invalid</Label>
        <TextInput placeholder="Invalid" aria-invalid="true" />
      </div>
    </div>
  ),
};
