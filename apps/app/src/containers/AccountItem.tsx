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
  }
`);

export type AccountItemProps = {
  account: FragmentType<typeof AccountFragment>;
};

export const AccountItem = (props: AccountItemProps) => {
  const account = useFragment(AccountFragment, props.account);
  return (
    <div className="flex items-center gap-2">
      <AccountAvatar avatar={account.avatar} size={18} />
      {account.name || account.slug}
    </div>
  );
};
