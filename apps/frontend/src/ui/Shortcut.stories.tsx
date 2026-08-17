import type { Meta, StoryObj } from "@storybook/react-vite";

import { Shortcut } from "./Shortcut";
import { StoryTitle } from "./StoryTitle";

/**
 * The two looks a shortcut takes, and why they differ.
 *
 * A menu row annotates a command with its keys, so they stay quiet — a list of
 * framed rows does not need a second frame per row. A tooltip is two things on
 * screen, where the same keys read as keycaps rather than clutter.
 */
const meta = {
  title: "UI/Shortcut",
  component: Shortcut,
  args: { keys: ["⌘", "⌥", "1"] },
} satisfies Meta<typeof Shortcut>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex flex-col">
      <StoryTitle>Text — on a menu row</StoryTitle>
      <div className="border-thin w-64 rounded-xl p-1.5">
        <div className="text-menu flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-[450]">
          <span className="min-w-0 flex-1 truncate">Heading 1</span>
          <Shortcut {...args} />
        </div>
        <div className="text-menu flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-[450]">
          <span className="min-w-0 flex-1 truncate">Bulleted list</span>
          <Shortcut keys={["⌘", "⇧", "8"]} />
        </div>
      </div>

      <StoryTitle>Boxed — in a tooltip</StoryTitle>
      <div className="border-thin flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs">
        <span>Toggle heading</span>
        <span className="text-low">·</span>
        <Shortcut {...args} variant="boxed" />
      </div>
    </div>
  ),
};
