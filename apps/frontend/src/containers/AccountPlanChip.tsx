import { FragmentType, graphql, useFragment } from "@/gql";
import { AccountSubscriptionStatus } from "@/gql/graphql";
import { Chip, ChipColor } from "@/ui/Chip";

const AccountFragment = graphql(`
  fragment AccountPlanChip_Account on Account {
    subscriptionStatus
    plan {
      id
      name
    }
  }
`);

export const AccountPlanChip = (props: {
  account: FragmentType<typeof AccountFragment>;
  className?: string;
}) => {
  const account = useFragment(AccountFragment, props.account);
  const chipProps: { color: ChipColor; children: string } | null = (() => {
    switch (account.subscriptionStatus) {
      case AccountSubscriptionStatus.Active:
        return account.plan
          ? { color: "info", children: account.plan.name }
          : null;
      case AccountSubscriptionStatus.Trialing:
        return { color: "info", children: "Trial" };
      case AccountSubscriptionStatus.PastDue:
        return { color: "danger", children: "Past Due" };
      case null:
        return { color: "neutral", children: "Hobby" };
      default:
        return null;
    }
  })();
  if (!chipProps) {
    return null;
  }
  return <Chip scale="xs" className={props.className} {...chipProps} />;
};
