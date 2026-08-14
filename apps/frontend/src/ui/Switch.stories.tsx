import { useId } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { StoryTitle } from "./StoryTitle";
import { Switch } from "./Switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Sizes</StoryTitle>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch size="sm" />
          Small
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch size="md" />
          Medium
        </label>
      </div>

      <StoryTitle>States</StoryTitle>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch />
          Off
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch defaultChecked />
          On
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch disabled />
          Disabled
        </label>
      </div>
    </div>
  ),
};

/**
 * Clicking the label must toggle the switch, both ways it is labelled in this
 * codebase.
 *
 * This is the one thing the move to Base UI could have broken silently.
 * react-aria rendered a `<label>` wrapping a hidden `<input>`, so `htmlFor`
 * pointed at an input and clicking the text toggled it. Base UI's `Switch.Root`
 * *is* a `<button>` — still a labelable element, so the association survives
 * and the accessible name is right, but a label click only *focuses* a button,
 * it does not activate it. `FormSwitch` labels its switch by `htmlFor`, so a
 * regression here would be invisible to every screenshot.
 */
function LabelledSwitches() {
  const id = useId();
  return (
    <div className="flex flex-col gap-4">
      {/* Wrapping label, as the stories and most call sites do. */}
      <label className="flex w-fit items-center gap-2 text-sm">
        <Switch data-testid="implicit" />
        Wrapped by its label
      </label>

      {/* Separate label pointing at the control, as `FormSwitch` does. */}
      <div className="flex items-center gap-2">
        <Switch id={id} data-testid="explicit" />
        <label htmlFor={id} className="text-sm">
          Labelled by htmlFor
        </label>
      </div>
    </div>
  );
}

export const LabelClickToggles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const implicit = canvasElement.querySelector("[data-testid='implicit']");
    const explicit = canvasElement.querySelector("[data-testid='explicit']");

    await expect(implicit).toHaveAttribute("aria-checked", "false");
    await userEvent.click(canvas.getByText("Wrapped by its label"));
    await expect(implicit).toHaveAttribute("aria-checked", "true");

    await expect(explicit).toHaveAttribute("aria-checked", "false");
    await userEvent.click(canvas.getByText("Labelled by htmlFor"));
    await expect(explicit).toHaveAttribute("aria-checked", "true");
  },
  render: () => <LabelledSwitches />,
};
