import { parseAsStringLiteral, useQueryState } from "nuqs";

import { ButtonGroup } from "@/ui/ButtonGroup";
import { IconButton } from "@/ui/IconButton";
import { Tooltip } from "@/ui/Tooltip";

import type { TestSearchParams } from "./TestParams";

const CHANGES_FILTERS = ["all", "ignored"] as const;

/**
 * Which changes the list shows. `all` includes ignored changes: the filter is
 * there to audit what a test has ignored, not to reveal changes hidden from the
 * default view.
 */
export type ChangesFilter = (typeof CHANGES_FILTERS)[number];

const CHANGES_FILTER_PARAM = "changes" satisfies keyof TestSearchParams;

export interface ChangesFilterState {
  value: ChangesFilter;
  setValue: (value: ChangesFilter) => void;
}

export function useChangesFilterState(): ChangesFilterState {
  const [value, setValue] = useQueryState(
    CHANGES_FILTER_PARAM,
    parseAsStringLiteral(CHANGES_FILTERS).withDefault("all"),
  );
  return { value, setValue };
}

/**
 * Value of the `ignored` argument of `Test.changes` for a filter. `null` returns
 * ignored and non-ignored changes alike.
 */
export function getChangesFilterIgnored(filter: ChangesFilter): boolean | null {
  return filter === "ignored" ? true : null;
}

export function ChangesFilterToggle(props: { state: ChangesFilterState }) {
  const { state } = props;
  return (
    <ButtonGroup>
      <IconButton
        variant="contained"
        aria-pressed={state.value === "all"}
        onPress={() => state.setValue("all")}
      >
        All
      </IconButton>
      <Tooltip content="Only the changes this test no longer asks you to review.">
        <IconButton
          variant="contained"
          aria-pressed={state.value === "ignored"}
          onPress={() => state.setValue("ignored")}
        >
          Ignored
        </IconButton>
      </Tooltip>
    </ButtonGroup>
  );
}
