import { useMutation } from "@apollo/client";
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

type DeleteUserEmailDialogProps = {
  email: string;
};

const DeleteUserEmailMutation = graphql(`
  mutation DeleteUserEmailMutation($email: String!) {
    deleteUserEmail(email: $email) {
      id
      emails {
        verified
        email
      }
    }
  }
`);

export function DeleteUserEmailDialog(props: DeleteUserEmailDialogProps) {
  const state = useOverlayTriggerState();
  const [deleteUserEmail, { loading, error }] = useMutation(
    DeleteUserEmailMutation,
    {
      variables: { email: props.email },
      onCompleted: () => {
        state.close();
        toast.success("Email deleted");
      },
    },
  );
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Delete Email</DialogTitle>
        <DialogText>
          The email <strong>{props.email}</strong> will be removed from your
          account.
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
            deleteUserEmail().catch(() => {
              // Ignore errors
            });
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
