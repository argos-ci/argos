import type { Meta, StoryObj } from "@storybook/react-vite";

import { Pre } from "./Pre";

const meta = {
  title: "UI/Pre",
  component: Pre,
  args: { code: "" },
} satisfies Meta<typeof Pre>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Pre
      code={`npm install @argos-ci/cli
npx argos upload ./screenshots`}
    />
  ),
};
