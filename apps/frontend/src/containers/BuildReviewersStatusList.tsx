import type { ComponentProps, ReactNode } from "react";
import clsx from "clsx";
import { BanIcon } from "lucide-react";
import moment from "moment";

import type { ReviewState } from "@/gql/graphql";
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
  className?: string;
  itemClassName?: string;
  avatarClassName?: string;
  renderAction?: (review: T) => ReactNode;
}) {
  const reviewers = getLatestReviewByUser(props.reviews);
  if (reviewers.length === 0) {
    return null;
  }
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
    </ul>
  );
}
