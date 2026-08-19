import { parseAsStringEnum } from "nuqs";

import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Select, SelectButton } from "@/ui/Select";

const SCREENS_FILTER_VALUES = ["all", "with", "without"] as const;

export type ScreensFilterValue = (typeof SCREENS_FILTER_VALUES)[number];

export const ScreensFilterParser = parseAsStringEnum<ScreensFilterValue>([
  ...SCREENS_FILTER_VALUES,
]).withDefault("all");

const LABELS: Record<ScreensFilterValue, string> = {
  all: "All tests",
  with: "With screenshots",
  without: "Without screenshots",
};

/**
 * What the API is asked for: `null` keeps every test, `true` only the ones that
 * capture, `false` only the ones that do not.
 */
export function getScreensFilterInput(
  value: ScreensFilterValue,
): boolean | null {
  return value === "all" ? null : value === "with";
}

export function ScreensFilter(props: {
  value: ScreensFilterValue;
  onChange: (value: ScreensFilterValue) => void;
}) {
  const { value, onChange } = props;
  return (
    <Select
      aria-label="Screenshots"
      value={value}
      onValueChange={(next) => {
        // Base UI hands back the raw item value; the list only holds the three
        // above, so anything else means the select was cleared.
        const parsed = SCREENS_FILTER_VALUES.find((item) => item === next);
        onChange(parsed ?? "all");
      }}
    >
      <SelectButton className="text-sm">{LABELS[value]}</SelectButton>
      <ListBox>
        {SCREENS_FILTER_VALUES.map((item) => (
          <ListBoxItem key={item} value={item}>
            <ListBoxItemLabel>{LABELS[item]}</ListBoxItemLabel>
          </ListBoxItem>
        ))}
      </ListBox>
    </Select>
  );
}
