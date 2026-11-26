import { Fragment } from "react";

import { Menu, MenuHeading, MenuItem, MenuSeparator } from "@/ui/menu-kit";

import { listJourneyTestFiles } from "../../journey-order";
import {
  getJourneyTestFiles,
  getJourneyTestSummary,
  getTestContext,
  JourneyStatusIcon,
  useJourneyStatusContext,
  type JourneyStatusContext,
} from "../../journey-tests";
import { FilterIcon } from "./FilterIcon";
import type { FilterState } from "./FilterState";
import {
  FilterCategory,
  getFilterCategoryDefinition,
  getFilterKey,
  type FilterGroup,
} from "./util";

/**
 * The journeys as the overview lists them: by file, a row per test with its
 * runs together. The filter keeps a journey per run, so the URL stays a list
 * of short ids, and a row takes or leaves all the runs of its test: the
 * Viewport filter is there to keep one.
 */
function getJourneyFilterItems(props: {
  filterGroup: FilterGroup;
  state: FilterState;
  statusContext: JourneyStatusContext;
}) {
  const { filterGroup, state, statusContext } = props;
  const selectedKeys = state.active.intersection(filterGroup.filterKeys);
  const otherKeys = state.active.difference(filterGroup.filterKeys);
  return listJourneyTestFiles(
    getJourneyTestFiles(state.journeys, statusContext),
  ).map(({ key, file, separated }) => (
    <Fragment key={key}>
      {separated ? <MenuSeparator /> : null}
      <MenuHeading>{file.path ?? file.name}</MenuHeading>
      {file.tests.map((test) => {
        const keys = new Set(
          test.journeys.map((journey) =>
            getFilterKey({
              category: FilterCategory.journey,
              value: journey.id,
            }),
          ),
        );
        const context = getTestContext(test, file);
        return (
          <MenuItem
            key={test.key}
            checkbox
            wrap
            checked={!selectedKeys.isDisjointFrom(keys)}
            textValue={[context, test.title].filter(Boolean).join(" › ")}
            keywords={[file.path ?? file.name]}
            subtitle={getJourneyTestSummary(test)}
            onAction={() => state.setActive(otherKeys.union(keys))}
            onCheckedChange={(checked: boolean) => {
              const next = checked
                ? selectedKeys.union(keys)
                : selectedKeys.difference(keys);
              state.setActive(otherKeys.union(next));
            }}
          >
            {context ? <span className="text-low">{context} › </span> : null}
            {test.title}
            <JourneyStatusIcon
              status={test.status}
              className="ml-1.5 inline size-3.5 align-[-0.125em]"
            />
          </MenuItem>
        );
      })}
    </Fragment>
  ));
}

/**
 * The rows for one category, as a plain function rather than a component.
 *
 * A menu reads its children, so it cannot see inside a component — these have
 * to reach it directly, whether it is this category's own menu or the search
 * menu listing every category as a submenu.
 */
export function getFilterCategoryItems(props: {
  filterGroup: FilterGroup;
  state: FilterState;
  statusContext: JourneyStatusContext;
  splitSelected?: boolean;
}) {
  const { filterGroup, state, splitSelected } = props;
  if (filterGroup.category === FilterCategory.journey) {
    return getJourneyFilterItems(props);
  }
  const { getFilterByKey } = state;
  const selectedKeys = state.active.intersection(filterGroup.filterKeys);
  const { showMenuSeparator, checked, visibleFilters } = (() => {
    const filters = Array.from(filterGroup.filterKeys).map((key) =>
      getFilterByKey(key),
    );
    const checked = filters.filter((filter) => selectedKeys.has(filter.key));
    const unchecked = filters.filter((filter) => !selectedKeys.has(filter.key));
    const visibleFilters = splitSelected ? [...checked, ...unchecked] : filters;
    const showMenuSeparator =
      splitSelected && checked.length > 0 && unchecked.length > 0;
    return { checked, visibleFilters, showMenuSeparator };
  })();

  return visibleFilters.map((filter, index) => {
    return (
      <Fragment key={filter.key}>
        {showMenuSeparator && index === checked.length && <MenuSeparator />}
        <MenuItem
          icon={<FilterIcon filter={filter} />}
          suffix={
            <>
              {filter.count} {filter.count === 1 ? "item" : "items"}
            </>
          }
          checkbox
          textValue={filter.label}
          checked={selectedKeys.has(filter.key)}
          onAction={() => {
            // Only within this category: the chips of the others are their own
            // filters, and this row says nothing about them.
            const otherKeys = state.active.difference(filterGroup.filterKeys);
            state.setActive(otherKeys.union(new Set([filter.key])));
          }}
          onCheckedChange={(checked: boolean) => {
            const next = new Set(selectedKeys);
            if (checked) {
              next.add(filter.key);
            } else {
              next.delete(filter.key);
            }
            const otherKeys = state.active.difference(filterGroup.filterKeys);
            state.setActive(otherKeys.union(next));
          }}
        >
          {filter.label}
        </MenuItem>
      </Fragment>
    );
  });
}

/** That category on its own, for the chip that opens just this one. */
export function FilterCategoryMenu(props: {
  filterGroup: FilterGroup;
  state: FilterState;
  className?: string;
  splitSelected?: boolean;
}) {
  const { className, ...rest } = props;
  const categoryDef = getFilterCategoryDefinition(props.filterGroup.category);
  const statusContext = useJourneyStatusContext();
  return (
    <Menu aria-label={`${categoryDef.label} filters`} className={className}>
      {getFilterCategoryItems({ ...rest, statusContext })}
    </Menu>
  );
}
