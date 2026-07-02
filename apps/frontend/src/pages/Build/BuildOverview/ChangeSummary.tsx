import React from "react";
import { clsx } from "clsx";
import {
  CheckCheckIcon,
  ClockIcon,
  ComponentIcon,
  FlaskConicalIcon,
  GaugeIcon,
  GlobeIcon,
  ImageMinusIcon,
  ImagePlusIcon,
  MonitorSmartphoneIcon,
  ScanEyeIcon,
  SunMoonIcon,
} from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { lowTextColorClassNames, UIColor } from "@/util/colors";
import { capitalize } from "@/util/string";

import { useBuildDiffState } from "../BuildDiffState";
import { getBrowserLabel } from "../metadata/browser/browserLabels";

const _BuildFragment = graphql(`
  fragment ChangeSummary_Build on Build {
    impactAnalysis {
      changedCount
      uniqueChangeCount
      changedBrowsers
      buildBrowsers
      changedColorSchemes
      buildColorSchemes
      changedViewports
      buildViewports
      largestChange {
        name
        score
      }
      previouslyApprovedCount
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

type EntityIcon = React.ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

/**
 * The affected component/test name — the reviewer's recognition anchor. Reads
 * as inline prose (same font) lightly highlighted, with a leading entity icon.
 */
function EntityName(props: { icon: EntityIcon; children: React.ReactNode }) {
  const { icon: Icon } = props;
  return (
    <span className="bg-primary-ui text-primary-low mx-0.5 rounded px-1 py-0.5 wrap-break-word">
      <Icon className="mr-1 inline size-3.5 align-[-0.125em]" strokeWidth={2} />
      {props.children}
    </span>
  );
}

/** Render entity names as tags, joined with commas and "and". */
function formatNames(names: string[], icon: EntityIcon): React.ReactNode {
  return names.map((name, index) => {
    const separator =
      index === 0 ? null : index === names.length - 1 ? " and " : ", ";
    return (
      <React.Fragment key={name}>
        {separator}
        <EntityName icon={icon}>{name}</EntityName>
      </React.Fragment>
    );
  });
}

/** Rough review time, derived from the number of unique visual changes. */
function getTimeEstimate(uniqueChangeCount: number): string {
  if (uniqueChangeCount <= 3) {
    return "< 2 min";
  }
  if (uniqueChangeCount <= 15) {
    return "2–5 min";
  }
  if (uniqueChangeCount <= 40) {
    return "5–15 min";
  }
  if (uniqueChangeCount <= 80) {
    return "15–30 min";
  }
  return "30+ min";
}

/** Severity of the build, derived from its single largest diff score. */
function getSeverity(score: number): { label: string; tone: UIColor } {
  if (score >= 0.3) {
    return { label: "Major change", tone: "danger" };
  }
  if (score >= 0.05) {
    return { label: "Moderate change", tone: "warning" };
  }
  return { label: "Subtle change", tone: "neutral" };
}

/** A small contextual signal (severity, matrix scope, new/removed…). */
function Chip(props: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: UIColor;
  children: React.ReactNode;
}) {
  const tone = props.tone ?? "neutral";
  return (
    <span className="border-thin bg-primary-ui text-default inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium">
      <props.icon
        className={clsx("size-3.5 shrink-0", lowTextColorClassNames[tone])}
        strokeWidth={2}
      />
      {props.children}
    </span>
  );
}

/**
 * One generated sentence describing the build's changes. Scales from a single
 * change to dozens: instead of listing every entity, it characterizes the
 * shape (single / amplified / concentrated / spread) and names the top ones.
 */
function ChangeSentence(props: {
  analysis: ImpactAnalysis;
  added: number;
  removed: number;
}) {
  const { analysis, added, removed } = props;
  const { uniqueChangeCount, changedCount } = analysis;
  const useComponents = analysis.affectedComponents.length > 0;
  const entities = useComponents
    ? analysis.affectedComponents
    : analysis.affectedTests;
  const entityWord = useComponents ? "component" : "test";
  const entityIcon = useComponents ? ComponentIcon : FlaskConicalIcon;
  const names = entities.map((entity) => entity.name);
  const entityCount = names.length;

  // No modified screenshots: the build is purely additions and/or removals.
  if (uniqueChangeCount === 0) {
    if (added > 0 && removed === 0) {
      return (
        <>
          {added} new screenshot{added > 1 ? "s" : ""} added — no changes to
          existing baselines.
        </>
      );
    }
    if (removed > 0 && added === 0) {
      return (
        <>
          {removed} screenshot{removed > 1 ? "s" : ""} removed from the
          baseline.
        </>
      );
    }
    return <>Visual changes were detected in this build.</>;
  }

  const countPhrase =
    uniqueChangeCount === 1
      ? "A single visual change"
      : `${uniqueChangeCount} visual changes`;

  // Single change to a single entity — the common, simplest case.
  if (uniqueChangeCount === 1 && entityCount === 1) {
    if (changedCount >= 4) {
      return (
        <>
          A single visual change to {formatNames(names, entityIcon)}, seen
          across {changedCount} screenshots.
        </>
      );
    }
    return <>A single visual change to {formatNames(names, entityIcon)}.</>;
  }

  // Amplified: few changes echoed across many screenshots and entities —
  // usually a shared style or token update.
  if (
    uniqueChangeCount <= 2 &&
    entityCount >= 3 &&
    changedCount >= uniqueChangeCount * 3
  ) {
    return (
      <>
        {countPhrase} rippling across {entityCount} {entityWord}s (
        {changedCount} screenshots) — likely a shared{" "}
        {useComponents ? "style" : "change"}.
      </>
    );
  }

  // Concentrated: one entity holds the bulk of the changes. Requires more than
  // one unique change — a single change can't read as "mostly in X plus others".
  const totalAffected = entities.reduce((sum, entity) => sum + entity.count, 0);
  const topEntity = entities[0];
  const topName = names[0];
  if (
    uniqueChangeCount > 1 &&
    entityCount >= 2 &&
    topEntity &&
    topName &&
    topEntity.count >= totalAffected * 0.6
  ) {
    return (
      <>
        {countPhrase}, mostly in {formatNames([topName], entityIcon)} (+
        {entityCount - 1} other {entityWord}
        {entityCount - 1 > 1 ? "s" : ""}).
      </>
    );
  }

  // Few entities: name them all.
  if (entityCount > 0 && entityCount <= 3) {
    return (
      <>
        {countPhrase} across {formatNames(names, entityIcon)}.
      </>
    );
  }

  // Spread: many entities, name only the top three.
  if (entityCount > 3) {
    return (
      <>
        {countPhrase} spread across {entityCount} {entityWord}s, led by{" "}
        {formatNames(names.slice(0, 3), entityIcon)}.
      </>
    );
  }

  // Fallback: changes without identifiable components or tests.
  return <>{countPhrase} detected in this build.</>;
}

/** Card shell for the change summary, so both branches share the same chrome. */
function ChangeSummaryPanel(props: { children: React.ReactNode }) {
  return (
    <Panel elevation={0}>
      <PanelHeader className="mb-2">
        <PanelTitle icon={ScanEyeIcon}>Review insights</PanelTitle>
      </PanelHeader>
      <div className="px-4 text-sm leading-6">{props.children}</div>
    </Panel>
  );
}

/**
 * Build-overview summary of the changes to review: a generated sentence backed
 * by a row of contextual signals (effort, severity, already-approved,
 * new/removed screenshots, matrix scope), presented in a card.
 */
export function ChangeSummary(props: { build: Build }) {
  const analysis = props.build.impactAnalysis;
  const { stats } = useBuildDiffState();

  // No analysis to summarize: don't render an insights card at all — the build
  // description already prompts the reviewer.
  if (!analysis) {
    return null;
  }

  const added = stats?.added ?? 0;
  const removed = stats?.removed ?? 0;
  const reviewableCount = stats
    ? stats.changed + stats.added + stats.removed
    : 0;
  // Clamp: the approval count is fingerprint-based and should never read as
  // more than the screenshots actually up for review.
  const previouslyApproved = Math.min(
    analysis.previouslyApprovedCount,
    reviewableCount,
  );

  // Matrix-narrowness: a change confined to a single axis while the build
  // covers several is a signal worth flagging (dark-only, Chromium-only…).
  const narrowColorScheme =
    analysis.changedColorSchemes.length === 1 &&
    analysis.buildColorSchemes.length > 1
      ? analysis.changedColorSchemes[0]
      : null;
  const narrowBrowser =
    analysis.changedBrowsers.length === 1 && analysis.buildBrowsers.length > 1
      ? analysis.changedBrowsers[0]
      : null;
  const narrowViewport =
    analysis.changedViewports.length === 1 && analysis.buildViewports.length > 1
      ? analysis.changedViewports[0]
      : null;

  const severity = analysis.largestChange
    ? getSeverity(analysis.largestChange.score)
    : null;

  return (
    <ChangeSummaryPanel>
      <div className="flex flex-col gap-3">
        <div>
          <ChangeSentence analysis={analysis} added={added} removed={removed} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip icon={ClockIcon}>
            {getTimeEstimate(analysis.uniqueChangeCount)}
          </Chip>

          {severity ? (
            <Chip icon={GaugeIcon} tone={severity.tone}>
              {severity.label}
            </Chip>
          ) : null}

          {previouslyApproved > 0 ? (
            <Chip icon={CheckCheckIcon} tone="success">
              {previouslyApproved} already approved
            </Chip>
          ) : null}

          {removed > 0 ? (
            <Chip icon={ImageMinusIcon} tone="warning">
              {removed} removed
            </Chip>
          ) : null}

          {added > 0 ? <Chip icon={ImagePlusIcon}>{added} new</Chip> : null}

          {narrowColorScheme ? (
            <Chip icon={SunMoonIcon}>
              Only in {capitalize(narrowColorScheme)}
            </Chip>
          ) : null}

          {narrowBrowser ? (
            <Chip icon={GlobeIcon}>
              Only on {getBrowserLabel(narrowBrowser)}
            </Chip>
          ) : null}

          {narrowViewport ? (
            <Chip icon={MonitorSmartphoneIcon}>Only at {narrowViewport}</Chip>
          ) : null}
        </div>
      </div>
    </ChangeSummaryPanel>
  );
}
