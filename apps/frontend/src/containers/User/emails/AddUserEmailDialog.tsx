import { useApolloClient } from "@apollo/client";
import { InfoIcon } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { logout } from "@/containers/Auth";
import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
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
import { FormCheckbox } from "@/ui/FormCheckbox";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";

const AddUserEmailMutation = graphql(`
  mutation AddUserEmailMutation($email: String!) {
    addUserEmail(email: $email) {
      id
      emails {
        verified
        email
      }
    }
  }
`);

type Inputs = {
  email: string;
  confirm: boolean;
};

export function AddUserEmailDialog() {
  const state = useOverlayTriggerState();
  const form = useForm<Inputs>({
    defaultValues: {
      email: "",
      confirm: false,
    },
  });
  const serverError = form.formState.errors.root?.serverError;
  const client = useApolloClient();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: AddUserEmailMutation,
      variables: {
        email: data.email,
      },
    });
    state.close();
    toast.success("Verification email sent", {
      description: (
        <>
          Follow the verification link sent to <strong>{data.email}</strong> to
          continue.
        </>
      ),
    });
  };
  return (
    <Dialog size="medium" role="alertdialog">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Add Email</DialogTitle>
          <DialogText>
            Add a new email address to your account. This email, once verified,
            can be used to login to your account.
          </DialogText>
          <FormTextInput
            control={form.control}
            {...form.register("email", {
              validate: (value) => {
                if (!z.email().safeParse(value).success) {
                  return "Invalid email address";
                }
                return true;
              },
            })}
            autoFocus
            className="mb-4"
            label="Email"
            type="email"
          />
          <FormCheckbox
            control={form.control}
            name="confirm"
            label="I understand that this email will have access to my account"
            description="Anyone with access to this email address will have access to your account."
            rules={{
              required: "Required",
            }}
          />
          {serverError?.type === "ACCOUNT_EMAIL_ALREADY_EXISTS" ? (
            <Card className="bg-ui mt-4 flex gap-4 p-2">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <p>
                An account already exists with this email. Please remove this
                email from the other account, or delete the other account. Any
                existing resources you wish to keep must be transferred before
                the account deletion.
              </p>
              <Button className="self-center" onPress={() => logout()}>
                Switch account
              </Button>
            </Card>
          ) : null}
        </DialogBody>
        <DialogFooter>
          {serverError?.type === "ACCOUNT_EMAIL_ALREADY_EXISTS" ? null : (
            <FormRootError control={form.control} className="flex-1" />
          )}
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control}>Add</FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}
