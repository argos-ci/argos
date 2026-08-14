import { parseDate } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";

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
    granularity: "day",
    value: VALUE,
    onChange: () => {},
  },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// `minValue`/`maxValue` pass straight through to react-aria, which speaks
// `@internationalized/date` rather than `Date` — unlike `value`, which the
// wrapper converts.
const MIN_VALUE = parseDate("2024-03-01");
const MAX_VALUE = parseDate("2024-03-29");

/**
 * The field on its own: two segmented date inputs and the calendar button.
 *
 * This component has no baseline today and it is the one place the Base UI
 * migration cannot land like-for-like — Base UI has no calendar, and the
 * segmented inputs have no replacement in `react-day-picker` either.
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
  args: { minValue: MIN_VALUE, maxValue: MAX_VALUE, isOpen: true },
  render: (args) => (
    <OverlayStage>
      <div className="w-72">
        <DateRangePicker {...args} />
      </div>
    </OverlayStage>
  ),
};
