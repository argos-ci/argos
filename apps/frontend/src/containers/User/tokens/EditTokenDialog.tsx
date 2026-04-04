import { useApolloClient } from "@apollo/client/react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

import { graphql } from "@/gql";
import {
  Dialog,
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

const UpdateUserAccessTokenMutation = graphql(`
  mutation UpdateUserAccessToken($input: UpdateUserAccessTokenInput!) {
    updateUserAccessToken(input: $input) {
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
`);

type Inputs = {
  name: string;
};

type EditTokenDialogProps = {
  id: string;
  name: string;
};

export function EditTokenDialog(props: EditTokenDialogProps) {
  const { id, name } = props;
  const state = useOverlayTriggerState();
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: { name },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateUserAccessTokenMutation,
      variables: { input: { id, name: data.name } },
    });
    toast.success("Token name updated");
    state.close();
  };

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Rename Token</DialogTitle>
          <DialogText>
            Choose a clearer name to recognize this token.
          </DialogText>
          <FormTextInput
            control={form.control}
            {...form.register("name", {
              required: "Token name is required",
            })}
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
