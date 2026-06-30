import { useMemo, useState } from "react";
import { ComponentIcon, FlaskConicalIcon } from "lucide-react";
import { Button as RACButton } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
import { Tooltip } from "@/ui/Tooltip";

import { SectionHeader } from "./shared";

const _BuildFragment = graphql(`
  fragment ImpactAnalysisSection_Build on Build {
    impactAnalysis {
      affectedComponents {
        name
        count
      }
      affectedTests {
        name
        count
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type ImpactAnalysis = NonNullable<Build["impactAnalysis"]>;

const COLLAPSED_ITEM_COUNT = 5;

/**
 * Strip the leading and trailing words shared by every name so only the
 * distinguishing part remains. Parameterized tests often share boilerplate
 * (e.g. `"<x>" page should match visual baseline`); this surfaces just `"<x>"`.
 * Trims whole words only and bails out if it would empty any name.
 */
function stripCommonWords(names: string[]): string[] {
  if (names.length < 2) {
    return names;
  }
  const rows = names.map((name) => name.split(" "));
  const minLength = Math.min(...rows.map((row) => row.length));
  let prefix = 0;
  while (
    prefix < minLength &&
    rows.every((row) => row[prefix] === rows[0]![prefix])
  ) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < minLength - prefix &&
    rows.every(
      (row) =>
        row[row.length - 1 - suffix] === rows[0]![rows[0]!.length - 1 - suffix],
    )
  ) {
    suffix++;
  }
  if (prefix === 0 && suffix === 0) {
    return names;
  }
  const trimmed = rows.map((row) =>
    row.slice(prefix, row.length - suffix).join(" "),
  );
  return trimmed.some((name) => name === "") ? names : trimmed;
}

/**
 * Flat list of entities impacted by the build's visual changes (Storybook
 * components or end-to-end tests), most affected first. Collapsed to the most
 * affected ones by default since each name takes a full row.
 */
function AffectedItemsSection(props: {
  items: ImpactAnalysis["affectedComponents"];
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  seeAllLabel: (count: number) => string;
  /** Strip the prefix/suffix shared by all names (useful for test titles). */
  trimNames?: boolean;
}) {
  const { items, trimNames } = props;
  const [expanded, setExpanded] = useState(false);
  const collapsible = items.length > COLLAPSED_ITEM_COUNT + 1;
  const visibleItems =
    collapsible && !expanded ? items.slice(0, COLLAPSED_ITEM_COUNT) : items;
  // Computed over all items (not just the visible ones) so the trimmed labels
  // stay stable when the list is expanded.
  const displayNames = useMemo(
    () =>
      trimNames
        ? stripCommonWords(items.map((item) => item.name))
        : items.map((item) => item.name),
    [items, trimNames],
  );
  return (
    <section>
      <SectionHeader>{props.title}</SectionHeader>
      <ul className="flex flex-col">
        {visibleItems.map((item, index) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-3 border-b py-3 first:pt-0 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-primary-ui text-primary-low flex size-8 shrink-0 items-center justify-center rounded-lg">
                <props.icon className="size-4" strokeWidth={1.75} />
              </div>
              <Tooltip content={item.name}>
                <span className="text-default min-w-0 truncate text-sm font-semibold">
                  {displayNames[index]}
                </span>
              </Tooltip>
              {index === 0 && items.length > 1 ? (
                <span className="bg-primary-ui text-primary-low shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
                  Most impacted
                </span>
              ) : null}
            </div>
            <span className="text-low shrink-0 text-sm tabular-nums">
              {item.count} screenshot{item.count > 1 ? "s" : ""}
            </span>
          </li>
        ))}
      </ul>
      {collapsible ? (
        <RACButton
          onPress={() => setExpanded((value) => !value)}
          className="rac-focus text-low data-hovered:text-default mt-3 cursor-default text-left text-sm font-medium transition"
        >
          {expanded ? "Show less" : props.seeAllLabel(items.length)}
        </RACButton>
      ) : null}
    </section>
  );
}

/**
 * Surfaces the entities most impacted by the build's changes: Storybook
 * components when available, otherwise end-to-end tests. Renders nothing when
 * neither is present.
 */
export function ImpactAnalysisSection(props: { build: Build }) {
  const analysis = props.build.impactAnalysis;
  const components = analysis?.affectedComponents ?? [];
  const tests = analysis?.affectedTests ?? [];
  const showComponents = components.length > 0;
  const showTests = !showComponents && tests.length > 0;

  if (!showComponents && !showTests) {
    return null;
  }

  if (showComponents) {
    return (
      <AffectedItemsSection
        items={components}
        icon={ComponentIcon}
        title="Affected components"
        seeAllLabel={(count) => `View all ${count} components`}
      />
    );
  }

  return (
    <AffectedItemsSection
      items={tests}
      icon={FlaskConicalIcon}
      title="Affected tests"
      seeAllLabel={(count) => `View all ${count} tests`}
      trimNames
    />
  );
}
