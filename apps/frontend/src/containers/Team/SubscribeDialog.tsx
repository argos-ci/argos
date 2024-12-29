import { useState } from "react";

import { AccountSelector } from "@/containers/AccountSelector";
import { useSafeQuery } from "@/containers/Apollo";
import { graphql } from "@/gql";
import { AccountSubscriptionStatus } from "@/gql/graphql";
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
  const { data } = useSafeQuery(MeQuery);
  const [accountId, setAccountId] = useState(initialAccountId);
  const hasSubscribedToTrial = Boolean(data?.me?.hasSubscribedToTrial);
  const teams = data?.me ? data.me.teams : null;
  const team = teams?.find((a) => a.id === accountId);
  const sortedTeams = teams
    ? Array.from(teams).sort((a, b) => {
        const aActive =
          a.subscriptionStatus === AccountSubscriptionStatus.Active;
        const bActive =
          b.subscriptionStatus === AccountSubscriptionStatus.Active;
        if (aActive && !bActive) {
          return 1;
        }
        if (!aActive && bActive) {
          return -1;
        }
        return 0;
      })
    : null;
  const disabledAccountIds = teams
    ? teams
        .filter(
          (a) => a.subscriptionStatus === AccountSubscriptionStatus.Active,
        )
        .map((a) => a.id)
    : [];

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
                disabledAccountIds={disabledAccountIds}
                disabledTooltip="This team already has a paid plan."
                value={accountId}
                setValue={setAccountId}
              />
            </div>

            <p className="text mt-4 font-medium">
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
              accountId={accountId}
              successUrl={
                team
                  ? new URL(
                      `/${team.slug}?checkout=success`,
                      window.location.origin,
                    ).href
                  : window.location.href
              }
              cancelUrl={
                team
                  ? new URL(
                      `/${team.slug}?checkout=cancel`,
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
