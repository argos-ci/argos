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
 * The popover surface at each placement. `getPopoverOriginClassName` derives
 * the transform origin from the requested placement, and that whole mechanism
 * is what Base UI replaces with a `--transform-origin` custom property — so
 * every placement needs a baseline of its own.
 */
export const Open: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage className="items-center">
      {(["bottom start", "bottom end", "top", "left", "right"] as const).map(
        (placement) => (
          <OverlaySlot key={placement} className="flex justify-center">
            <DialogTrigger defaultOpen>
              <Button variant="secondary">{placement}</Button>
              <Popover placement={placement}>
                <div className="p-3 text-sm">Popover content here</div>
              </Popover>
            </DialogTrigger>
          </OverlaySlot>
        ),
      )}
    </OverlayStage>
  ),
};
