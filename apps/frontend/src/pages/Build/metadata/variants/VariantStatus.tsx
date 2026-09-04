import {
  getDiffGroupDefinition,
  type DiffGroupColor,
} from "@/containers/Build/BuildDiffGroup";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import { ButtonIcon, type ButtonIconElementProps } from "@/ui/Button";

import type { Diff } from "../../BuildDiffState";

/**
 * The statuses a switcher segment is worth marking with: the three a reviewer
 * is hunting for, and so the three that make jumping to a sibling worthwhile.
 * The rest — unchanged, ignored, a framework failure — would put a marker on
 * nearly every segment, which marks none of them.
 */
export type VariantStatus =
  | ScreenshotDiffStatus.Added
  | ScreenshotDiffStatus.Changed
  | ScreenshotDiffStatus.Removed;

/** What landing on `diff` would show, or `null` if that is nothing to review. */
export function getVariantStatus(diff: Diff): VariantStatus | null {
  switch (diff.status) {
    case ScreenshotDiffStatus.Added:
    case ScreenshotDiffStatus.Changed:
    case ScreenshotDiffStatus.Removed:
      return diff.status;
    default:
      return null;
  }
}

/**
 * A segment's description with what it holds appended — "Changed", "Added",
 * "Removed", spelled as the sidebar's group headers spell them.
 *
 * It goes into the accessible name rather than only the tooltip: Base UI leaves
 * a tooltip out of the accessibility tree, so the icon would otherwise say
 * nothing at all to a screen reader.
 */
export function withVariantStatus(
  label: string,
  status: VariantStatus | null,
): string {
  if (!status) {
    return label;
  }
  return `${label}, ${getDiffGroupDefinition(status).label}`;
}

/**
 * Each group's own color, so the marker matches the count it stands for in the
 * build's stats rather than picking a shade of its own. All three are orange
 * today; the map is over the colors a group can have because the definitions,
 * not this file, decide that.
 */
const colorClassNames: Record<DiffGroupColor, string> = {
  danger: "text-danger-low",
  warning: "text-warning-low",
  success: "text-success-low",
  neutral: "text-low",
};

function getColorClassName(status: VariantStatus): string {
  return colorClassNames[getDiffGroupDefinition(status).color];
}

function StatusIcon(props: ButtonIconElementProps & { status: VariantStatus }) {
  const { status, ...rest } = props;
  const { icon: Icon } = getDiffGroupDefinition(status);
  return <Icon aria-hidden {...rest} />;
}

/**
 * The marker for a segment carrying a label — it trails the text at `1em` of
 * it. Colored through `ButtonIcon`, which is also what marks it
 * `data-colored-icon`: without that the button dims every icon it holds until
 * hovered, and a marker that has to be hovered to be seen is no marker.
 */
export function VariantStatusButtonIcon(props: { status: VariantStatus }) {
  const { status } = props;
  return (
    <ButtonIcon position="right" colorClassName={getColorClassName(status)}>
      <StatusIcon status={status} />
    </ButtonIcon>
  );
}

/**
 * The marker for an `iconOnly` segment, whose own icon is its label. A bare
 * second child, deliberately unsized and unspaced: there the button sizes both
 * icons alike, and the segment sets the gap.
 */
export function VariantStatusIcon(props: { status: VariantStatus }) {
  const { status } = props;
  return (
    <StatusIcon
      status={status}
      data-colored-icon
      className={getColorClassName(status)}
    />
  );
}
