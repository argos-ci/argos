import type { Meta, StoryObj } from "@storybook/react-vite";

import { Truncable } from "./Truncable";

const meta = {
  title: "UI/Truncable",
  component: Truncable,
  args: { children: "Text" },
} satisfies Meta<typeof Truncable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-[200px] flex-col gap-4">
      <Truncable>Short text</Truncable>
      <Truncable>
        This is a very long text that should be truncated and show a tooltip on
        hover
      </Truncable>
    </div>
  ),
};
