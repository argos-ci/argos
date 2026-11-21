import type { Meta, StoryObj } from "@storybook/react-vite";

import { Callout } from "./Callout";

const meta = {
  title: "UI/Callout",
  component: Callout,
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <Callout>
        CI stops uploading on <strong>February 10, 2027</strong>. Create its
        replacement before then.
      </Callout>
      <Callout>
        Tokens with no expiration never expire. Consider setting an expiration
        date for better security, and rotate the token before it ends.
      </Callout>
    </div>
  ),
};
