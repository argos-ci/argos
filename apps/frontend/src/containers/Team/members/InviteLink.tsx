import { useApolloClient } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { toast } from "sonner";

import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { CopyButton } from "@/ui/CopyButton";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";

const _TeamFragment = graphql(`
  fragment InviteLinkDialog_Team on Team {
    id
    inviteLink
  }
`);

export function InviteLinkDialog(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  invariant(team.inviteLink, "Team invite link is required");
  return (
    <Dialog>
      <DialogBody>
        <DialogTitle>Invite Link</DialogTitle>
        <DialogText>
          Allow other people to join your Team through the link below.
        </DialogText>

        <div className="mb-4 flex gap-2 rounded-sm border p-2">
          <pre className="w-0 flex-1 overflow-auto">
            <code>{team.inviteLink}</code>
          </pre>
          <CopyButton text={team.inviteLink} />
        </div>

        <ResetInviteLinkButton teamAccountId={team.id} />
      </DialogBody>
      <DialogFooter>
        <DialogDismiss single>Dismiss</DialogDismiss>
      </DialogFooter>
    </Dialog>
  );
}

const ResetInviteLinkMutation = graphql(`
  mutation ResetInviteLink($teamAccountId: ID!) {
    resetInviteLink(input: { teamAccountId: $teamAccountId }) {
      id
      ...InviteLinkDialog_Team
    }
  }
`);

function ResetInviteLinkButton(props: { teamAccountId: string }) {
  const client = useApolloClient();
  return (
    <Button
      onAction={async () => {
        await client.mutate({
          mutation: ResetInviteLinkMutation,
          variables: { teamAccountId: props.teamAccountId },
        });
        toast.success("Invite link reset successfully");
      }}
      variant="secondary"
      className="w-full justify-center"
    >
      Reset Invite Link
    </Button>
  );
}
