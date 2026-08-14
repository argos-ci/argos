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
 */
export const Toggles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const details = canvasElement.querySelector("details");
    await expect(details).not.toBeNull();
    await expect(details).not.toHaveAttribute("open");

    await userEvent.click(canvas.getByText("Advanced Settings"));
    await expect(details).toHaveAttribute("open");

    await userEvent.click(canvas.getByText("Advanced Settings"));
    await expect(details).not.toHaveAttribute("open");
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
