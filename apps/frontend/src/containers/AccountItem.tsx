import clsx from "clsx";

import { AccountPlanChip } from "@/containers/AccountPlanChip";
import { DocumentType, graphql } from "@/gql";

import { AccountAvatar } from "./AccountAvatar";

const _AccountFragment = graphql(`
  fragment AccountItem_Account on Account {
    id
    slug
    name
    avatar {
      ...AccountAvatarFragment
    }
    ...AccountPlanChip_Account
  }
`);

export type AccountItemProps = {
  account: DocumentType<typeof _AccountFragment>;
  showPlan?: boolean;
} & Omit<React.ComponentPropsWithRef<"div">, "children">;

export function AccountItem({
  account,
  showPlan = false,
  ...props
}: AccountItemProps) {
  return (
    <div
      {...props}
      className={clsx("flex items-center gap-2", props.className)}
    >
      <AccountAvatar avatar={account.avatar} className="size-4.5" />
      {account.name || account.slug}
      {showPlan && <AccountPlanChip account={account} />}
    </div>
  );
}
