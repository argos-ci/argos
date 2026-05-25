import type { ComponentProps } from "react";
import clsx from "clsx";

import type { ReviewState } from "@/gql/graphql";
import { buildReviewDescriptors } from "@/util/build-review";

import { AccountAvatar } from "./AccountAvatar";

type ReviewerStatusReview = {
  id: string;
  date: string;
  state: ReviewState;
  user: {
    id: string;
    name: string | null;
    slug: string;
    avatar: ComponentProps<typeof AccountAvatar>["avatar"];
  } | null;
};

export function getLatestReviewByUser<T extends ReviewerStatusReview>(
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

export function BuildReviewersStatusList(props: {
  reviews: readonly ReviewerStatusReview[];
  className?: string;
  itemClassName?: string;
  avatarClassName?: string;
}) {
  const reviewers = getLatestReviewByUser(props.reviews);
  if (reviewers.length === 0) {
    return null;
  }
  return (
    <ul className={clsx("flex flex-col", props.className)}>
      {reviewers.map((review) => {
        const descriptor = buildReviewDescriptors[review.state];
        const Icon = descriptor.icon;
        return (
          <li
            key={review.id}
            className={clsx(
              "flex items-center gap-2 py-1.5 text-sm",
              props.itemClassName,
            )}
          >
            {review.user && (
              <AccountAvatar
                className={clsx("size-5 shrink-0", props.avatarClassName)}
                avatar={review.user.avatar}
                alt={review.user.name ?? undefined}
              />
            )}
            <strong className="flex-1 truncate font-medium">
              {review.user?.name || review.user?.slug}
            </strong>
            <span
              className={clsx(
                "inline-flex items-center gap-1 text-xs",
                descriptor.textColor,
              )}
            >
              <Icon className="size-3 shrink-0" />
              {descriptor.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
