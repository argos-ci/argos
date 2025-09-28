import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { Button } from "@/ui/Button";
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
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Modal } from "@/ui/Modal";

type DeleteProjectButtonProps = {
  projectId: string;
  projectName: string;
  accountSlug: string;
};

type ConfirmDeleteInputs = {
  name: string;
  verify: string;
};

const DeleteProjectMutation = graphql(`
  mutation DeleteProjectMutation($projectId: ID!) {
    deleteProject(id: $projectId)
  }
`);

function DeleteProjectButton(props: DeleteProjectButtonProps) {
  const client = useApolloClient();
  const form = useForm<ConfirmDeleteInputs>({
    defaultValues: {
      name: "",
      verify: "",
    },
  });
  const onSubmit: SubmitHandler<ConfirmDeleteInputs> = async () => {
    await client.mutate({
      mutation: DeleteProjectMutation,
      variables: {
        projectId: props.projectId,
      },
    });
    window.location.replace(getAccountURL({ accountSlug: props.accountSlug }));
  };
  const slug = `${props.accountSlug}/${props.projectName}`;
  return (
    <DialogTrigger>
      <Button variant="destructive">Delete</Button>
      <Modal>
        <Dialog size="medium">
          <Form form={form} onSubmit={onSubmit}>
            <DialogBody>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogText>
                This project will be deleted, along with all of its Builds,
                Screenshots, Screenshot Diffs, and Settings.
              </DialogText>
              <div className="bg-danger-hover text-danger-low my-4 rounded-sm p-2">
                <strong>Warning:</strong> This action is not reversible. Please
                be certain.
              </div>
              <FormTextInput
                control={form.control}
                {...form.register("name", {
                  validate: (value) => {
                    if (value !== slug) {
                      return "Project name does not match";
                    }
                    return true;
                  },
                })}
                autoFocus
                className="mb-4"
                label={
                  <>
                    Enter the project name <strong>{slug}</strong> to continue:
                  </>
                }
              />
              <FormTextInput
                control={form.control}
                {...form.register("verify", {
                  validate: (value) => {
                    if (value !== "delete my project") {
                      return "Please type 'delete my project' to confirm";
                    }
                    return true;
                  },
                })}
                label={
                  <>
                    To verify, type <strong>delete my project</strong> below:
                  </>
                }
              />
            </DialogBody>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <FormSubmit control={form.control} variant="destructive">
                Delete
              </FormSubmit>
            </DialogFooter>
          </Form>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}

const _ProjectFragment = graphql(`
  fragment ProjectDelete_Project on Project {
    id
    name
    account {
      id
      slug
    }
  }
`);

export function ProjectDelete(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  return (
    <Card intent="danger">
      <CardBody>
        <CardTitle>Delete Project</CardTitle>
        <CardParagraph>
          The project will be permanently deleted, including its builds and
          screenshots. This action is irreversible and can not be undone.
        </CardParagraph>
      </CardBody>
      <CardFooter className="flex items-center justify-end">
        <DeleteProjectButton
          projectId={project.id}
          projectName={project.name}
          accountSlug={project.account.slug}
        />
      </CardFooter>
    </Card>
  );
}
