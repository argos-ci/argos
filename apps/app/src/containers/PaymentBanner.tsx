import { memo } from "react";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Permission } from "@/gql/graphql";
import { Banner, BannerProps } from "@/ui/Banner";
import { Container } from "@/ui/Container";
import { StripePortalLink } from "@/ui/StripeLink";

import { UpgradeDialogButton } from "./UpgradeDialog";

const now = new Date();
const FREE_PLAN_EXPIRATION_DATE = new Date("2023-06-01");

export const PaymentBannerFragment = graphql(`
  fragment PaymentBanner_Account on Account {
    id
    stripeCustomerId
    hasPaidPlan
    permissions

    purchase {
      paymentMethodFilled
      isTrialActive
      trialDaysRemaining
    }
  }
`);

const UpgradeButton = ({
  stripeCustomerId,
  children,
  accountId,
}: {
  stripeCustomerId: string | null;
  children: React.ReactNode;
  accountId: string;
}) => {
  if (stripeCustomerId) {
    return (
      <StripePortalLink stripeCustomerId={stripeCustomerId} button={true}>
        {children}
      </StripePortalLink>
    );
  }

  return (
    <UpgradeDialogButton
      currentAccountId={accountId}
      color="white"
      variant="outline"
    >
      {children}
    </UpgradeDialogButton>
  );
};

const getSubscriptionStatus = ({
  isTeamAccount,
  hasPaidPlan,
  paymentMethodFilled,
  isTrialActive,
  trialDaysRemaining,
}: {
  isTeamAccount: boolean;
  hasPaidPlan: boolean;
  paymentMethodFilled: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number | null;
}): {
  message: string;
  buttonLabel?: string;
  bannerColor?: BannerProps["color"];
} => {
  if (!isTeamAccount) {
    return { message: "" };
  }

  if (!hasPaidPlan && now < FREE_PLAN_EXPIRATION_DATE) {
    return {
      message:
        "Starting June 1st, 2023, a Pro plan will be required to use team features.",
      buttonLabel: "Start trial",
    };
  }

  if (!hasPaidPlan) {
    return {
      message: `Upgrade to Pro plan to continue using team features.`,
      bannerColor: "danger",
    };
  }

  if (isTrialActive && !paymentMethodFilled) {
    return {
      message: `Your trial ends in ${trialDaysRemaining} days. Add a payment method to retain access to team features.`,
      buttonLabel: "Add payment method",
    };
  }

  if (!paymentMethodFilled) {
    return {
      message: `Add a payment method to ensure uninterrupted access to team features.`,
      buttonLabel: "Add payment method",
      bannerColor: "warning",
    };
  }

  return { message: "" };
};

export type PaymentBannerProps = {
  account: FragmentType<typeof PaymentBannerFragment>;
};

export const PaymentBanner = memo((props: PaymentBannerProps) => {
  const account = useFragment(PaymentBannerFragment, props.account);
  const { purchase, hasPaidPlan, permissions } = account;
  const { paymentMethodFilled, isTrialActive, trialDaysRemaining } =
    purchase || {};
  const { message, buttonLabel, bannerColor } = getSubscriptionStatus({
    isTeamAccount: account.__typename === "Team",
    hasPaidPlan,
    paymentMethodFilled: paymentMethodFilled ?? false,
    isTrialActive: isTrialActive ?? false,
    trialDaysRemaining: trialDaysRemaining ?? null,
  });
  const userIsOwner = permissions.includes(Permission.Write);

  if (!userIsOwner || !message) {
    return null;
  }

  return (
    <Banner className="flex justify-center" color={bannerColor ?? "neutral"}>
      <Container className="flex items-center justify-center gap-2">
        <p>{message}</p>
        <UpgradeButton
          stripeCustomerId={account.stripeCustomerId ?? null}
          accountId={account.id}
        >
          {buttonLabel || "Upgrade"}
        </UpgradeButton>
      </Container>
    </Banner>
  );
});
