import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { checkHasSubscriptionStatus } from "@argos/schemas/subscription-status";

import { AccountSelector } from "@/containers/AccountSelector";
import { graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { Button, ButtonProps } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/ui/Dialog";
import { Label } from "@/ui/Label";
import { Modal } from "@/ui/Modal";
import { StripeCheckoutButton } from "@/ui/StripeLink";

const MeQuery = graphql(`
  query UpgradeDialog_me {
    me {
      id
      slug
      hasSubscribedToTrial
      ...AccountItem_Account
      teams {
        id
        slug
        subscriptionStatus
        ...AccountItem_Account
      }
    }
  }
`);

export function TeamSubscribeDialog({
  children,
  initialAccountId,
  variant,
}: {
  initialAccountId: string;
  children?: React.ReactNode;
  variant?: ButtonProps["variant"];
}) {
  const { data, error } = useQuery(MeQuery);
  if (error) {
    throw error;
  }
  const [accountId, setAccountId] = useState(initialAccountId);
  const hasSubscribedToTrial = Boolean(data?.me?.hasSubscribedToTrial);
  const teams = data?.me ? data.me.teams : null;
  const team = teams?.find((a) => a.id === accountId);
  // Teams that already have a subscription sink to the bottom and cannot be
  // picked.
  const sortedTeams = teams
    ? Array.from(teams).sort((a, b) => {
        const aActive = checkHasSubscriptionStatus(a.subscriptionStatus);
        const bActive = checkHasSubscriptionStatus(b.subscriptionStatus);
        if (aActive && !bActive) {
          return 1;
        }
        if (!aActive && bActive) {
          return -1;
        }
        return 0;
      })
    : null;
  const disabledReasons = Object.fromEntries(
    (teams ?? [])
      .filter((a) => checkHasSubscriptionStatus(a.subscriptionStatus))
      .map((a) => [a.id, "Already subscribed"] as const),
  );

  return (
    <DialogTrigger>
      <Button variant={variant}>{children || "Subscribe"}</Button>
      <Modal>
        <Dialog size="medium">
          <DialogBody>
            <DialogTitle>Subscribe to Pro plan</DialogTitle>

            <div className="my-4">
              <Label>Team to subscribe</Label>
              <AccountSelector
                accounts={sortedTeams}
                disabledReasons={disabledReasons}
                value={accountId}
                setValue={setAccountId}
              />
            </div>

            <p className="text-default mt-4 font-medium">
              You will be redirected to Stripe to{" "}
              {!hasSubscribedToTrial
                ? "start a 14-day Pro plan trial"
                : "complete the subscription"}
              .
            </p>
          </DialogBody>

          <DialogFooter>
            <DialogDismiss>Cancel</DialogDismiss>

            <StripeCheckoutButton
              isDisabled={
                team
                  ? checkHasSubscriptionStatus(team.subscriptionStatus)
                  : false
              }
              accountId={accountId}
              successUrl={
                team
                  ? new URL(
                      `${getAccountURL({ accountSlug: team.slug })}?checkout=success`,
                      window.location.origin,
                    ).href
                  : window.location.href
              }
              cancelUrl={
                team
                  ? new URL(
                      `${getAccountURL({ accountSlug: team.slug })}?checkout=cancel`,
                      window.location.origin,
                    ).href
                  : window.location.href
              }
            >
              Continue
            </StripeCheckoutButton>
          </DialogFooter>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}
