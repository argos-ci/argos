import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import { BanIcon } from "lucide-react";
import moment from "moment";

import { ReviewState } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Tooltip } from "@/ui/Tooltip";
import { UserHoverCard, type UserCardData } from "@/ui/UserCard";
import {
  buildReviewDescriptors,
  getLatestReviewByUser,
} from "@/util/build-review";

import { AccountAvatar } from "./AccountAvatar";

type ReviewerUser = {
  id: string;
  name: string | null;
  slug: string;
  avatar: ComponentProps<typeof AccountAvatar>["avatar"];
};

type ReviewerStatusReview = {
  id: string;
  date: string;
  state: ReviewState;
  dismissedAt?: string | null;
  automatic?: boolean;
  user: ReviewerUser | null;
};

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
  pendingUsers?: readonly NonNullable<T["user"]>[];
  className?: string;
  itemClassName?: string;
  avatarClassName?: string;
  renderAction?: (review: T) => ReactNode;
  /**
   * When provided, the reviewer's avatar + name are wrapped in a {@link
   * UserHoverCard}. The user type is the caller's, so a richer selection
   * (presence, role) flows through to the card.
   */
  getUserCardData?: (user: NonNullable<T["user"]>) => UserCardData;
}) {
  const reviewers = getLatestReviewByUser(props.reviews);
  const pendingUsers = props.pendingUsers ?? [];
  if (reviewers.length === 0 && pendingUsers.length === 0) {
    return null;
  }
  const pendingDescriptor = buildReviewDescriptors[ReviewState.Pending];
  const PendingIcon = pendingDescriptor.icon;

  const renderUserContent = (
    user: NonNullable<T["user"]>,
    options?: { automatic?: boolean },
  ) => {
    const content = (
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="relative shrink-0">
          <AccountAvatar
            className={clsx("size-5", props.avatarClassName)}
            avatar={user.avatar}
            alt={user.name ?? undefined}
          />
          {options?.automatic ? (
            <Tooltip
              content={`Approved automatically based on a previous approval by ${user.name || user.slug}.`}
            >
              <BrandShield className="bg-app absolute -right-1 -bottom-1 size-3 rounded-full" />
            </Tooltip>
          ) : null}
        </span>
        <strong className="truncate font-medium">
          {user.name || user.slug}
        </strong>
      </span>
    );
    if (props.getUserCardData) {
      return (
        <UserHoverCard user={props.getUserCardData(user)}>
          {content}
        </UserHoverCard>
      );
    }
    return content;
  };

  return (
    <ul className={clsx("flex flex-col", props.className)}>
      {reviewers.map((review) => {
        const descriptor = getReviewDescriptor(review);
        const Icon = descriptor.icon;
        const user = review.user as NonNullable<T["user"]> | null;
        return (
          <li
            key={review.id}
            className={clsx(
              "flex items-center gap-2 text-sm",
              props.itemClassName,
            )}
          >
            {user ? (
              renderUserContent(user, { automatic: review.automatic })
            ) : (
              <span className="flex-1 truncate font-medium">Unknown user</span>
            )}
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
          {renderUserContent(user)}
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
