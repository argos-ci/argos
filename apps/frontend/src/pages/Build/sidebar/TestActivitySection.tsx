import { FileUpIcon } from "lucide-react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { graphql, type DocumentType } from "@/gql";
import { Activity, ActivityItem } from "@/ui/Activity";
import { SidebarHeader, SidebarHeading, SidebarSection } from "@/ui/Sidebar";
import { Time } from "@/ui/Time";
import { getUserCardData, UserHoverCard } from "@/ui/UserCard";

const _TestFragment = graphql(`
  fragment TestActivitySection_Test on Test {
    id
    createdAt
  }
`);

const _TestChangeFragment = graphql(`
  fragment TestActivitySection_TestChange on TestChange {
    id
    trails {
      ...Test_AuditTrail
    }
  }
`);

export function TestActivitySection(props: {
  test: DocumentType<typeof _TestFragment>;
  change: DocumentType<typeof _TestChangeFragment> | null;
}) {
  const { test, change } = props;
  return (
    <SidebarSection>
      <SidebarHeader>
        <SidebarHeading>Activity</SidebarHeading>
      </SidebarHeader>
      <div className="px-3">
        <Activity>
          <ActivityItem icon={<FileUpIcon className="size-3.5" />}>
            Test created · <Time date={test.createdAt} />
          </ActivityItem>
          {change?.trails.map((trail) => (
            <ActivityItem
              key={trail.id}
              icon={
                <UserHoverCard user={getUserCardData(trail.user)}>
                  <span tabIndex={0} className="shrink-0">
                    <AccountAvatar
                      avatar={trail.user.avatar}
                      className="size-3.5 border"
                    />
                  </span>
                </UserHoverCard>
              }
            >
              {getActionLabel(trail.action)} · <Time date={trail.date} />
            </ActivityItem>
          ))}
        </Activity>
      </div>
    </SidebarSection>
  );
}

function getActionLabel(action: string) {
  switch (action) {
    case "files.ignored":
      return "Change ignored";
    case "files.unignored":
      return "Change unignored";
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
