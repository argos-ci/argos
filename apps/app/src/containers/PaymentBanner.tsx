import { memo } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Permission, PurchaseStatus } from "@/gql/graphql";
import { Banner, BannerProps } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { StripePortalLink } from "@/ui/StripeLink";

import { UpgradeDialogButton } from "./UpgradeDialog";

const now = new Date();
const FREE_PLAN_EXPIRATION_DATE = new Date("2023-06-01");

export const PaymentBannerFragment = graphql(`
  fragment PaymentBanner_Account on Account {
    id
    purchaseStatus
    permissions
    stripeCustomerId

    purchase {
      id
      trialDaysRemaining
      plan {
        id
        name
      }
    }

    ... on Team {
      id
      me {
        id
        user {
          id
          hasSubscribedToTrial
        }
      }
    }
  }
`);

export type PaymentBannerProps = {
  account: FragmentType<typeof PaymentBannerFragment>;
};

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
  hasFreePlan,
}: {
  purchaseStatus: PurchaseStatus;
  trialDaysRemaining: number | null;
  hasFreePlan: boolean;
}): {
  message: string;
  buttonLabel?: string;
  bannerColor?: BannerProps["color"];
  action: SubmitAction;
} => {
  const activeTrialMessage =
    trialDaysRemaining !== null
      ? `Your trial ends in ${trialDaysRemaining} days. `
      : "";

  switch (purchaseStatus) {
    case PurchaseStatus.TrialCanceled:
      return {
        message: `Your trial has been canceled. ${activeTrialMessage}`,
        buttonLabel: "Reactivate trial",
        action: "stripePortalSession",
      };

    case PurchaseStatus.Missing:
    case PurchaseStatus.TrialExpired:
    case PurchaseStatus.Canceled: {
      const isBeforeFreePlanExpiration = now < FREE_PLAN_EXPIRATION_DATE;
      return {
        bannerColor: isBeforeFreePlanExpiration ? "neutral" : "danger",
        action: hasFreePlan ? "settings" : "stripeCheckoutSession",
        buttonLabel: hasFreePlan ? "Manage subscription" : "Upgrade",
        message: isBeforeFreePlanExpiration
          ? "Starting June 1st, 2023, a Pro plan will be required to use team features."
          : "Upgrade to Pro plan to continue using team features.",
      };
    }

    case PurchaseStatus.PaymentMethodMissing: {
      return {
        message: `${activeTrialMessage}Add a payment method to retain access to team features.`,
        buttonLabel: "Add payment method",
        bannerColor:
          trialDaysRemaining === null || trialDaysRemaining < 5
            ? "warning"
            : "neutral",
        action: "stripePortalSession",
      };
    }

    case PurchaseStatus.Trial:
    case PurchaseStatus.Active:
    case PurchaseStatus.Forced:
    case PurchaseStatus.None:
    default:
      return { message: "", action: "stripeCheckoutSession" };
  }
};

export const PaymentBanner = memo((props: PaymentBannerProps) => {
  const account = useFragment(PaymentBannerFragment, props.account);
  const { purchase, permissions, purchaseStatus, stripeCustomerId } = account;
  const purchasePlanName = purchase?.plan?.name ?? "";
  const hasSubscribedToTrial =
    account.__typename === "Team"
      ? account.me?.user?.hasSubscribedToTrial
      : false;

  const { message, buttonLabel, bannerColor, action } = getBannerProps({
    purchaseStatus,
    trialDaysRemaining: purchase?.trialDaysRemaining ?? null,
    hasFreePlan: purchasePlanName === "free",
  });
  const userIsOwner = permissions.includes(Permission.Write);
  if (!userIsOwner || !message) {
    return null;
  }

  return (
    <Banner className="flex justify-center" color={bannerColor ?? "neutral"}>
      <Container className="flex items-center justify-center gap-2">
        <p>{message}</p>
        <BannerCta
          stripeCustomerId={stripeCustomerId ?? null}
          accountId={account.id}
          action={action}
        >
          {buttonLabel || hasSubscribedToTrial ? "Upgrade" : "Start trial"}
        </BannerCta>
      </Container>
    </Banner>
  );
});
