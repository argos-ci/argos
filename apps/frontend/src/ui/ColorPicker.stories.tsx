import type { Meta, StoryObj } from "@storybook/react-vite";

import { ColorSwatchPicker, ColorSwatchPickerItem } from "./ColorPicker";
import { StoryTitle } from "./StoryTitle";

// The palette from the build toolbar's diff-colour setting, the only consumer.
const COLORS = [
  "#FF5470",
  "#FF007C",
  "#FD3A4A",
  "#FFAA1D",
  "#299617",
  "#2243B6",
  "#5DADEC",
  "#5946B2",
  "#000",
];

const meta = {
  title: "UI/ColorPicker",
  component: ColorSwatchPicker,
  args: {
    value: "#FFAA1D",
    onChange: () => {},
    children: COLORS.map((color) => (
      <ColorSwatchPickerItem key={color} color={color} />
    )),
  },
} satisfies Meta<typeof ColorSwatchPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * react-aria's colour swatch picker has no Base UI counterpart — it is a toggle
 * group now — so the selected ring is worth a baseline of its own.
 */
export const Default: Story = {
  render: (args) => (
    <div className="flex max-w-xs flex-col">
      <StoryTitle>Swatches</StoryTitle>
      <ColorSwatchPicker {...args} />
    </div>
  ),
};
