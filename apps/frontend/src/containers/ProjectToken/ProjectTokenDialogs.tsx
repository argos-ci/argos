import type { ApolloClient } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import { useForm, type SubmitHandler } from "react-hook-form";

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
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { toast } from "@/ui/Toaster";

export type ProjectTokenDialogValue = {
  id: string;
  name: string;
};

const UpdateProjectTokenMutation = graphql(`
  mutation UpdateProjectToken($input: UpdateProjectTokenInput!) {
    updateProjectToken(input: $input) {
      id
      name
    }
  }
`);

const DeleteProjectTokenMutation = graphql(`
  mutation DeleteProjectToken($input: DeleteProjectTokenInput!) {
    deleteProjectToken(input: $input)
  }
`);

export async function deleteProjectToken(client: ApolloClient, id: string) {
  await client.mutate({
    mutation: DeleteProjectTokenMutation,
    variables: { input: { id } },
    update(cache) {
      cache.evict({ id: cache.identify({ __typename: "ProjectToken", id }) });
      cache.gc();
    },
  });
}

export function RenameProjectTokenDialog(props: ProjectTokenDialogValue) {
  const { id, name } = props;
  const state = useOverlayTriggerState();
  const client = useApolloClient();
  const form = useForm<{ name: string }>({ defaultValues: { name } });

  const onSubmit: SubmitHandler<{ name: string }> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectTokenMutation,
      variables: { input: { id, name: data.name } },
    });
    toast.success("Token renamed", { id: "project-token-renamed" });
    state.close();
  };

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Rename Project Token</DialogTitle>
          <DialogText>
            Choose a clearer name to recognize this token.
          </DialogText>
          <FormTextInput
            control={form.control}
            {...form.register("name", { required: "Token name is required" })}
            autoFocus
            label="Token name"
          />
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} className="flex-1" />
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control} disableIfPristine>
            Save
          </FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

export function RevokeProjectTokenDialog(props: ProjectTokenDialogValue) {
  const { id, name } = props;
  const state = useOverlayTriggerState();
  const client = useApolloClient();
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Revoke Project Token</DialogTitle>
        <DialogText>
          CI using <strong>{name}</strong> will be rejected from its next
          upload. Make sure it already uses another token.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          variant="destructive"
          onAsyncAction={async () => {
            await deleteProjectToken(client, id);
            state.close();
            toast.success("Token revoked", { id: "project-token-revoked" });
          }}
        >
          Revoke
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}
