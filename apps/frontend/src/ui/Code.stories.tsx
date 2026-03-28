import type { Meta, StoryObj } from "@storybook/react-vite";

import { Code } from "./Code";

const meta = {
  title: "UI/Code",
  component: Code,
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <p className="text-sm">
      Run <Code>npm install @argos-ci/cli</Code> to get started.
    </p>
  ),
};
