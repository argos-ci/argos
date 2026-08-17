import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import { DialogTrigger } from "./Dialog";
import { Popover } from "./Popover";
import {
  openOverlayParameters,
  OverlaySlot,
  OverlayStage,
} from "./storyOverlay";

const meta = {
  title: "UI/Popover",
  component: Popover,
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-16">
      <DialogTrigger>
        <Button variant="secondary">Open Popover</Button>
        <Popover>
          <div className="p-3 text-sm">Popover content here</div>
        </Popover>
      </DialogTrigger>
    </div>
  ),
};

/**
 * The popover surface at each placement. Base UI resolves the transform
 * origin into a `--transform-origin` custom property per side and alignment —
 * so every placement needs a baseline of its own.
 */
export const Open: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage className="items-center">
      {(
        [
          { label: "bottom start", side: "bottom", align: "start" },
          { label: "bottom end", side: "bottom", align: "end" },
          { label: "top", side: "top", align: "center" },
          { label: "left", side: "left", align: "center" },
          { label: "right", side: "right", align: "center" },
        ] as const
      ).map(({ label, side, align }) => (
        <OverlaySlot key={label} className="flex justify-center">
          <DialogTrigger defaultOpen>
            <Button variant="secondary">{label}</Button>
            <Popover side={side} align={align}>
              <div className="p-3 text-sm">Popover content here</div>
            </Popover>
          </DialogTrigger>
        </OverlaySlot>
      ))}
    </OverlayStage>
  ),
};
