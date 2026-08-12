import { memo, useMemo } from "react";
import { LayersIcon } from "lucide-react";
import { MenuTrigger } from "react-aria-components";

import { Button } from "@/ui/Button";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuItemSuffix,
  MenuTitle,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";

import { checkDiffCanBeReviewed, useBuildDiffState } from "../BuildDiffState";
import { useBuildReviewState } from "../BuildReviewState";
import { EvaluationStatus } from "../EvaluationStatus";
import { getVariantFamily, getVariantLabel } from "./variants";

/**
 * The other captures of the snapshot under review — its other browsers,
 * viewports and color scheme — as a menu on the snapshot's own action bar.
 *
 * Deliberately not the filter bar over it. Narrowing the review and taking a
 * look at one variant are different intents: the first says what the whole list
 * is about and holds for the next three hundred snapshots, the second is a glance
 * that has to leave the review exactly as it found it. Two controls that look
 * alike and only one of which changes the list is how a reviewer learns to
 * distrust both.
 *
 * So this one lives with what acts on the snapshot, opens on demand, and names
 * each variant in full — there is room here for the browser version and both
 * viewport dimensions, which the bar has to abbreviate.
 */
export const VariantMenu = memo(function VariantMenu() {
  const { activeDiff, allDiffs, isSubsetBuild, setActiveDiff } =
    useBuildDiffState();
  const reviewState = useBuildReviewState();
  const diffStatuses = reviewState?.diffStatuses;

  const variants = useMemo(() => {
    if (!activeDiff) {
      return [];
    }
    return getVariantFamily(activeDiff, allDiffs).map((diff) => ({
      diff,
      label: getVariantLabel(diff),
      isCurrent: diff.id === activeDiff.id,
      needsReview:
        checkDiffCanBeReviewed(diff.status, { isSubsetBuild }) &&
        (diffStatuses?.[diff.id] ?? EvaluationStatus.Pending) ===
          EvaluationStatus.Pending,
    }));
  }, [activeDiff, allDiffs, isSubsetBuild, diffStatuses]);

  // Nothing to switch to: this snapshot was captured once.
  if (variants.length < 2) {
    return null;
  }

  const pending = variants.filter((variant) => variant.needsReview).length;

  return (
    <MenuTrigger>
      <Tooltip
        content={
          pending > 0
            ? `${variants.length} variants of this snapshot, ${pending} still to review`
            : `${variants.length} variants of this snapshot`
        }
      >
        <Button variant="secondary" iconOnly aria-label="Variants">
          <LayersIcon />
        </Button>
      </Tooltip>
      <Popover placement="top">
        <Menu
          aria-label="Variants of this snapshot"
          selectedKeys={variants
            .filter((variant) => variant.isCurrent)
            .map((variant) => variant.diff.id)}
        >
          <MenuTitle>Variants of this snapshot</MenuTitle>
          {variants.map((variant) => (
            <MenuItem
              key={variant.diff.id}
              id={variant.diff.id}
              onAction={() => setActiveDiff(variant.diff)}
            >
              <MenuItemIcon>
                <VariantMark isCurrent={variant.isCurrent} />
              </MenuItemIcon>
              {variant.label}
              {variant.needsReview ? (
                <MenuItemSuffix>to review</MenuItemSuffix>
              ) : null}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
});

/** A dot on the variant on screen, so the list says where you are. */
function VariantMark(props: { isCurrent: boolean; className?: string }) {
  const { isCurrent, className } = props;
  return (
    <span className={className}>
      {isCurrent ? (
        <span className="bg-primary-solid block size-1.5 rounded-full" />
      ) : null}
    </span>
  );
}
