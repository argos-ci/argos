import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Button, ButtonProps } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Modal } from "@/ui/Modal";

import { logout } from "../Auth";

const _UserFragment = graphql(`
  fragment UserDelete_User on User {
    id
    slug
    subscription {
      id
      status
      endDate
    }
  }
`);

type ConfirmDeleteInputs = {
  slugConfirm: string;
  verify: string;
};

const DeleteUserMutation = graphql(`
  mutation DeleteUserMutation($userAccountId: ID!) {
    deleteUser(input: { accountId: $userAccountId })
  }
`);

function DeleteButton(props: Omit<ButtonProps, "variant" | "children">) {
  return (
    <Button variant="destructive" {...props}>
      Delete
    </Button>
  );
}

type DeleteUserButtonProps = {
  userAccountId: string;
  userSlug: string;
};

function DeleteUserButton(props: DeleteUserButtonProps) {
  return (
    <DialogTrigger>
      <DeleteButton />
      <Modal>
        <UserDeleteDialog {...props} />
      </Modal>
    </DialogTrigger>
  );
}

function UserDeleteDialog(props: DeleteUserButtonProps) {
  const client = useApolloClient();
  const form = useForm<ConfirmDeleteInputs>({
    defaultValues: {
      slugConfirm: "",
      verify: "",
    },
  });
  const onSubmit: SubmitHandler<ConfirmDeleteInputs> = async () => {
    await client.mutate({
      mutation: DeleteUserMutation,
      variables: {
        userAccountId: props.userAccountId,
      },
    });
    logout();
  };
  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogText>
            Argos will <strong>delete all of your Account's projects</strong>,
            along with all of its Builds, Screenshots, Screenshot Diffs,
            Settings and other resources belonging to your Account.
          </DialogText>
          <DialogText>
            Argos recommends that you transfer projects you want to keep to a
            Team before deleting this Account.
          </DialogText>
          <div className="bg-danger-hover text-danger-low my-4 rounded-sm p-2">
            <strong>Warning:</strong> This action is not reversible. Please be
            certain.
          </div>
          <FormTextInput
            control={form.control}
            {...form.register("slugConfirm", {
              validate: (value) => {
                if (value !== props.userSlug) {
                  return "Account name does not match";
                }
                return true;
              },
            })}
            className="mb-4"
            autoFocus
            label={
              <>
                Enter the user name <strong>{props.userSlug}</strong> to
                continue:
              </>
            }
          />
          <FormTextInput
            control={form.control}
            {...form.register("verify", {
              validate: (value) => {
                if (value !== "delete my account") {
                  return "Please type 'delete my account' to confirm";
                }
                return true;
              },
            })}
            label={
              <>
                To verify, type <strong>delete my account</strong> below:
              </>
            }
          />
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} />
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control} variant="destructive">
            Delete
          </FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

export function UserDelete(props: {
  user: DocumentType<typeof _UserFragment>;
}) {
  const { user } = props;
  return (
    <Card intent="danger">
      <CardBody>
        <CardTitle>Delete Account</CardTitle>
        <CardParagraph>
          Permanently remove your account and all of its contents from the Argos
          platform. This action is not reversible — please continue with
          caution.
        </CardParagraph>
      </CardBody>
      <CardFooter className="flex items-center justify-end">
        <DeleteUserButton userAccountId={user.id} userSlug={user.slug} />
      </CardFooter>
    </Card>
  );
}
