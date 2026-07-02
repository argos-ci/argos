import { useState } from "react";
import { ComponentIcon, FlaskConicalIcon, RadarIcon } from "lucide-react";
import { Button as RACButton } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Truncable } from "@/ui/Truncable";

import { LocationChip } from "../sidebar/metadata/LocationChip";

const _BuildFragment = graphql(`
  fragment ImpactAnalysisSection_Build on Build {
    branch
    impactAnalysis {
      affectedComponents {
        name
        count
        location {
          file
          line
          column
        }
      }
      affectedTests {
        name
        count
        location {
          file
          line
          column
        }
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type ImpactAnalysis = NonNullable<Build["impactAnalysis"]>;

const COLLAPSED_ITEM_COUNT = 5;

/**
 * Flat list of entities impacted by the build's visual changes (Storybook
 * components or end-to-end tests), most affected first, in a card. Each entity
 * is a chip that links to its source when a location is known (tests). Collapsed
 * to the most affected ones by default since each name takes a full row.
 */
function AffectedItemsSection(props: {
  items: ImpactAnalysis["affectedComponents"];
  /** Icon for the card title, conveying the "impact" of the changes. */
  titleIcon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Icon shown on each entity chip (a test, a component…). */
  itemIcon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  seeAllLabel: (count: number) => string;
  branch: string | null;
  repoUrl: string | null;
}) {
  const { items, branch, repoUrl } = props;
  const [expanded, setExpanded] = useState(false);
  const collapsible = items.length > COLLAPSED_ITEM_COUNT + 1;
  const visibleItems =
    collapsible && !expanded ? items.slice(0, COLLAPSED_ITEM_COUNT) : items;
  return (
    <Panel elevation={0}>
      <PanelHeader className="mb-2">
        <PanelTitle icon={props.titleIcon}>{props.title}</PanelTitle>
      </PanelHeader>
      <ul className="flex flex-col px-2">
        {visibleItems.map((item) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-2 py-0.5"
          >
            <LocationChip
              color="blank"
              scale="sm"
              icon={props.itemIcon}
              location={item.location}
              branch={branch}
              repoUrl={repoUrl}
            >
              <Truncable className="font-semibold">{item.name}</Truncable>
            </LocationChip>
            <span className="text-low shrink-0 px-2.5 text-sm tabular-nums">
              {item.count}
            </span>
          </li>
        ))}
      </ul>
      {collapsible && !expanded ? (
        <RACButton
          onPress={() => setExpanded((value) => !value)}
          className="rac-focus text-low data-hovered:bg-ui data-hovered:text-default mx-2 mt-3 cursor-default rounded-full px-2 py-0.5 text-sm transition"
        >
          {props.seeAllLabel(items.length)}
        </RACButton>
      ) : null}
    </Panel>
  );
}

/**
 * Surfaces the entities most impacted by the build's changes: Storybook
 * components when available, otherwise end-to-end tests. Renders nothing when
 * neither is present.
 */
export function ImpactAnalysisSection(props: {
  build: Build;
  repoUrl: string | null;
}) {
  const { build, repoUrl } = props;
  const analysis = build.impactAnalysis;
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
        titleIcon={RadarIcon}
        itemIcon={ComponentIcon}
        title="Affected components"
        seeAllLabel={(count) => `View all ${count} components`}
        branch={build.branch}
        repoUrl={repoUrl}
      />
    );
  }

  return (
    <AffectedItemsSection
      items={tests}
      titleIcon={RadarIcon}
      itemIcon={FlaskConicalIcon}
      title="Affected tests"
      seeAllLabel={(count) => `View all ${count} tests`}
      branch={build.branch}
      repoUrl={repoUrl}
    />
  );
}
