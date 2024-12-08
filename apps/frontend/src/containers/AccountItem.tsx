import clsx from "clsx";

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
} & Omit<React.ComponentPropsWithRef<"div">, "children">;

export function AccountItem({
  account: accountProp,
  showPlan = false,
  ...props
}: AccountItemProps) {
  const account = useFragment(AccountFragment, accountProp);
  return (
    <div
      {...props}
      className={clsx("flex items-center gap-2", props.className)}
    >
      <AccountAvatar avatar={account.avatar} size={18} />
      {account.name || account.slug}
      {showPlan && <AccountPlanChip account={account} />}
    </div>
  );
}
