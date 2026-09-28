import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";

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

/**
 * Every tooltip rides one shared root, so all their triggers share Base UI's
 * hover timers, and Base UI 1.7.0 clears them whenever any trigger unmounts
 * (see `patches/@base-ui__react@1.7.0.patch`). A trigger going away while
 * another tooltip was closing left that tooltip open with the pointer gone.
 * The build page removes one as it finishes loading: the "Loading
 * snapshots..." indicator.
 *
 * Both triggers mount with the story, in the same commit as the shared root.
 * That matters: such a trigger first renders against the handle's placeholder
 * store, which the patch has to see past.
 */
export const ClosesWhenAnotherTriggerUnmounts: Story = {
  parameters: {
    // The play ends with the tooltip gone, so the picture would only show a
    // button.
    argos: { modes: { default: { disabled: true } } },
  },
  render: function Render() {
    const [showOther, setShowOther] = useState(true);
    return (
      <div className="flex gap-8 p-16">
        <Tooltip content="Hovered tooltip">
          <Button
            variant="secondary"
            // Well inside the 100ms close delay.
            onMouseLeave={() => setTimeout(() => setShowOther(false), 20)}
          >
            Hover me
          </Button>
        </Tooltip>
        {showOther ? (
          <Tooltip content="Other tooltip">
            <Button variant="secondary">Other</Button>
          </Tooltip>
        ) : null}
      </div>
    );
  },
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Hover me" });
    await userEvent.hover(trigger);
    await expect(
      await screen.findByText("Hovered tooltip", {}, { timeout: 3_000 }),
    ).toBeVisible();

    await userEvent.unhover(trigger);
    await waitFor(() => {
      expect(
        canvas.queryByRole("button", { name: "Other" }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText("Hovered tooltip")).not.toBeInTheDocument();
    });
  },
};
