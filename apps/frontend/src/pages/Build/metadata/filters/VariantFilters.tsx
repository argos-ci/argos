import { memo, use, useMemo } from "react";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";

import { ScreenshotDiffStatus } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Tooltip } from "@/ui/Tooltip";
import { capitalize } from "@/util/string";

import { useBuildDiffState, type Diff } from "../../BuildDiffState";
import { getBrowserLabel } from "../browser/browserLabels";
import { MetadataCategory } from "../metadataCategories";
import { parseViewport } from "../viewports/util";
import { FilterIcon } from "./FilterIcon";
import { FilterStateContext, type FilterState } from "./FilterState";
import {
  getFilterCategoryDefinition,
  getVariantFilterKeys,
  type Filter,
  type FilterGroup,
} from "./util";

/** What the bar covers, in the order it shows it. */
const VARIANT_CATEGORIES = [
  MetadataCategory.browser,
  MetadataCategory.viewport,
  MetadataCategory.colorScheme,
] as const;

/**
 * Categories whose values are variants *of the same snapshot*, and so can carry
 * a dot saying "this one moved too".
 *
 * The color scheme is not one of them: it is part of the snapshot name, so Argos
 * holds the light and the dark page as two separate snapshots rather than two
 * variants of one. A dot there would claim something about a sibling that does
 * not exist — it filters, it does not report.
 */
const INDICATED_CATEGORIES: readonly MetadataCategory[] = [
  MetadataCategory.browser,
  MetadataCategory.viewport,
];

/**
 * The browsers and the viewports a build ran on, kept on screen next to the
 * snapshot instead of behind the filter menu.
 *
 * It answers the two questions a reviewer has about a change they are looking
 * at — which variants of this snapshot moved, and can I go through one variant
 * at a time — with the same set of buttons: a dot marks the variants where this
 * snapshot changed, and pressing one narrows the whole review to it.
 *
 * Nothing to show when the build ran on a single browser and a single viewport:
 * `filterGroups` already drops a category that cannot discriminate anything.
 */
export const VariantFilters = memo(function VariantFilters() {
  const state = use(FilterStateContext);
  invariant(state, "VariantFilters must be used in a filter context");
  const { siblingDiffs } = useBuildDiffState();
  const indicators = useMemo(
    () => getVariantIndicators(siblingDiffs),
    [siblingDiffs],
  );
  const groups = VARIANT_CATEGORIES.map((category) =>
    state.filterGroups.find((group) => group.category === category),
  ).filter(checkIsNonNullable);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {groups.map((group) => (
        <VariantFilterGroup
          key={group.category}
          filterGroup={group}
          state={state}
          indicators={indicators}
        />
      ))}
    </div>
  );
});

/** The color a variant's dot takes, or `null` when that variant did not move. */
type VariantIndicator = "danger" | "warning";

/**
 * The dot to show on each variant of the snapshot under review, keyed by filter
 * key. Colored like the group the variant's diff sits in, so the dot and the
 * list say the same thing: red for a failure, amber for a change.
 */
function getVariantIndicators(
  siblingDiffs: Diff[],
): Map<string, VariantIndicator> {
  const indicators = new Map<string, VariantIndicator>();
  for (const diff of siblingDiffs) {
    const indicator = getDiffIndicator(diff.status);
    if (!indicator) {
      continue;
    }
    for (const key of getVariantFilterKeys(diff)) {
      // A browser covering several viewports takes the loudest of them.
      if (indicator === "danger" || !indicators.has(key)) {
        indicators.set(key, indicator);
      }
    }
  }
  return indicators;
}

function getDiffIndicator(
  status: ScreenshotDiffStatus,
): VariantIndicator | null {
  switch (status) {
    case ScreenshotDiffStatus.Failure:
      return "danger";
    case ScreenshotDiffStatus.Changed:
    case ScreenshotDiffStatus.Added:
    case ScreenshotDiffStatus.Removed:
      return "warning";
    default:
      return null;
  }
}

