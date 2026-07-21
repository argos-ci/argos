import { useMutation } from "@apollo/client/react";

import { SAML_SSO_PRICING } from "@/constants";
import { AddOnsPricingTable } from "@/containers/Team/AddOnsPricingTable";
import { DocumentType, graphql } from "@/gql";
import { AccountSubscriptionStatus } from "@/gql/graphql";
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
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";

const _TeamFragment = graphql(`
  fragment SAMLSSOAddOn_Team on Team {
    id
    samlPurchased
    subscriptionStatus
    plan {
      id
      samlIncluded
      usageBased
    }
    ...AddOnsPricingTable_Team
  }
`);

const EnableSAMLSSOMutation = graphql(`
  mutation SAMLSSOAddOn_enableSAMLSSOOnTeam($teamAccountId: ID!) {
    enableSAMLSSOOnTeam(input: { teamAccountId: $teamAccountId }) {
      id
      ...SAMLSSOAddOn_Team
    }
  }
`);

const DisableSAMLSSOMutation = graphql(`
  mutation SAMLSSOAddOn_disableSAMLSSOOnTeam($teamAccountId: ID!) {
    disableSAMLSSOOnTeam(input: { teamAccountId: $teamAccountId }) {
      id
      ...SAMLSSOAddOn_Team
    }
  }
`);

export function EnableSAMLSSOAddOnButton(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const hasActiveSubscription =
    team.subscriptionStatus === AccountSubscriptionStatus.Active;
  const disabledReason = !hasActiveSubscription
    ? "You must have an active subscription to enable SAML SSO."
    : !team.plan?.usageBased
      ? "This feature is not available on your current plan, please contact us."
      : undefined;
  if (disabledReason) {
    return (
      <Tooltip content={disabledReason}>
        <div className="flex">
          <Button isDisabled>Enable</Button>
        </div>
      </Tooltip>
    );
  }
  return (
    <DialogTrigger>
      <Button>Enable</Button>
      <Modal>
        <EnableSAMLSSODialog team={team} />
      </Modal>
    </DialogTrigger>
  );
}

function EnableSAMLSSODialog(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const [enable, { error }] = useMutation(EnableSAMLSSOMutation, {
    variables: {
      teamAccountId: props.team.id,
    },
    refetchQueries: ["AccountSettings_account"],
  });
  return (
    <Dialog size="medium">
      {({ close }) => (
        <>
          <DialogBody>
            <DialogTitle>SAML SSO</DialogTitle>
            <DialogText>
              By clicking <strong>Confirm and Pay</strong>, the amount of{" "}
              <strong>${SAML_SSO_PRICING}</strong> will be added to your
              subscription and your credit card will be charged at the end of
              your next billing cycle.
            </DialogText>
            <AddOnsPricingTable team={props.team} enabling="saml-sso" />
          </DialogBody>
          <DialogFooter>
            {error && <ErrorMessage>{getErrorMessage(error)}</ErrorMessage>}
            <DialogDismiss>Cancel</DialogDismiss>
            <DialogActionButton
              onAction={async () => {
                try {
                  await enable();
                  close();
                } catch {
                  // Ignore
                }
              }}
            >
              Confirm and Pay
            </DialogActionButton>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}

export function DisableSAMLSSOAddOnButton(props: { teamAccountId: string }) {
  const [disable, { error }] = useMutation(DisableSAMLSSOMutation, {
    variables: {
      teamAccountId: props.teamAccountId,
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
                <DialogTitle>Disable SAML Single Sign-On</DialogTitle>
                <DialogText>
                  Team members will no longer be able to sign in with SAML and
                  the add-on will be removed from your subscription.
                </DialogText>
              </DialogBody>
              <DialogFooter>
                {error && <ErrorMessage>{getErrorMessage(error)}</ErrorMessage>}
                <DialogDismiss>Cancel</DialogDismiss>
                <DialogActionButton
                  onAction={async () => {
                    await disable()
                      .then(() => close())
                      .catch(() => {});
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
