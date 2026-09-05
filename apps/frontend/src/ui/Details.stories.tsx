import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { Details, Summary } from "./Details";

const meta = {
  title: "UI/Details",
  component: Details,
} satisfies Meta<typeof Details>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Details>
      <Summary>Advanced Settings</Summary>
      <div className="text-sm">
        <p>Here are additional configuration options.</p>
      </div>
    </Details>
  ),
};

/**
 * The toggle itself, which no snapshot can see. `Summary` used to suppress the
 * click and re-open its parent `<details>` by hand; it now lets the native
 * element do it, and that is worth pinning.
 *
 * Ends open on purpose. Clicking twice would leave the story in its initial
 * state, and the snapshot would then be a duplicate of `Default` — a baseline
 * that costs a review and shows nothing new. This way the same assertions also
 * buy the only picture of the expanded state in the kit.
 */
export const Toggles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const details = canvasElement.querySelector("details");
    await expect(details).not.toBeNull();
    await expect(details).not.toHaveAttribute("open");

    await userEvent.click(canvas.getByText("Advanced Settings"));
    await expect(details).toHaveAttribute("open");

    // `Summary` styles no focus state, so the ring left behind here is the
    // browser's own `:focus-visible` outline. A real mouse click on a
    // `<summary>` does not match that pseudo-class — only the synthetic one
    // does, and only since Vitest 5 — so keeping the focus would bake into the
    // baseline something no user ever sees.
    canvasElement.querySelector("summary")?.blur();
  },
  render: () => (
    <Details>
      <Summary>Advanced Settings</Summary>
      <div className="text-sm">
        <p>Here are additional configuration options.</p>
      </div>
    </Details>
  ),
};
