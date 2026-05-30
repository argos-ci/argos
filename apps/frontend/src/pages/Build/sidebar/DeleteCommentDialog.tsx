import { useMutation } from "@apollo/client/react";

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
import { getErrorMessage } from "@/util/error";

const DeleteCommentMutation = graphql(`
  mutation DeleteCommentDialog_deleteComment($input: DeleteCommentInput!) {
    deleteComment(input: $input) {
      id
    }
  }
`);

export function DeleteCommentDialog(props: { commentId: string }) {
  const state = useOverlayTriggerState();
  const [deleteComment, { loading, error }] = useMutation(
    DeleteCommentMutation,
    {
      variables: { input: { id: props.commentId } },
      // Drop the comment from the cache so it leaves the list. `AnimatePresence`
      // in ReviewActivitySection plays its exit animation as it is removed.
      update: (cache) => {
        const cacheId = cache.identify({
          __typename: "Comment",
          id: props.commentId,
        });
        if (cacheId) {
          cache.evict({ id: cacheId });
          cache.gc();
        }
      },
      onCompleted: () => {
        state.close();
      },
    },
  );
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Delete this comment?</DialogTitle>
        <DialogText>You cannot undo this action.</DialogText>
      </DialogBody>
      <DialogFooter>
        {error && (
          <ErrorMessage className="flex-1">
            {getErrorMessage(error)}
          </ErrorMessage>
        )}
        <DialogDismiss isDisabled={loading}>Cancel</DialogDismiss>
        <Button
          variant="destructive"
          isPending={loading}
          onPress={() => {
            deleteComment().catch(() => {
              // Error is surfaced through the `error` state above.
            });
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
