import { FileUpIcon } from "lucide-react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { graphql, type DocumentType } from "@/gql";
import { SidebarHeader, SidebarHeading, SidebarSection } from "@/ui/Sidebar";
import { Time } from "@/ui/Time";

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
        <div className="relative px-1">
          <div className="w-thin absolute top-1 bottom-0 left-[10.5px] bg-(--mauve-6)" />
          <ul className="relative space-y-3 text-xs">
            <li className="text-low flex items-center">
              <div className="bg-subtle mr-2 py-1">
                <FileUpIcon className="size-3.5" />
              </div>
              Test created
              <span className="w-3 text-center">·</span>
              <Time date={test.createdAt} />
            </li>
            {change?.trails.map((trail) => {
              return (
                <li key={trail.id} className="text-low flex items-center">
                  <div className="bg-subtle mr-2 py-1">
                    <AccountAvatar
                      avatar={trail.user.avatar}
                      className="size-3.5 border"
                    />
                  </div>
                  {getActionLabel(trail.action)}
                  <span className="w-3 text-center">·</span>
                  <Time date={trail.date} />
                </li>
              );
            })}
          </ul>
        </div>
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
