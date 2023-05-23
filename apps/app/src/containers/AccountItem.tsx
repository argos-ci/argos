import { FragmentType, graphql, useFragment } from "@/gql";
import { PlanChip } from "@/ui/PlanChip";

import { AccountAvatar } from "./AccountAvatar";

const AccountFragment = graphql(`
  fragment AccountItem_Account on Account {
    id
    slug
    name
    purchaseStatus
    plan {
      id
      name
    }
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

export type AccountItemProps = {
  account: FragmentType<typeof AccountFragment>;
  showPlan?: boolean;
};

export const AccountItem = ({
  account: accountProp,
  showPlan = false,
}: AccountItemProps) => {
  const account = useFragment(AccountFragment, accountProp);
  return (
    <div className="flex items-center gap-2">
      <AccountAvatar avatar={account.avatar} size={18} />
      {account.name || account.slug}
      {showPlan && (
        <PlanChip
          planName={account.plan?.name}
          purchaseStatus={account.purchaseStatus}
          isUserAccount={account.__typename === "User"}
        />
      )}
    </div>
  );
};
