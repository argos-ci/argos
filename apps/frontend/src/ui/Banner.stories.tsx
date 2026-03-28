import type { Meta, StoryObj } from "@storybook/react-vite";

import { Banner } from "./Banner";

const meta = {
  title: "UI/Banner",
  component: Banner,
  args: { color: "neutral" },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Banner color="neutral">Neutral banner message</Banner>
      <Banner color="danger">Danger banner message</Banner>
      <Banner color="warning">Warning banner message</Banner>
    </div>
  ),
};
