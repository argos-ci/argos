import { useMutation } from "@apollo/client/react";

import { STATIC_IP_PRICING } from "@/constants";
import { AddOnsPricingTable } from "@/containers/Team/AddOnsPricingTable";
import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogActionButton,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";
import { getAddOnBlockedReason } from "@/util/subscription";

const _TeamFragment = graphql(`
  fragment StaticIpAddOn_Team on Team {
    id
    staticIpEnabled
    subscriptionStatus
    subscription {
      id
      provider
    }
    plan {
      id
      staticIpIncluded
      usageBased
      interval
    }
    ...AddOnsPricingTable_Team
  }
`);

const EnableStaticIpMutation = graphql(`
  mutation StaticIpAddOn_enableStaticIpOnTeam($teamAccountId: ID!) {
    enableStaticIpOnTeam(input: { teamAccountId: $teamAccountId }) {
      id
      ...StaticIpAddOn_Team
    }
  }
`);

const DisableStaticIpMutation = graphql(`
  mutation StaticIpAddOn_disableStaticIpOnTeam($teamAccountId: ID!) {
    disableStaticIpOnTeam(input: { teamAccountId: $teamAccountId }) {
      id
      ...StaticIpAddOn_Team
    }
  }
`);

export function EnableStaticIpButton(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const disabledReason =
    getAddOnBlockedReason({
      status: team.subscriptionStatus,
      provider: team.subscription?.provider,
      interval: team.plan?.interval,
      includedInPlan: Boolean(team.plan?.staticIpIncluded),
      usageBased: Boolean(team.plan?.usageBased),
      featureName: "Static IP",
    }) ?? undefined;
  if (disabledReason) {
    return (
      <Tooltip content={disabledReason}>
        <div className="flex">
          <Button disabled>Enable</Button>
        </div>
      </Tooltip>
    );
  }
  return (
    <DialogTrigger>
      <Button>Enable</Button>
      <Modal>
        <EnableStaticIpDialog team={team} />
      </Modal>
    </DialogTrigger>
  );
}

function EnableStaticIpDialog(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const included = Boolean(team.plan?.staticIpIncluded);
  const [enable, { error }] = useMutation(EnableStaticIpMutation, {
    variables: {
      teamAccountId: team.id,
    },
    refetchQueries: ["AccountSettings_account"],
  });
  return (
    <Dialog size="medium">
      {({ close }) => (
        <>
          <DialogBody>
            <DialogTitle>Static IP</DialogTitle>
            <DialogText>
              Argos will reach GitHub from its static IP addresses for the
              organizations your projects use, so that an organization with an
              IP allow list can let it through.
            </DialogText>
            {included ? (
              <DialogText>Static IP is included in your plan.</DialogText>
            ) : (
              <>
                <DialogText>
                  By clicking <strong>Confirm and Pay</strong>, the amount of{" "}
                  <strong>${STATIC_IP_PRICING}</strong> will be added to your
                  subscription and your credit card will be charged at the end
                  of your next billing cycle.
                </DialogText>
                <AddOnsPricingTable team={team} enabling="static-ip" />
              </>
            )}
          </DialogBody>
          <DialogFooter>
            {error && <ErrorMessage>{getErrorMessage(error)}</ErrorMessage>}
            <DialogDismiss>Cancel</DialogDismiss>
            <DialogActionButton
              onAsyncAction={async () => {
                try {
                  await enable();
                  toast.success("Static IP enabled", {
                    id: "static-ip-enabled",
                  });
                  close();
                } catch {
                  // Rendered by the error message above.
                }
              }}
            >
              {included ? "Enable" : "Confirm and Pay"}
            </DialogActionButton>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}

export function DisableStaticIpButton(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const [disable, { error }] = useMutation(DisableStaticIpMutation, {
    variables: {
      teamAccountId: team.id,
    },
    refetchQueries: ["AccountSettings_account"],
  });
  return (
    <DialogTrigger>
      <Button variant="secondary">Disable</Button>
      <Modal>
        <Dialog role="alertdialog">
          {({ close }) => (
            <>
              <DialogBody>
                <DialogTitle>Disable Static IP</DialogTitle>
                <DialogText>
                  Argos will reach GitHub from changing IP addresses again: a
                  GitHub organization whose IP allow list relies on the static
                  ones will block it.
                  {team.plan?.staticIpIncluded
                    ? null
                    : " The add-on will be removed from your subscription."}
                </DialogText>
              </DialogBody>
              <DialogFooter>
                {error && <ErrorMessage>{getErrorMessage(error)}</ErrorMessage>}
                <DialogDismiss>Cancel</DialogDismiss>
                <DialogActionButton
                  variant="destructive"
                  onAsyncAction={async () => {
                    try {
                      await disable();
                      toast.success("Static IP disabled", {
                        id: "static-ip-disabled",
                      });
                      close();
                    } catch {
                      // Rendered by the error message above.
                    }
                  }}
                >
                  Disable
                </DialogActionButton>
              </DialogFooter>
            </>
          )}
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}
