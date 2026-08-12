import { memo, use, useMemo } from "react";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";

import { Button, ButtonIcon } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Tooltip } from "@/ui/Tooltip";
import { capitalize } from "@/util/string";

import {
  checkDiffCanBeReviewed,
  useBuildDiffState,
  type Diff,
} from "../../BuildDiffState";
import { useBuildReviewState } from "../../BuildReviewState";
import { EvaluationStatus } from "../../EvaluationStatus";
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
  const { siblingDiffs, isSubsetBuild } = useBuildDiffState();
  const reviewState = useBuildReviewState();
  const indicators = useMemo(
    () =>
      getVariantIndicators(siblingDiffs, reviewState?.diffStatuses, {
        isSubsetBuild,
      }),
    [siblingDiffs, reviewState?.diffStatuses, isSubsetBuild],
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

/**
 * The filter keys where the snapshot under review still has a change waiting for
 * a verdict — its own variant included.
 *
 * One dot, one meaning: still to review. Grading it by status turned a glance
 * into a legend to decode, and it goes out as soon as the variant is approved or
 * rejected rather than staying lit for the rest of the review.
 */
function getVariantIndicators(
  siblingDiffs: Diff[],
  diffStatuses: Record<string, EvaluationStatus> | undefined,
  context: { isSubsetBuild: boolean },
): Set<string> {
  const indicators = new Set<string>();
  for (const diff of siblingDiffs) {
    const reviewStatus = diffStatuses?.[diff.id] ?? EvaluationStatus.Pending;
    if (
      !checkDiffCanBeReviewed(diff.status, context) ||
      reviewStatus !== EvaluationStatus.Pending
    ) {
      continue;
    }
    for (const key of getVariantFilterKeys(diff)) {
      indicators.add(key);
    }
  }
  return indicators;
}

function VariantFilterGroup(props: {
  filterGroup: FilterGroup;
  state: FilterState;
  indicators: Set<string>;
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
          needsReview={
            INDICATED_CATEGORIES.includes(filterGroup.category) &&
            indicators.has(filter.key)
          }
        />
      ))}
    </ButtonGroup>
  );
}

function VariantFilterButton(props: {
  filter: Filter;
  state: FilterState;
  /** Every key of the filter's category, its own included. */
  siblingKeys: Set<string>;
  categoryLabel: string;
  needsReview: boolean;
}) {
  const { filter, state, siblingKeys, categoryLabel, needsReview } = props;
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
          {needsReview ? (
            <div className="text-low">Still to review on this snapshot</div>
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
        {needsReview ? (
          <span
            aria-hidden
            className="bg-warning-solid ml-1.5 size-1.5 shrink-0 rounded-full"
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
