import type { Meta, StoryObj } from "@storybook/react-vite";

import { StoryTitle } from "./StoryTitle";
import { Switch } from "./Switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Sizes</StoryTitle>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch size="sm" />
          Small
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch size="md" />
          Medium
        </label>
      </div>

      <StoryTitle>States</StoryTitle>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch />
          Off
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch defaultSelected />
          On
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch isDisabled />
          Disabled
        </label>
      </div>
    </div>
  ),
};
