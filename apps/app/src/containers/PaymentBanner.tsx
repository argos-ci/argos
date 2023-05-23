import moment from "moment";
import { memo } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Permission, PurchaseStatus, Team } from "@/gql/graphql";
import { Banner, BannerProps } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { StripePortalLink } from "@/ui/StripeLink";

import { useQuery } from "./Apollo";
import { UpgradeDialogButton } from "./UpgradeDialog";

const now = new Date();
const FREE_PLAN_EXPIRATION_DATE = new Date("2023-06-01");

export const PaymentBannerFragment = graphql(`
  fragment PaymentBanner_Account on Account {
    id
    purchaseStatus
    permissions
    stripeCustomerId
    pendingCancelAt

    purchase {
      id
      trialDaysRemaining
      source
      paymentMethodFilled
    }
  }
`);

export const PaymentBannerQuery = graphql(`
  query PaymentBanner_me {
    me {
      id
      hasSubscribedToTrial
    }
  }
`);

type SubmitAction =
  | "stripeCheckoutSession"
  | "stripePortalSession"
  | "settings";

const BannerCta = ({
  stripeCustomerId,
  children,
  accountId,
  action,
}: {
  stripeCustomerId: string | null;
  children: React.ReactNode;
  accountId: string;
  action: SubmitAction;
}) => {
  const { accountSlug } = useParams();

  switch (action) {
    case "settings":
      return (
        <Button color="white" variant="outline">
          {(buttonProps) => (
            <RouterLink to={`/${accountSlug}/settings`} {...buttonProps}>
              {children}
            </RouterLink>
          )}
        </Button>
      );

    case "stripeCheckoutSession":
      return (
        <UpgradeDialogButton
          stripeCustomerId={stripeCustomerId}
          currentAccountId={accountId}
          color="white"
          variant="outline"
        >
          {children}
        </UpgradeDialogButton>
      );

    case "stripePortalSession":
      return stripeCustomerId ? (
        <StripePortalLink
          stripeCustomerId={stripeCustomerId ?? ""}
          button={true}
        >
          {children}
        </StripePortalLink>
      ) : null;

    default:
      return null;
  }
};

const getBannerProps = ({
  purchaseStatus,
  trialDaysRemaining,
  hasGithubPurchase,
  missingPaymentMethod,
  pendingCancelAt,
}: {
  purchaseStatus: PurchaseStatus;
  trialDaysRemaining: number | null;
  hasGithubPurchase: boolean;
  missingPaymentMethod: boolean;
  pendingCancelAt: string | null;
}): {
  message: string;
  buttonLabel?: string;
  bannerColor?: BannerProps["color"];
  action: SubmitAction;
} => {
  if (
    (purchaseStatus === PurchaseStatus.Active ||
      purchaseStatus === PurchaseStatus.Trialing ||
      purchaseStatus === PurchaseStatus.Unpaid) &&
    missingPaymentMethod
  ) {
    const trialMessage =
      trialDaysRemaining !== null
        ? `Your trial ends in ${trialDaysRemaining} days. `
        : "";

    return {
      message: `${trialMessage}Add a payment method to retain access to team features.`,
      buttonLabel: "Add payment method",
      bannerColor:
        !trialDaysRemaining || trialDaysRemaining < 5 ? "warning" : "neutral",
      action: "stripePortalSession",
    };
  }

  if (
    purchaseStatus === PurchaseStatus.Trialing ||
    purchaseStatus === PurchaseStatus.Active
  ) {
    const subscriptionType =
      purchaseStatus === PurchaseStatus.Trialing ? "trial" : "subscription";
    const action = "stripePortalSession";

    if (!pendingCancelAt) {
      return { action, message: "" };
    }

    return {
      action,
      buttonLabel: `Reactivate ${subscriptionType}`,
      message: `Your ${subscriptionType} has been canceled. You can still use team features until the trial ends on ${moment(
        pendingCancelAt
      ).format("LL")}.`,
    };
  }

  const action = hasGithubPurchase ? "settings" : "stripeCheckoutSession";
  const buttonLabel = hasGithubPurchase ? "Manage subscription" : "Upgrade";

  if (now < FREE_PLAN_EXPIRATION_DATE) {
    return {
      action,
      buttonLabel,
      bannerColor: "neutral",
      message:
        "Starting June 1st, 2023, a Pro plan will be required to use team features.",
    };
  }

  return {
    action,
    buttonLabel,
    bannerColor: "danger",
    message: "Upgrade to Pro plan to use team features.",
  };
};

export type PaymentBannerProps = {
  account: FragmentType<typeof PaymentBannerFragment>;
};

export const PaymentBanner = memo((props: PaymentBannerProps) => {
  const account = useFragment(PaymentBannerFragment, props.account);
  const { data: { me } = {} } = useQuery(PaymentBannerQuery);

  if (!me || account.__typename === "User") {
    return null;
  }

  const {
    purchase,
    permissions,
    purchaseStatus,
    stripeCustomerId,
    pendingCancelAt,
  } = account as Team;

  const { paymentMethodFilled, trialDaysRemaining } = purchase || {};
  const { message, buttonLabel, bannerColor, action } = getBannerProps({
    purchaseStatus,
    trialDaysRemaining: trialDaysRemaining ?? null,
    hasGithubPurchase: Boolean(purchase && purchase.source === "github"),
    missingPaymentMethod: !paymentMethodFilled,
    pendingCancelAt: pendingCancelAt,
  });
  const userIsOwner = permissions.includes(Permission.Write);

  if (!message) {
    return null;
  }

  return (
    <Banner className="flex justify-center" color={bannerColor ?? "neutral"}>
      <Container className="flex items-center justify-center gap-2">
        <p>{message}</p>
        {!userIsOwner && (
          <BannerCta
            stripeCustomerId={stripeCustomerId ?? null}
            accountId={account.id}
            action={action}
          >
            {buttonLabel || me.hasSubscribedToTrial ? "Upgrade" : "Start trial"}
          </BannerCta>
        )}
      </Container>
    </Banner>
  );
});
