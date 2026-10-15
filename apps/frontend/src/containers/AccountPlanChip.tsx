import { assertNever } from "@argos/util/assertNever";
import { clsx } from "clsx";

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
  /**
   * Below `md`, only the statuses that call for attention: a phone has no room
   * for the plan's name.
   */
  phoneAlertsOnly?: boolean;
}) => {
  const { account, phoneAlertsOnly = false } = props;
  const chip: {
    color: ChipColor;
    children: string;
    alert: boolean;
  } | null = (() => {
    switch (account.subscriptionStatus) {
      case AccountSubscriptionStatus.Active:
        return account.plan
          ? { color: "info", children: account.plan.displayName, alert: false }
          : null;
      case AccountSubscriptionStatus.Trialing:
      case AccountSubscriptionStatus.TrialingWithPaymentMethod:
        return {
          color: "info",
          children: `${account.plan?.displayName} Trial`,
          alert: true,
        };
      case AccountSubscriptionStatus.PastDue:
        return { color: "danger", children: "Past Due", alert: true };
      case null:
        return { color: "neutral", children: "Hobby", alert: false };
      case AccountSubscriptionStatus.Canceled:
      case AccountSubscriptionStatus.TrialExpired:
      case AccountSubscriptionStatus.Unpaid:
      case AccountSubscriptionStatus.Incomplete:
      case AccountSubscriptionStatus.IncompleteExpired:
      case AccountSubscriptionStatus.Paused:
        return null;
      default:
        assertNever(account.subscriptionStatus);
    }
  })();
  if (!chip) {
    return null;
  }
  return (
    <Chip
      scale="xs"
      color={chip.color}
      className={clsx(
        props.className,
        phoneAlertsOnly && !chip.alert && "max-md:hidden",
      )}
    >
      {chip.children}
    </Chip>
  );
};
