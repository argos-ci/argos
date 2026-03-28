import type { Meta, StoryObj } from "@storybook/react-vite";

import { Details, Summary } from "./Details";

const meta = {
  title: "UI/Details",
  component: Details,
} satisfies Meta<typeof Details>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Details>
      <Summary>Advanced Settings</Summary>
      <div className="text-sm">
        <p>Here are additional configuration options.</p>
      </div>
    </Details>
  ),
};
