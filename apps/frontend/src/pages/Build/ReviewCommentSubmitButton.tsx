import { ArrowUpIcon, MessageSquarePlusIcon } from "lucide-react";

import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { BuildStatus, ProjectPermission } from "@/gql/graphql";
import { MOD } from "@/ui/Editor/EditorToolbar.shortcuts";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

export const ReviewCommentSubmitButton_Build = graphql(`
  fragment ReviewCommentSubmitButton_Build on Build {
    id
    status
    viewerHasSubmittedReview
  }
`);

// A build can be reviewed (and therefore drafted against) only once it has
// changes to act on. Mirrors the visibility of the "Submit review" button so a
// draft comment is never stranded on a build with no review surface.
const REVIEWABLE_STATUSES: BuildStatus[] = [
  BuildStatus.Accepted,
  BuildStatus.Rejected,
  BuildStatus.ChangesDetected,
];

/**
 * Whether new comments on this build should default to being added to the
 * current user's review draft. True only before the user has submitted a
 * review, when they may review, and when the build is reviewable.
 */
export function useCanAddToReview(
  build: DocumentType<typeof ReviewCommentSubmitButton_Build>,
): boolean {
  const canReview = useProjectPermission(ProjectPermission.Review);
  return (
    !build.viewerHasSubmittedReview &&
    REVIEWABLE_STATUSES.includes(build.status) &&
    canReview
  );
}

/**
 * The composer submit affordance for build comments. When the build can be
 * drafted against, it defaults to "Add to review" (message-square-plus); while
 * Alt is held it flips to "Post comment", which posts the comment immediately.
 * Otherwise it is a plain send button.
 */
export function ReviewCommentSubmitButton(props: {
  canAddToReview: boolean;
  altHeld: boolean;
  /** Label/tooltip used when the build can't be drafted against. */
  fallbackLabel: string;
  isEmpty: boolean;
  isPending: boolean;
  disabled?: boolean;
  onPress: () => void;
  className?: string;
}) {
  const {
    canAddToReview,
    altHeld,
    fallbackLabel,
    isEmpty,
    isPending,
    disabled,
    onPress,
    className,
  } = props;
  const reviewMode = canAddToReview && !altHeld;
  const label = !canAddToReview
    ? fallbackLabel
    : reviewMode
      ? "Add to review"
      : "Post comment";
  const Icon = reviewMode ? MessageSquarePlusIcon : ArrowUpIcon;
  return (
    <HotkeyTooltip
      description={
        canAddToReview ? (
          <div className="flex flex-col">
            <span>{label}</span>
            <span className="text-low">
              {reviewMode ? "Hold Alt to post now" : "Release Alt to draft"}
            </span>
          </div>
        ) : (
          label
        )
      }
      keys={[MOD, "Enter"]}
      placement="top"
    >
      <IconButton
        variant="contained"
        size="small"
        rounded
        aria-label={label}
        // Truly disabled (not focusable/clickable) while submitting or when
        // disabled by the parent. When merely empty it only *looks* disabled but
        // stays clickable so the press can surface the "empty" toast.
        isDisabled={disabled || isPending}
        aria-disabled={isEmpty}
        onPress={onPress}
        className={className}
      >
        <Icon />
      </IconButton>
    </HotkeyTooltip>
  );
}
