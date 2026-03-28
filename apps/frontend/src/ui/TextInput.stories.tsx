import type { Meta, StoryObj } from "@storybook/react-vite";

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