function VariantFilterGroup(props: {
  filterGroup: FilterGroup;
  state: FilterState;
  indicators: Map<string, VariantIndicator>;
}) {
  const { filterGroup, state, indicators } = props;
  const categoryDef = getFilterCategoryDefinition(filterGroup.category);
  // From `state.filters` rather than the group's keys: they come sorted there,
  // viewports by width rather than alphabetically.
  const filters = state.filters.filter((filter) =>
    filterGroup.filterKeys.has(filter.key),
  );
  return (
    <ButtonGroup role="group" aria-label={categoryDef.label}>
      {filters.map((filter) => (
        <VariantFilterButton
          key={filter.key}
          filter={filter}
          state={state}
          siblingKeys={filterGroup.filterKeys}
          categoryLabel={categoryDef.label}
          indicator={
            INDICATED_CATEGORIES.includes(filterGroup.category)
              ? (indicators.get(filter.key) ?? null)
              : null
          }
        />
      ))}
    </ButtonGroup>
  );
}

const INDICATOR_DESCRIPTIONS: Record<VariantIndicator, string> = {
  danger: "Failed on this snapshot",
  warning: "Changed on this snapshot",
};

function VariantFilterButton(props: {
  filter: Filter;
  state: FilterState;
  /** Every key of the filter's category, its own included. */
  siblingKeys: Set<string>;
  categoryLabel: string;
  indicator: VariantIndicator | null;
}) {
  const { filter, state, siblingKeys, categoryLabel, indicator } = props;
  const { active, setActive } = state;
  const isPressed = active.has(filter.key);
  return (
    <Tooltip
      content={
        <>
          <div>
            {isPressed
              ? `Review every ${categoryLabel.toLowerCase()} again`
              : `Review ${getVariantTooltipLabel(filter)} only`}
          </div>
          {indicator ? (
            <div className="text-low">{INDICATOR_DESCRIPTIONS[indicator]}</div>
          ) : null}
        </>
      }
    >
      <Button
        variant="secondary"
        size="small"
        aria-pressed={isPressed}
        onPress={() => setActive(selectOnly(active, filter.key, siblingKeys))}
      >
        <ButtonIcon>
          <FilterIcon filter={filter} />
        </ButtonIcon>
        {getVariantLabel(filter)}
        {indicator ? (
          <span
            className={clsx(
              "ml-1.5 size-1.5 shrink-0 rounded-full",
              indicator === "danger" ? "bg-danger-solid" : "bg-warning-solid",
            )}
          />
        ) : null}
      </Button>
    </Tooltip>
  );
}

/**
 * Selects a variant, dropping whatever was selected in its category: the bar
 * moves the review from one variant to the next — press Chromium while reviewing
 * Firefox and you are reviewing Chromium, not both. Pressing the selected one
 * again lets go of the category and brings every variant back.
 *
 * The filter model itself stays an OR within a category, so the filter menu can
 * still ask for two browsers at once; this bar just does not offer that.
 */
function selectOnly(
  active: Set<string>,
  key: string,
  siblingKeys: Set<string>,
): Set<string> {
  const next = active.difference(siblingKeys);
  if (!active.has(key)) {
    next.add(key);
  }
  return next;
}

/**
 * What the button reads: a browser by name, a viewport by width — the only part
 * of a viewport that a row of them differs by, and the way both Playwright and
 * the snapshot names name them.
 */
function getVariantLabel(filter: Filter): string {
  switch (filter.category) {
    case MetadataCategory.browser:
      return getBrowserLabel(filter.value);
    case MetadataCategory.viewport:
      return `${parseViewport(filter.value).width}px`;
    case MetadataCategory.colorScheme:
      return capitalize(filter.value);
    default:
      return filter.label;
  }
}

/** The same, with the part the button leaves out. */
function getVariantTooltipLabel(filter: Filter): string {
  switch (filter.category) {
    case MetadataCategory.viewport: {
      const { width, height } = parseViewport(filter.value);
      return `${width}×${height}px`;
    }
    default:
      return getVariantLabel(filter);
  }
}
