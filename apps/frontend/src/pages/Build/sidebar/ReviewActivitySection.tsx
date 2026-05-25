import clsx from "clsx";
import { FileUpIcon, MailCheckIcon } from "lucide-react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { Activity, ActivityItem } from "@/ui/Activity";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
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
    comments {
      id
      date
      content
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

type ActivityEntry =
  | { kind: "created"; date: string }
  | { kind: "ready"; date: string }
  | { kind: "review"; date: string; review: Build["reviews"][number] }
  | { kind: "comment"; date: string; comment: Build["comments"][number] };

function getActivityEntries(build: Build): ActivityEntry[] {
  const entries: ActivityEntry[] = [{ kind: "created", date: build.createdAt }];
  if (build.concludedAt) {
    entries.push({ kind: "ready", date: build.concludedAt });
  }
  for (const review of build.reviews) {
    entries.push({ kind: "review", date: review.date, review });
  }
  for (const comment of build.comments) {
    entries.push({ kind: "comment", date: comment.date, comment });
  }
  return entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function ReviewActivitySection(props: { build: Build }) {
  const { build } = props;
  const entries = getActivityEntries(build);
  return (
    <SidebarSection>
      <SidebarHeader>
        <SidebarHeading>Activity</SidebarHeading>
      </SidebarHeader>
      <div className="px-3">
        <Activity>
          {entries.map((entry, index) => (
            <ActivityEntryRow key={index} entry={entry} />
          ))}
        </Activity>
      </div>
    </SidebarSection>
  );
}

function ActivityEntryRow(props: { entry: ActivityEntry }) {
  const { entry } = props;
  switch (entry.kind) {
    case "created":
      return (
        <ActivityItem icon={<FileUpIcon className="size-3.5" />}>
          Build created · <Time date={entry.date} />
        </ActivityItem>
      );
    case "ready":
      return (
        <ActivityItem icon={<MailCheckIcon className="size-3.5" />}>
          Build ready · <Time date={entry.date} />
        </ActivityItem>
      );
    case "review": {
      const { review } = entry;
      const descriptor = buildReviewDescriptors[review.state];
      const Icon = descriptor.icon;
      return (
        <ActivityItem
          icon={<Icon className={clsx("size-3.5", descriptor.textColor)} />}
        >
          <span className="font-medium">{descriptor.label}</span>
          {review.user && (
            <>
              {" by "}
              <span className="text-default font-medium">
                {review.user.name || review.user.slug}
              </span>
            </>
          )}
          {" · "}
          <Time date={entry.date} />
        </ActivityItem>
      );
    }
    case "comment":
      return <CommentCard comment={entry.comment} />;
  }
}

function CommentCard(props: { comment: Build["comments"][number] }) {
  const { comment } = props;
  return (
    <div className="border-thin bg-app rounded-md">
      <div className="flex items-center gap-2 px-3 py-2">
        {comment.user ? (
          <AccountAvatar
            avatar={comment.user.avatar}
            className="size-5 border"
          />
        ) : null}
        <span className="text-default text-xs font-medium">
          {comment.user?.name || comment.user?.slug || "Unknown user"}
        </span>
        <Time date={comment.date} className="text-low text-xs" />
      </div>
      <div className="border-t-thin text-default px-3 py-2 text-sm">
        <ReadOnlyEditor content={comment.content} />
      </div>
    </div>
  );
}
