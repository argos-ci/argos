import {
  ClockIcon,
  MessageCircleIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";

import { ReviewState } from "@/gql/graphql";

type ReviewLike = {
  date: string;
  dismissedAt?: string | null;
  user: { id: string } | null;
};

/**
 * Keep only the latest review per user, sorted from newest to oldest.
 * Reviews without a user are dropped.
 */
export function getLatestReviewByUser<T extends ReviewLike>(
  reviews: readonly T[],
): T[] {
  const byUser = new Map<string, T>();
  for (const review of reviews) {
    if (!review.user) {
      continue;
    }
    const previous = byUser.get(review.user.id);
    if (!previous || new Date(review.date) > new Date(previous.date)) {
      byUser.set(review.user.id, review);
    }
  }
  return Array.from(byUser.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/**
 * Like `getLatestReviewByUser`, but excludes dismissed reviews.
 */
export function getLatestActiveReviewByUser<T extends ReviewLike>(
  reviews: readonly T[],
): T[] {
  return getLatestReviewByUser(reviews).filter((review) => !review.dismissedAt);
}

export const buildReviewDescriptors: Record<
  ReviewState,
  {
    label: string;
    icon: LucideIcon;
    textColor: string;
  }
> = {
  [ReviewState.Approved]: {
    label: "Approved",
    icon: ThumbsUpIcon,
    textColor: "text-success-low",
  },
  [ReviewState.Rejected]: {
    label: "Rejected",
    icon: ThumbsDownIcon,
    textColor: "text-danger-low",
  },
  [ReviewState.Commented]: {
    label: "Reviewed",
    icon: MessageCircleIcon,
    textColor: "text-info-low",
  },
  [ReviewState.Pending]: {
    label: "Pending",
    icon: ClockIcon,
    textColor: "text-low",
  },
};
