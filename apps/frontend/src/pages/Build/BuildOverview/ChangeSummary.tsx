import React from "react";
import { clsx } from "clsx";
import {
  CheckCheckIcon,
  ClockIcon,
  GaugeIcon,
  GlobeIcon,
  ImageMinusIcon,
  ImagePlusIcon,
  MonitorSmartphoneIcon,
  SunMoonIcon,
} from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { lowTextColorClassNames, UIColor } from "@/util/colors";

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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * The affected component/test name — the reviewer's recognition anchor, so it
 * gets the one accent-colored treatment of the sentence (counts stay plain).
 */
function EntityName(props: { children: React.ReactNode }) {
  return <span className="text-primary-low font-thin">{props.children}</span>;
}

/** Render entity names as accent anchors, joined with commas and "and". */
function formatNames(names: string[]): React.ReactNode {
  return names.map((name, index) => {
    const separator =
      index === 0 ? null : index === names.length - 1 ? " and " : ", ";
    return (
      <React.Fragment key={name}>
        {separator}
        <EntityName>{name}</EntityName>
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
          A single visual change to {formatNames(names)}, seen across{" "}
          {changedCount} screenshots.
        </>
      );
    }
    return <>A single visual change to {formatNames(names)}.</>;
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

  // Concentrated: one entity holds the bulk of the changes.
  const totalAffected = entities.reduce((sum, entity) => sum + entity.count, 0);
  if (entityCount >= 2 && entities[0]!.count >= totalAffected * 0.6) {
    return (
      <>
        {countPhrase}, mostly in {formatNames([names[0]!])} (+{entityCount - 1}{" "}
        other {entityWord}
        {entityCount - 1 > 1 ? "s" : ""}).
      </>
    );
  }

  // Few entities: name them all.
  if (entityCount > 0 && entityCount <= 3) {
    return (
      <>
        {countPhrase} across {formatNames(names)}.
      </>
    );
  }

  // Spread: many entities, name only the top three.
  if (entityCount > 3) {
    return (
      <>
        {countPhrase} spread across {entityCount} {entityWord}s, led by{" "}
        {formatNames(names.slice(0, 3))}.
      </>
    );
  }

  // Fallback: changes without identifiable components or tests.
  return <>{countPhrase} detected in this build.</>;
}

/**
 * Build-overview summary of the changes to review: a generated sentence backed
 * by a row of contextual signals (effort, severity, already-approved,
 * new/removed screenshots, matrix scope). Replaces the old review-scope card.
 */
export function ChangeSummary(props: { build: Build }) {
  const analysis = props.build.impactAnalysis;
  const { stats } = useBuildDiffState();

  if (!analysis) {
    return (
      <div className="text-balance">
        Visual changes were detected in this build. Please review the
        screenshots and confirm whether these changes are expected.
      </div>
    );
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
      ? analysis.changedColorSchemes[0]!
      : null;
  const narrowBrowser =
    analysis.changedBrowsers.length === 1 && analysis.buildBrowsers.length > 1
      ? analysis.changedBrowsers[0]!
      : null;
  const narrowViewport =
    analysis.changedViewports.length === 1 && analysis.buildViewports.length > 1
      ? analysis.changedViewports[0]!
      : null;

  const severity = analysis.largestChange
    ? getSeverity(analysis.largestChange.score)
    : null;

  return (
    <div className="mt-2 mb-1 flex flex-col gap-3">
      <div className="text-balance">
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
          <Chip icon={GlobeIcon}>Only on {getBrowserLabel(narrowBrowser)}</Chip>
        ) : null}

        {narrowViewport ? (
          <Chip icon={MonitorSmartphoneIcon}>Only at {narrowViewport}</Chip>
        ) : null}
      </div>
    </div>
  );
}
