import moment from "moment";
import { memo } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { useQuery } from "@/containers/Apollo";
import { TeamUpgradeDialogButton } from "@/containers/Team/UpgradeDialog";
import { FragmentType, graphql, useFragment } from "@/gql";
import { AccountPermission, AccountSubscriptionStatus } from "@/gql/graphql";
import { Banner, BannerProps } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { StripePortalLink } from "@/ui/StripeLink";

const PaymentBannerFragment = graphql(`
  fragment PaymentBanner_Account on Account {
    id
    subscriptionStatus
    permissions
    stripeCustomerId
    pendingCancelAt

    subscription {
      id
      trialDaysRemaining
      provider
      paymentMethodFilled
    }
  }
`);

const PaymentBannerQuery = graphql(`
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
        <Button>
          {(buttonProps) => (
            <RouterLink to={`/${accountSlug}/settings`} {...buttonProps}>
              {children}
            </RouterLink>
          )}
        </Button>
      );

    case "stripeCheckoutSession":
      return (
        <TeamUpgradeDialogButton initialAccountId={accountId}>
          {children}
        </TeamUpgradeDialogButton>
      );

    case "stripePortalSession":
      return stripeCustomerId ? (
        <StripePortalLink
          accountId={accountId}
          stripeCustomerId={stripeCustomerId}
          asButton
        >
          {children}
        </StripePortalLink>
      ) : null;

    default:
      return null;
  }
};

const getTeamBannerProps = ({
  subscriptionStatus,
  trialDaysRemaining,
  hasGitHubSubscription,
  missingPaymentMethod,
  pendingCancelAt,
}: {
  subscriptionStatus: AccountSubscriptionStatus;
  trialDaysRemaining: number | null;
  hasGitHubSubscription: boolean;
  missingPaymentMethod: boolean;
  pendingCancelAt: string | null;
}): {
  message: string;
  buttonLabel?: string;
  bannerColor?: BannerProps["color"];
  action: SubmitAction;
} => {
  switch (subscriptionStatus) {
    case AccountSubscriptionStatus.PastDue:
      return {
        bannerColor: "warning",
        message:
          "Your subscription is past due. Please update your payment info.",
        buttonLabel: "Manage subscription",
        action: hasGitHubSubscription ? "settings" : "stripeCheckoutSession",
      };

    case AccountSubscriptionStatus.Canceled:
      return {
        bannerColor: "danger",
        message: "Upgrade to Pro plan to use team features.",
        ...(hasGitHubSubscription
          ? { action: "settings", buttonLabel: "Manage subscription" }
          : { action: "stripeCheckoutSession", buttonLabel: "Upgrade" }),
      };

    case AccountSubscriptionStatus.Active:
    case AccountSubscriptionStatus.Trialing: {
      if (missingPaymentMethod) {
        const remainingDayMessage = `Your trial ends in ${trialDaysRemaining} days. `;
        return {
          message: `${
            trialDaysRemaining ? remainingDayMessage : ""
          }Add a payment method to retain access to team features.`,
          buttonLabel: "Add payment method",
          bannerColor:
            !trialDaysRemaining || trialDaysRemaining < 5
              ? "warning"
              : "neutral",
          action: "stripePortalSession",
        };
      }

      if (pendingCancelAt) {
        const formatDate = (date: string) => moment(date).format("LL");
        const subscriptionTypeLabel =
          subscriptionStatus === "trialing" ? "trial" : "subscription";
        return {
          action: "stripePortalSession",
          buttonLabel: `Reactivate ${subscriptionTypeLabel}`,
          message: `Your ${subscriptionTypeLabel} has been canceled. You can still use team features until the trial ends on ${formatDate(
            pendingCancelAt,
          )}.`,
        };
      }

      // Trial is active
      return { action: "stripePortalSession", message: "" };
    }

    default:
      return { action: "stripePortalSession", message: "" };
  }
};

export const PaymentBanner = memo(
  (props: { account: FragmentType<typeof PaymentBannerFragment> }) => {
    const account = useFragment(PaymentBannerFragment, props.account);
    const { data: { me } = {} } = useQuery(PaymentBannerQuery);

    const {
      subscription,
      permissions,
      subscriptionStatus,
      stripeCustomerId,
      pendingCancelAt,
    } = account;

    // no banner for user account
    if (!me || !subscriptionStatus) return null;

    const { message, buttonLabel, bannerColor, action } = getTeamBannerProps({
      subscriptionStatus,
      trialDaysRemaining: subscription?.trialDaysRemaining ?? null,
      hasGitHubSubscription: Boolean(
        subscription && subscription.provider === "github",
      ),
      missingPaymentMethod: Boolean(
        subscription && !subscription.paymentMethodFilled,
      ),
      pendingCancelAt: pendingCancelAt,
    });
    const userIsAdmin = permissions.includes(AccountPermission.Admin);

    if (!message) {
      return null;
    }

    return (
      <Banner className="flex justify-center" color={bannerColor ?? "neutral"}>
        <Container className="flex items-center justify-center gap-2">
          <p>{message}</p>
          {userIsAdmin &&
            (subscriptionStatus === AccountSubscriptionStatus.PastDue &&
            stripeCustomerId ? (
              <StripePortalLink
                stripeCustomerId={stripeCustomerId}
                accountId={account.id}
              >
                Manage your subscription
              </StripePortalLink>
            ) : (
              <BannerCta
                stripeCustomerId={stripeCustomerId ?? null}
                accountId={account.id}
                action={action}
              >
                {buttonLabel || me.hasSubscribedToTrial
                  ? "Upgrade"
                  : "Start trial"}
              </BannerCta>
            ))}
        </Container>
      </Banner>
    );
  },
);
