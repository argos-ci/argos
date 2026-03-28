import type { Meta, StoryObj } from "@storybook/react-vite";

import { CopyButton } from "./CopyButton";

const meta = {
  title: "UI/CopyButton",
  component: CopyButton,
  args: { text: "npm install @argos-ci/cli" },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <code className="text-sm">npm install @argos-ci/cli</code>
      <CopyButton text="npm install @argos-ci/cli" />
    </div>
  ),
};
