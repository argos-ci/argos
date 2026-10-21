import { useId, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { KeyRoundIcon, TriangleAlertIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { CopyButton } from "@/ui/CopyButton";
import {
  Dialog,
  DialogActionButton,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useDialogValueState,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { Label } from "@/ui/Label";
import { Link } from "@/ui/Link";
import { Modal } from "@/ui/Modal";
import { Pre } from "@/ui/Pre";
import { TextInput, TextInputAddon, TextInputGroup } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";

const _TeamFragment = graphql(`
  fragment TeamSCIMProvisioning_Team on Team {
    id
    plan {
      id
      samlIncluded
    }
    samlPurchased
    scimBaseUrl
    scimToken {
      id
      createdAt
      lastUsedAt
    }
  }
`);

const GenerateTokenMutation = graphql(`
  mutation TeamSCIMProvisioning_generateToken($teamAccountId: ID!) {
    generateTeamScimToken(teamAccountId: $teamAccountId) {
      token
      team {
        id
        scimToken {
          id
          createdAt
          lastUsedAt
        }
      }
    }
  }
`);

const RevokeTokenMutation = graphql(`
  mutation TeamSCIMProvisioning_revokeToken($teamAccountId: ID!) {
    revokeTeamScimToken(teamAccountId: $teamAccountId) {
      id
      scimToken {
        id
      }
    }
  }
`);

type TokenDialog = "generate" | "regenerate" | "revoke";

export function TeamSCIMProvisioning(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const { scimToken } = team;
  const hasAccess = Boolean(team.plan?.samlIncluded || team.samlPurchased);
  const baseUrlId = useId();
  // Hosted here rather than under each button: generating or revoking the
  // token swaps the buttons, and would unmount the dialog still showing.
  const dialog = useDialogValueState<TokenDialog | null>(null);

  return (
    <Card>
      <CardBody>
        <CardTitle>SCIM Provisioning</CardTitle>
        <CardParagraph>
          Let your Identity Provider add people to the team when they are
          assigned to Argos, and remove them when they are unassigned or
          deactivated.
        </CardParagraph>
        <div className="border-thin rounded-lg text-sm">
          <div className="p-4">
            <Label htmlFor={baseUrlId}>SCIM base URL</Label>
            <TextInputGroup>
              <TextInput
                id={baseUrlId}
                readOnly
                value={team.scimBaseUrl}
                scale="sm"
              />
              <TextInputAddon>
                <CopyButton text={team.scimBaseUrl} />
              </TextInputAddon>
            </TextInputGroup>
          </div>
          <div className="border-t-thin flex items-center gap-4 p-4">
            <KeyRoundIcon className="size-6 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">
                {scimToken ? "SCIM token" : "No SCIM token"}
              </div>
              <p className="text-low">
                {scimToken ? (
                  <>
                    Generated <Time date={scimToken.createdAt} />,{" "}
                    {scimToken.lastUsedAt ? (
                      <>
                        last used <Time date={scimToken.lastUsedAt} />.
                      </>
                    ) : (
                      "never used."
                    )}
                  </>
                ) : (
                  "Generate a token for your Identity Provider to authenticate with."
                )}
              </p>
            </div>
            {scimToken ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={!hasAccess}
                  onClick={() => dialog.open("regenerate")}
                >
                  Regenerate
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => dialog.open("revoke")}
                >
                  Revoke
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                disabled={!hasAccess}
                onClick={() => dialog.open("generate")}
              >
                Generate token
              </Button>
            )}
          </div>
        </div>
      </CardBody>
      <CardFooter>
        {hasAccess ? null : "SCIM provisioning is part of SAML SSO. "}
        Learn more about{" "}
        <Link
          href="https://argos-ci.com/docs/learn/account-and-access/scim-provisioning"
          target="_blank"
        >
          SCIM provisioning
        </Link>
        .
      </CardFooter>
      {dialog.value ? (
        <Modal open={dialog.isOpen} onOpenChange={dialog.onOpenChange}>
          {dialog.value === "revoke" ? (
            <RevokeTokenDialog teamAccountId={team.id} />
          ) : (
            <GenerateTokenDialog
              teamAccountId={team.id}
              regenerate={dialog.value === "regenerate"}
            />
          )}
        </Modal>
      ) : null}
    </Card>
  );
}

function GenerateTokenDialog(props: {
  teamAccountId: string;
  regenerate: boolean;
}) {
  const { regenerate } = props;
  const client = useApolloClient();
  const [token, setToken] = useState<string | null>(null);

  if (token) {
    return (
      <Dialog size="medium">
        <DialogBody>
          <DialogTitle>SCIM Token Generated</DialogTitle>
          <DialogText>
            Set it in your Identity Provider as the bearer token, along with the
            SCIM base URL. It can add and remove members of your team:{" "}
            <span className="font-medium">keep it secure</span>.
          </DialogText>
          <Pre code={token} className="mt-4" />
          <div className="text-warning-low flex items-start gap-2 p-2 text-sm">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <p>Copy your token now. You won’t be able to see it again.</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>Close</DialogDismiss>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog size="medium" role={regenerate ? "alertdialog" : "dialog"}>
      <DialogBody>
        <DialogTitle>
          {regenerate ? "Regenerate SCIM Token" : "Generate SCIM Token"}
        </DialogTitle>
        <DialogText>
          {regenerate
            ? "The current token stops working right away: provisioning fails until you replace it in your Identity Provider."
            : "Your Identity Provider authenticates with this token to add and remove the members of your team."}
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          variant={regenerate ? "destructive" : undefined}
          onAsyncAction={async () => {
            const result = await client.mutate({
              mutation: GenerateTokenMutation,
              variables: { teamAccountId: props.teamAccountId },
            });
            invariant(result.data, "Expected mutation data");
            setToken(result.data.generateTeamScimToken.token);
          }}
        >
          {regenerate ? "Regenerate token" : "Generate token"}
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}

function RevokeTokenDialog(props: { teamAccountId: string }) {
  const client = useApolloClient();
  const state = useOverlayTriggerState();
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Revoke SCIM Token</DialogTitle>
        <DialogText>
          Your Identity Provider will no longer be able to add or remove
          members. The members it added stay in the team.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          variant="destructive"
          onAsyncAction={async () => {
            await client.mutate({
              mutation: RevokeTokenMutation,
              variables: { teamAccountId: props.teamAccountId },
            });
            state.close();
            toast.success("SCIM token revoked");
          }}
        >
          Revoke token
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}
