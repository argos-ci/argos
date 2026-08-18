import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";

import { DateRangePicker } from "./DateRangePicker";
import { openOverlayParameters, OverlayStage } from "./storyOverlay";
import { StoryTitle } from "./StoryTitle";

// A fixed range, so the visible month and the selected cells are the same in
// every run. `new Date()` here would make the snapshot change every day.
const VALUE = {
  from: new Date("2024-03-04T00:00:00"),
  to: new Date("2024-03-18T00:00:00"),
};

const meta = {
  title: "UI/DateRangePicker",
  component: DateRangePicker,
  args: {
    "aria-label": "Custom period",
    value: VALUE,
    onChange: () => {},
  },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const MIN_DATE = new Date("2024-03-01T00:00:00");
const MAX_DATE = new Date("2024-03-29T00:00:00");

/**
 * The field on its own: the chosen range, and the calendar button.
 *
 * react-aria's two segmented `DateInput`s are gone — `react-day-picker` has no
 * counterpart, and this is the one place the Base UI migration could not land
 * like-for-like. The range is read here and edited in the calendar, which is
 * how the control was already used.
 */
export const Default: Story = {
  render: (args) => (
    <div className="flex max-w-xs flex-col">
      <StoryTitle>Field</StoryTitle>
      <DateRangePicker {...args} />
    </div>
  ),
};

/** The range calendar: selected range, its two ends, and out-of-bounds days. */
export const Open: Story = {
  parameters: openOverlayParameters,
  args: { minDate: MIN_DATE, maxDate: MAX_DATE, defaultOpen: true },
  render: (args) => (
    <OverlayStage>
      <div className="w-72">
        <DateRangePicker {...args} />
      </div>
    </OverlayStage>
  ),
};

/**
 * The validation message. `validate` runs against whatever is selected and the
 * component publishes the result on the kit's field-error context, so nothing
 * at the call site has to thread the message down.
 */
export const Invalid: Story = {
  args: {
    validate: () => "The period must be shorter than 30 days.",
  },
  render: (args) => (
    <div className="flex max-w-xs flex-col">
      <StoryTitle>Invalid</StoryTitle>
      <DateRangePicker {...args} />
    </div>
  ),
};

/**
 * Picking a range takes two clicks, and the first one must not commit: a
 * half-made range would otherwise reach the call site as `from` with no `to`.
 * No screenshot can see the intermediate state, so it is asserted.
 */
export const PickingARangeCommitsOnce: Story = {
  parameters: openOverlayParameters,
  args: { minDate: MIN_DATE, maxDate: MAX_DATE, onChange: fn() },
  render: (args) => (
    <OverlayStage>
      <div className="w-72">
        <DateRangePicker {...args} />
      </div>
    </OverlayStage>
  ),
  play: async ({ args }) => {
    await userEvent.click(
      await screen.findByRole("button", { name: "Custom period" }),
    );
    await expect(await screen.findByRole("grid")).toBeVisible();
    // The first click starts a new range: nothing is committed, and the
    // calendar stays up waiting for the other end.
    await userEvent.click(screen.getByRole("button", { name: /March 6/ }));
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(screen.getByRole("grid")).toBeVisible();
    // The second click completes it, commits once, and closes.
    await userEvent.click(screen.getByRole("button", { name: /March 12/ }));
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
  },
};
