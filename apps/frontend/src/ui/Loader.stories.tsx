import type { Meta, StoryObj } from "@storybook/react-vite";

import { Loader } from "./Loader";

const meta = {
  title: "UI/Loader",
  component: Loader,
  tags: ["skip-test"],
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Loader delay={0} className="size-6" />
      <Loader delay={0} className="size-10" />
      <Loader delay={0} className="size-16" />
    </div>
  ),
};
