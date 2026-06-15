import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import { BanIcon } from "lucide-react";
import moment from "moment";

import { ReviewState } from "@/gql/graphql";
import { Tooltip } from "@/ui/Tooltip";
import {
  buildReviewDescriptors,
  getLatestReviewByUser,
} from "@/util/build-review";

import { AccountAvatar } from "./AccountAvatar";

type ReviewerStatusReview = {
  id: string;
  date: string;
  state: ReviewState;
  dismissedAt?: string | null;
  user: {
    id: string;
    name: string | null;
    slug: string;
    avatar: ComponentProps<typeof AccountAvatar>["avatar"];
  } | null;
};

type ReviewerUser = NonNullable<ReviewerStatusReview["user"]>;

const dismissedReviewDescriptor = {
  label: "Dismissed",
  icon: BanIcon,
  textColor: "text-low",
};

function getReviewDescriptor(review: ReviewerStatusReview) {
  return review.dismissedAt
    ? dismissedReviewDescriptor
    : buildReviewDescriptors[review.state];
}

export function BuildReviewersStatusList<
  T extends ReviewerStatusReview,
>(props: {
  reviews: readonly T[];
  /**
   * Users requested as reviewers that haven't submitted a review yet. Rendered
   * as "pending" rows after the submitted reviews.
   */
  pendingUsers?: readonly ReviewerUser[];
  className?: string;
  itemClassName?: string;
  avatarClassName?: string;
  renderAction?: (review: T) => ReactNode;
}) {
  const reviewers = getLatestReviewByUser(props.reviews);
  const pendingUsers = props.pendingUsers ?? [];
  if (reviewers.length === 0 && pendingUsers.length === 0) {
    return null;
  }
  const pendingDescriptor = buildReviewDescriptors[ReviewState.Pending];
  const PendingIcon = pendingDescriptor.icon;
  return (
    <ul className={clsx("flex flex-col", props.className)}>
      {reviewers.map((review) => {
        const descriptor = getReviewDescriptor(review);
        const Icon = descriptor.icon;
        return (
          <li
            key={review.id}
            className={clsx(
              "flex items-center gap-2 text-sm",
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
            <Tooltip
              content={`${descriptor.label} · ${moment(review.dismissedAt ?? review.date).fromNow()}`}
            >
              <Icon
                className={clsx("size-3.5 shrink-0", descriptor.textColor)}
              />
            </Tooltip>
            {props.renderAction?.(review)}
          </li>
        );
      })}
      {pendingUsers.map((user) => (
        <li
          key={`pending-${user.id}`}
          className={clsx(
            "flex items-center gap-2 text-sm",
            props.itemClassName,
          )}
        >
          <AccountAvatar
            className={clsx("size-5 shrink-0", props.avatarClassName)}
            avatar={user.avatar}
            alt={user.name ?? undefined}
          />
          <strong className="flex-1 truncate font-medium">
            {user.name || user.slug}
          </strong>
          <Tooltip content={pendingDescriptor.label}>
            <PendingIcon
              className={clsx("size-3.5 shrink-0", pendingDescriptor.textColor)}
            />
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
