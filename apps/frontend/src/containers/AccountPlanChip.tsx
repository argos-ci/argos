import { DocumentType, graphql } from "@/gql";
import { AccountSubscriptionStatus } from "@/gql/graphql";
import { Chip, ChipColor } from "@/ui/Chip";

const _AccountFragment = graphql(`
  fragment AccountPlanChip_Account on Account {
    subscriptionStatus
    plan {
      id
      displayName
    }
  }
`);

export const AccountPlanChip = (props: {
  account: DocumentType<typeof _AccountFragment>;
  className?: string;
}) => {
  const { account } = props;
  const chipProps: { color: ChipColor; children: string } | null = (() => {
    switch (account.subscriptionStatus) {
      case AccountSubscriptionStatus.Active:
        return account.plan
          ? { color: "info", children: account.plan.displayName }
          : null;
      case AccountSubscriptionStatus.Trialing:
        return {
          color: "info",
          children: `${account.plan?.displayName} Trial`,
        };
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
