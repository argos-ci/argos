import { memo } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";

import { TeamSubscribeDialog } from "@/containers/Team/SubscribeDialog";
import { DocumentType, graphql } from "@/gql";
import { AccountPermission, AccountSubscriptionStatus } from "@/gql/graphql";
import { Banner, BannerProps } from "@/ui/Banner";
import { Container } from "@/ui/Container";
import { StripePortalLink } from "@/ui/StripeLink";
import { Time } from "@/ui/Time";

const _PaymentBannerFragment = graphql(`
  fragment PaymentBanner_Account on Account {
    id
    subscriptionStatus
    permissions
    stripeCustomerId

    subscription {
      id
      trialDaysRemaining
      endDate
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

function ManageStripeButton(props: {
  stripeCustomerId: string | null;
  accountId: string;
  children: React.ReactNode;
}) {
  if (props.stripeCustomerId) {
    return (
      <StripePortalLink
        stripeCustomerId={props.stripeCustomerId}
        accountId={props.accountId}
        asButton
      >
        {props.children}
      </StripePortalLink>
    );
  }
  return (
    <TeamSubscribeDialog initialAccountId={props.accountId}>
      {props.children}
    </TeamSubscribeDialog>
  );
}

function ManageButton(props: {
  stripeCustomerId: string | null;
  accountId: string;
  children?: React.ReactNode;
}) {
  return (
    <ManageStripeButton
      stripeCustomerId={props.stripeCustomerId}
      accountId={props.accountId}
    >
      {props.children}
    </ManageStripeButton>
  );
}

function BannerTemplate(props: {
  color: BannerProps["color"];
  children: React.ReactNode;
}) {
  return (
    <Banner className="flex justify-center" color={props.color ?? "neutral"}>
      <Container className="flex items-center justify-center gap-2">
        {props.children}
      </Container>
    </Banner>
  );
}

export const PaymentBanner = memo(
  (props: { account: DocumentType<typeof _PaymentBannerFragment> }) => {
    const { account } = props;
    const { data } = useSuspenseQuery(PaymentBannerQuery);

    const { subscription, subscriptionStatus, permissions, stripeCustomerId } =
      account;

    if (!data.me) {
      return null;
    }

    const userIsAdmin = permissions.includes(AccountPermission.Admin);

    const pendingCancelAt = subscription?.endDate;
    if (pendingCancelAt) {
      const subscriptionTypeLabel =
        subscriptionStatus === AccountSubscriptionStatus.Trialing
          ? "trial"
          : "subscription";
      return (
        <BannerTemplate color="warning">
          <p>
            Your {subscriptionTypeLabel} has been canceled. You can still use
            team features until the <Time date={pendingCancelAt} format="LL" />.
          </p>
          {userIsAdmin && (
            <ManageButton
              stripeCustomerId={stripeCustomerId ?? null}
              accountId={account.id}
            >
              Reactivate {subscriptionTypeLabel}
            </ManageButton>
          )}
        </BannerTemplate>
      );
    }

    switch (subscriptionStatus) {
      case AccountSubscriptionStatus.Trialing: {
        invariant(subscription, "If trialing, subscription must be defined");
        const daysRemaining = subscription.trialDaysRemaining;
        return (
          <BannerTemplate
            color={
              !daysRemaining || daysRemaining === 1
                ? "danger"
                : daysRemaining < 5
                  ? "warning"
                  : "neutral"
            }
          >
            <p>
              {daysRemaining === 1 ? (
                <>Your trial ends today. </>
              ) : daysRemaining ? (
                <>Your trial ends in {daysRemaining} days. </>
              ) : null}
              Add a payment method to retain access to team features.
            </p>
            {userIsAdmin && (
              <ManageButton
                stripeCustomerId={stripeCustomerId ?? null}
                accountId={account.id}
              >
                Add payment method
              </ManageButton>
            )}
          </BannerTemplate>
        );
      }
      case AccountSubscriptionStatus.PastDue: {
        return (
          <BannerTemplate color="danger">
            <p>
              Your subscription is past due. Please update your payment method.
            </p>
            {userIsAdmin && (
              <ManageButton
                stripeCustomerId={stripeCustomerId ?? null}
                accountId={account.id}
              >
                Update payment method
              </ManageButton>
            )}
          </BannerTemplate>
        );
      }
      case AccountSubscriptionStatus.Unpaid: {
        return (
          <BannerTemplate color="danger">
            <p>
              Your subscription is unpaid. Please proceed to payment to retain
              access to team features.
            </p>
            {userIsAdmin && (
              <ManageButton
                stripeCustomerId={stripeCustomerId ?? null}
                accountId={account.id}
              >
                Proceed to payment
              </ManageButton>
            )}
          </BannerTemplate>
        );
      }
      case AccountSubscriptionStatus.TrialExpired: {
        return (
          <BannerTemplate color="danger">
            <p>
              Your trial has expired. Subscribe to Pro plan to use team
              features.
            </p>
            {userIsAdmin && (
              <ManageButton
                stripeCustomerId={stripeCustomerId ?? null}
                accountId={account.id}
              >
                Subscribe
              </ManageButton>
            )}
          </BannerTemplate>
        );
      }
      case AccountSubscriptionStatus.Canceled: {
        return (
          <BannerTemplate color="danger">
            <p>Subscribe to Pro plan to use team features.</p>
            {userIsAdmin && (
              <ManageButton
                stripeCustomerId={stripeCustomerId ?? null}
                accountId={account.id}
              >
                Subscribe
              </ManageButton>
            )}
          </BannerTemplate>
        );
      }
    }

    return null;
  },
);
