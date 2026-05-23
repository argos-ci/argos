import clsx from "clsx";
import { FileUpIcon, MailCheckIcon } from "lucide-react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { SidebarHeader, SidebarHeading, SidebarSection } from "@/ui/Sidebar";
import { Time } from "@/ui/Time";
import { buildReviewDescriptors } from "@/util/build-review";

const _BuildFragment = graphql(`
  fragment ReviewActivitySection_Build on Build {
    createdAt
    concludedAt
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

type Build = DocumentType<typeof _BuildFragment>;

type ActivityItem =
  | { kind: "created"; date: string }
  | { kind: "ready"; date: string }
  | { kind: "review"; date: string; review: Build["reviews"][number] };

function getActivityItems(build: Build): ActivityItem[] {
  const items: ActivityItem[] = [{ kind: "created", date: build.createdAt }];
  if (build.concludedAt) {
    items.push({ kind: "ready", date: build.concludedAt });
  }
  for (const review of build.reviews) {
    items.push({ kind: "review", date: review.date, review });
  }
  return items.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function ReviewActivitySection(props: { build: Build }) {
  const { build } = props;
  const items = getActivityItems(build);
  return (
    <SidebarSection>
      <SidebarHeader>
        <SidebarHeading>Activity</SidebarHeading>
      </SidebarHeader>
      <div className="px-3">
        <div className="relative px-1">
          <div className="w-thin absolute top-1 bottom-0 left-[10.5px] bg-(--mauve-6)" />
          <ul className="relative space-y-3 text-xs">
            {items.map((item, index) => (
              <ActivityRow key={index} item={item} />
            ))}
          </ul>
        </div>
      </div>
    </SidebarSection>
  );
}

function ActivityRow(props: { item: ActivityItem }) {
  const { item } = props;
  switch (item.kind) {
    case "created":
      return (
        <li className="text-low flex items-center">
          <div className="bg-subtle mr-2 py-1">
            <FileUpIcon className="size-3.5" />
          </div>
          Build created
          <span className="w-3 text-center">·</span>
          <Time date={item.date} />
        </li>
      );
    case "ready":
      return (
        <li className="text-low flex items-center">
          <div className="bg-subtle mr-2 py-1">
            <MailCheckIcon className="size-3.5" />
          </div>
          Ready for review
          <span className="w-3 text-center">·</span>
          <Time date={item.date} />
        </li>
      );
    case "review": {
      const { review } = item;
      const descriptor = buildReviewDescriptors[review.state];
      const Icon = descriptor.icon;
      return (
        <li className="text-low flex items-center">
          <div className="bg-subtle mr-2 py-1">
            {review.user ? (
              <AccountAvatar
                avatar={review.user.avatar}
                className="size-3.5 border"
              />
            ) : (
              <Icon className={clsx("size-3.5", descriptor.textColor)} />
            )}
          </div>
          <span className="truncate">
            <span className="font-medium">{descriptor.label}</span>
            {review.user && (
              <>
                {" by "}
                <span className="text-default font-medium">
                  {review.user.name || review.user.slug}
                </span>
              </>
            )}
          </span>
          <span className="w-3 text-center">·</span>
          <Time date={item.date} />
        </li>
      );
    }
  }
}
