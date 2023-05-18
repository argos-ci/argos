import { memo } from "react";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Banner } from "@/ui/Banner";
import { Container } from "@/ui/Container";
import { StripeCheckoutButton, StripePortalLink } from "@/ui/StripeLink";

export const PaymentBannerFragment = graphql(`
  fragment PaymentBanner_Account on Account {
    id
    stripeCustomerId
    hasPaidPlan

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
      <StripePortalLink stripeCustomerId={stripeCustomerId} buttonDesign={true}>
        {children}
      </StripePortalLink>
    );
  }

  return (
    <StripeCheckoutButton accountId={accountId} variant="secondary">
      {children}
    </StripeCheckoutButton>
  );
};

export type PaymentBannerProps = {
  account: FragmentType<typeof PaymentBannerFragment>;
};

export const PaymentBanner = memo((props: PaymentBannerProps) => {
  const account = useFragment(PaymentBannerFragment, props.account);
  const { purchase } = account;
  const { paymentMethodFilled, isTrialActive, trialDaysRemaining } =
    purchase || {};

  const isTeamAccount = account.__typename === "Team";
  const visible =
    isTeamAccount && (!account.hasPaidPlan || !paymentMethodFilled);

  if (!visible) {
    return null;
  }

  const trialActiveMessage = isTrialActive
    ? `Your trial expires in ${trialDaysRemaining} days. `
    : "";

  const { message, buttonLabel } = !account.hasPaidPlan
    ? {
        message: `No paid plan is associated with your team. To maintain access to team features, upgrade to Pro.`,
        buttonLabel: "Upgrade",
      }
    : {
        message: `${trialActiveMessage}To maintain access to team features, add a payment method.`,
        buttonLabel: "Add payment method",
      };

  return (
    <Banner
      className="flex justify-center"
      color={account.hasPaidPlan ? "warning" : "danger"}
    >
      <Container className="flex items-center justify-center gap-2">
        <p>{message}</p>
        <UpgradeButton
          stripeCustomerId={account.stripeCustomerId ?? null}
          accountId={account.id}
        >
          {buttonLabel}
        </UpgradeButton>
      </Container>
    </Banner>
  );
});
