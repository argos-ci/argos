import type { Meta, StoryObj } from "@storybook/react-vite";

import { ChipContext } from "@/ui/Chip";
import {
  openOverlayParameters,
  OverlaySlot,
  OverlayStage,
} from "@/ui/storyOverlay";

import { CHIP_DEFAULTS } from "../MetadataSection";
import { BrowserVersionRow } from "./BrowserVersionRow";

const meta = {
  title: "Pages/Build/BrowserVersionRow",
  component: BrowserVersionRow,
  decorators: [
    (Story) => (
      <ChipContext value={CHIP_DEFAULTS}>
        <Story />
      </ChipContext>
    ),
  ],
  args: {
    change: {
      name: "chromium",
      baseVersion: "140.0.7339.16",
      compareVersion: "141.0.7390.37",
    },
  },
} satisfies Meta<typeof BrowserVersionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  render: (args) => (
    <div className="w-72 p-4">
      <BrowserVersionRow {...args} />
    </div>
  ),
};

export const TooltipOpen: Story = {
  parameters: openOverlayParameters,
  args: { tooltipOpen: true },
  render: (args) => (
    <OverlayStage>
      <OverlaySlot>
        <BrowserVersionRow {...args} />
      </OverlaySlot>
    </OverlayStage>
  ),
};
