import type { Meta, StoryObj } from "@storybook/react-vite";

import { StackedItems } from "./StackedItems";

const meta = {
  title: "UI/StackedItems",
  component: StackedItems,
} satisfies Meta<typeof StackedItems>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StackedItems>
      {["#6366f1", "#ec4899", "#f59e0b", "#10b981"].map((color) => (
        <div
          key={color}
          className="size-8 rounded-full border-2 border-white"
          style={{ backgroundColor: color }}
        />
      ))}
    </StackedItems>
  ),
};
