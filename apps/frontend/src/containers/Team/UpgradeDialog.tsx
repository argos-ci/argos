import { useState } from "react";

import { AccountSelector } from "@/containers/AccountSelector";
import { useQuery } from "@/containers/Apollo";
import { graphql } from "@/gql";
import { Button, ButtonColor, ButtonVariant } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDisclosure,
  DialogDismiss,
  DialogFooter,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { FormLabel } from "@/ui/FormLabel";
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
        hasPaidPlan
        ...AccountItem_Account
      }
    }
  }
`);

export const TeamUpgradeDialogButton = ({
  children,
  initialAccountId,
  color = "primary",
  variant = "contained",
}: {
  initialAccountId: string;
  children?: React.ReactNode;
  color?: ButtonColor;
  variant?: ButtonVariant;
}) => {
  const { data } = useQuery(MeQuery);
  const dialog = useDialogState();
  const [accountId, setAccountId] = useState(initialAccountId);
  const hasSubscribedToTrial = Boolean(data?.me?.hasSubscribedToTrial);
  const teams = data?.me ? data.me.teams : null;
  const team = teams?.find((a) => a.id === accountId);
  const sortedTeams = teams
    ? [...teams].sort((a, b) => {
        if (a.hasPaidPlan && !b.hasPaidPlan) return 1;
        if (!a.hasPaidPlan && b.hasPaidPlan) return -1;
        return 0;
      })
    : null;
  const disabledAccountIds = teams
    ? teams.filter((a) => a.hasPaidPlan).map((a) => a.id)
    : [];

  return (
    <>
      <DialogDisclosure state={dialog}>
        {(disclosureProps) => (
          <Button {...disclosureProps} color={color} variant={variant}>
            {children || "Upgrade"}
          </Button>
        )}
      </DialogDisclosure>

      <Dialog state={dialog} className="w-[36rem]">
        <DialogBody>
          <DialogTitle>Upgrade to Pro plan</DialogTitle>

          <div className="my-4">
            <FormLabel>Team to upgrade</FormLabel>
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
    </>
  );
};
