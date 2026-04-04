import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";

const DeleteUserAccessTokenMutation = graphql(`
  mutation DeleteUserAccessToken($input: DeleteUserAccessTokenInput!) {
    deleteUserAccessToken(input: $input) {
      id
      userAccessTokens {
        id
        name
        createdAt
        expireAt
        lastUsedAt
        source
        scope {
          id
          name
          slug
        }
      }
    }
  }
`);

type DeleteTokenDialogProps = {
  id: string;
  name: string;
};

export function DeleteTokenDialog(props: DeleteTokenDialogProps) {
  const state = useOverlayTriggerState();
  const [deleteToken, { loading, error }] = useMutation(
    DeleteUserAccessTokenMutation,
    {
      variables: { input: { id: props.id } },
      onCompleted: () => {
        state.close();
        toast.success("Token deleted");
      },
    },
  );
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Delete Token</DialogTitle>
        <DialogText>
          The token <strong>{props.name}</strong> will be permanently deleted.
          Any applications using it will no longer be able to authenticate.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {error && (
          <ErrorMessage className="flex-1">{error.message}</ErrorMessage>
        )}
        <DialogDismiss isDisabled={loading}>Cancel</DialogDismiss>
        <Button
          variant="destructive"
          isPending={loading}
          onPress={() => {
            deleteToken();
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
