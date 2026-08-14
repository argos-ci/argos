import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
} from "./ColorPicker";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/ColorPicker",
  component: ColorSwatchPicker,
} satisfies Meta<typeof ColorSwatchPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

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

/**
 * react-aria's colour swatch picker has no Base UI counterpart — it becomes a
 * plain toggle group — so the selected ring is worth a baseline of its own.
 */
export const Default: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col">
      <StoryTitle>Swatches</StoryTitle>
      <ColorSwatchPicker value="#FFAA1D" aria-label="Diff color">
        {COLORS.map((color) => (
          <ColorSwatchPickerItem key={color} color={color}>
            <ColorSwatch />
          </ColorSwatchPickerItem>
        ))}
      </ColorSwatchPicker>
    </div>
  ),
};
