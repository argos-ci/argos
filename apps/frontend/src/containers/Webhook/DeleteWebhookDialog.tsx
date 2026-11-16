import { useApolloClient } from "@apollo/client/react";

import { graphql } from "@/gql";
import {
  Dialog,
  DialogActionButton,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { toast } from "@/ui/Toaster";

export type WebhookDialogValue = {
  id: string;
  url: string;
};

const DeleteWebhookMutation = graphql(`
  mutation DeleteWebhook($input: DeleteWebhookInput!) {
    deleteWebhook(input: $input)
  }
`);

export function DeleteWebhookDialog(props: WebhookDialogValue) {
  const { id, url } = props;
  const state = useOverlayTriggerState();
  const client = useApolloClient();
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Delete Webhook</DialogTitle>
        <DialogText>
          Argos stops sending events to{" "}
          <strong className="break-all">{url}</strong>, including the deliveries
          waiting for a retry.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          variant="destructive"
          onAsyncAction={async () => {
            await client.mutate({
              mutation: DeleteWebhookMutation,
              variables: { input: { id } },
              update(cache) {
                cache.evict({
                  id: cache.identify({ __typename: "Webhook", id }),
                });
                cache.gc();
              },
            });
            state.close();
            toast.success("Webhook deleted", { id: "webhook-deleted" });
          }}
        >
          Delete
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}
