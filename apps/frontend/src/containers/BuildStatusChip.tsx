import { DocumentType, graphql } from "@/gql";
import { BuildStatus } from "@/gql/graphql";
import { Chip, ChipProps } from "@/ui/Chip";
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
  const reviewWithUsers = build.reviews.filter((review) => review.user);
  return (
    <Tooltip variant="info" content={<BuildStatusDescription build={build} />}>
      <Chip icon={descriptor.icon} color={descriptor.color} scale={props.scale}>
        <span
          aria-label={getChipLabel(build) ?? undefined}
          className="gap-(--chip-gap) flex items-center"
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

/**
 * Get the reviewer list for a build.
 * @example by Greg Bergé, Jeremy Sfez and 2 others
 */
function getReviewerList(
  reviews: DocumentType<typeof _BuildFragment>["reviews"],
) {
  const reviewerNames = reviews
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
    <div className="flex -space-x-1">
      {props.reviews.map((review) => {
        if (!review.user) {
          return null;
        }
        return (
          <div key={review.id}>
            <AccountAvatar
              avatar={review.user.avatar}
              size={16}
              alt={review.user.name ?? undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
