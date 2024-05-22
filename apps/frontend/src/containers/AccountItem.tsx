import { HTMLAttributes } from "react";

import { AccountPlanChip } from "@/containers/AccountPlanChip";
import { FragmentType, graphql, useFragment } from "@/gql";

import { AccountAvatar } from "./AccountAvatar";

const AccountFragment = graphql(`
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
  account: FragmentType<typeof AccountFragment>;
  showPlan?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export function AccountItem({
  account: accountProp,
  showPlan = false,
  ...props
}: AccountItemProps) {
  const account = useFragment(AccountFragment, accountProp);
  return (
    <div className="flex items-center gap-2" {...props}>
      <AccountAvatar avatar={account.avatar} size={18} />
      {account.name || account.slug}
      {showPlan && <AccountPlanChip account={account} />}
    </div>
  );
}
