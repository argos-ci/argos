import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import {
  openOverlayParameters,
  OverlaySlot,
  OverlayStage,
} from "./storyOverlay";
import { StoryTitle } from "./StoryTitle";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  args: {
    content: "Tooltip",
    children: (<Button variant="secondary">Hover me</Button>) as any,
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col p-16">
      <StoryTitle>Variants</StoryTitle>
      <div className="flex gap-8">
        <Tooltip content="Default tooltip">
          <Button variant="secondary">Default</Button>
        </Tooltip>
        <Tooltip content="Info tooltip with more detail" variant="info">
          <Button variant="secondary">Info</Button>
        </Tooltip>
      </div>

      <StoryTitle>Placements</StoryTitle>
      <div className="flex gap-8">
        <Tooltip content="Top" side="top">
          <Button variant="secondary">Top</Button>
        </Tooltip>
        <Tooltip content="Bottom" side="bottom">
          <Button variant="secondary">Bottom</Button>
        </Tooltip>
        <Tooltip content="Left" side="left">
          <Button variant="secondary">Left</Button>
        </Tooltip>
        <Tooltip content="Right" side="right">
          <Button variant="secondary">Right</Button>
        </Tooltip>
      </div>
    </div>
  ),
};

/**
 * Opened through `isOpen` rather than by hovering: Argos moves the pointer to
 * (0, 0) before every capture, so a hover-opened tooltip is dismissed before
 * the shutter.
 */
export const Open: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage className="items-center">
      <OverlaySlot className="flex justify-center">
        <Tooltip content="Default tooltip" side="bottom" open>
          <Button variant="secondary">Default</Button>
        </Tooltip>
      </OverlaySlot>
      <OverlaySlot className="flex justify-center">
        <Tooltip
          content={
            <>
              An <strong>info</strong> tooltip, long enough to reach the maximum
              measure and wrap onto a second line.
            </>
          }
          variant="info"
          side="bottom"
          open
        >
          <Button variant="secondary">Info</Button>
        </Tooltip>
      </OverlaySlot>
      {(["top", "bottom", "left", "right"] as const).map((placement) => (
        <OverlaySlot key={placement} className="flex justify-center">
          <Tooltip content={placement} side={placement} open>
            <Button variant="secondary">{placement}</Button>
          </Tooltip>
        </OverlaySlot>
      ))}
    </OverlayStage>
  ),
};
