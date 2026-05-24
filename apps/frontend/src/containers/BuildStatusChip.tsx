import { DocumentType, graphql } from "@/gql";
import { BuildStatus } from "@/gql/graphql";
import { Chip, ChipProps } from "@/ui/Chip";
import { StackedItems } from "@/ui/StackedItems";
import { Tooltip } from "@/ui/Tooltip";
import { getBuildDescriptor } from "@/util/build";

import { AccountAvatar } from "./AccountAvatar";
import { BuildStatusDescription } from "./BuildStatusDescription";

const _BuildFragment = graphql(`
  fragment BuildStatusChip_Build on Build {
    ...BuildStatusDescription_Build
    type
    status
    reviews {
      id
      date
      user {
        id
        name
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
  }
`);

export function BuildStatusChip(props: {
  build: DocumentType<typeof _BuildFragment>;
  scale?: ChipProps["scale"];
}) {
  const { build } = props;
  const descriptor = getBuildDescriptor(build.type, build.status);
  const reviewWithUsers = getLatestReviewByUser(build.reviews);
  return (
    <Tooltip variant="info" content={<BuildStatusDescription build={build} />}>
      <Chip icon={descriptor.icon} color={descriptor.color} scale={props.scale}>
        <span
          aria-label={getChipLabel(build) ?? undefined}
          className="flex items-center gap-(--chip-gap)"
        >
          {descriptor.label}
          <BuildReviewUsers reviews={reviewWithUsers} />
        </span>
      </Chip>
    </Tooltip>
  );
}

function getChipLabel(build: DocumentType<typeof _BuildFragment>) {
  switch (build.status) {
    case BuildStatus.Rejected:
    case BuildStatus.Accepted: {
      const descriptor = getBuildDescriptor(build.type, build.status);
      const reviewers = getReviewerList(build.reviews);
      return reviewers ? `${descriptor.label} by ${reviewers}` : "Accepted";
    }
    default:
      return null;
  }
}

function getLatestReviewByUser(
  reviews: DocumentType<typeof _BuildFragment>["reviews"],
) {
  const byUser = new Map<
    string,
    DocumentType<typeof _BuildFragment>["reviews"][number]
  >();
  for (const review of reviews) {
    if (!review.user) {
      continue;
    }
    const previous = byUser.get(review.user.id);
    if (!previous || new Date(review.date) > new Date(previous.date)) {
      byUser.set(review.user.id, review);
    }
  }
  return Array.from(byUser.values());
}

/**
 * Get the reviewer list for a build.
 * @example by Greg Bergé, Jeremy Sfez and 2 others
 */
function getReviewerList(
  reviews: DocumentType<typeof _BuildFragment>["reviews"],
) {
  const reviewerNames = getLatestReviewByUser(reviews)
    .map((review) => review.user?.name)
    .filter(Boolean) as string[];
  if (reviewerNames.length === 0) {
    return null;
  }
  const displayedReviewers = reviewerNames.slice(0, 2);
  const remainingCount = reviewerNames.length - displayedReviewers.length;
  if (remainingCount > 0) {
    return `${displayedReviewers.join(", ")} and ${remainingCount} others`;
  }
  return displayedReviewers.join(", ");
}

function BuildReviewUsers(props: {
  reviews: DocumentType<typeof _BuildFragment>["reviews"];
}) {
  if (props.reviews.length === 0) {
    return null;
  }
  return (
    <StackedItems>
      {props.reviews.map((review) => {
        if (!review.user) {
          return null;
        }
        return (
          <div key={review.id}>
            <AccountAvatar
              avatar={review.user.avatar}
              className="size-4"
              alt={review.user.name ?? undefined}
            />
          </div>
        );
      })}
    </StackedItems>
  );
}
