import { getDiffGroupDefinition } from "@/containers/Build/BuildDiffGroup";
import { ScreenshotDiffStatus } from "@/gql/graphql";
import type { ButtonIconElementProps } from "@/ui/Button";

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
 * Deliberately unsized: the button sizes it, so an `iconOnly` segment carries
 * it at the same 16px as its own icon while a text segment gets `1em` of its
 * label through `ButtonIcon`.
 */
export function VariantStatusIcon(
  props: ButtonIconElementProps & { status: VariantStatus },
) {
  const { status, ...rest } = props;
  const { icon: Icon } = getDiffGroupDefinition(status);
  return <Icon aria-hidden {...rest} />;
}
