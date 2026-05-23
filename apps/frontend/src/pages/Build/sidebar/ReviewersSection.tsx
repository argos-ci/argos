import clsx from "clsx";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { SidebarHeader, SidebarHeading, SidebarSection } from "@/ui/Sidebar";
import { buildReviewDescriptors } from "@/util/build-review";

const _BuildFragment = graphql(`
  fragment ReviewersSection_Build on Build {
    reviews {
      id
      date
      state
      user {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
  }
`);

type Review = DocumentType<typeof _BuildFragment>["reviews"][number];

function getLatestReviewByUser(reviews: readonly Review[]): Review[] {
  const byUser = new Map<string, Review>();
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

export function ReviewersSection(props: {
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { build } = props;
  const reviewers = getLatestReviewByUser(build.reviews);
  return (
    <SidebarSection>
      <SidebarHeader>
        <SidebarHeading>Reviewers</SidebarHeading>
      </SidebarHeader>
      {reviewers.length === 0 ? (
        <div className="text-low px-4 text-xs">No reviewers yet.</div>
      ) : (
        <ul className="flex flex-col">
          {reviewers.map((review) => {
            const descriptor = buildReviewDescriptors[review.state];
            const Icon = descriptor.icon;
            return (
              <li
                key={review.id}
                className="flex items-center gap-2 px-4 py-1.5 text-sm"
              >
                {review.user && (
                  <AccountAvatar
                    className="size-5 shrink-0"
                    avatar={review.user.avatar}
                  />
                )}
                <span className="flex-1 truncate font-medium">
                  {review.user?.name || review.user?.slug}
                </span>
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
      )}
    </SidebarSection>
  );
}
