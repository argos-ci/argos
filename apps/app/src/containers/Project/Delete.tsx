import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
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
  DialogDisclosure,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";

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

const DeleteProjectButton = (props: DeleteProjectButtonProps) => {
  const dialog = useDialogState();
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
    window.location.replace(`/${props.accountSlug}`);
  };
  const slug = `${props.accountSlug}/${props.projectName}`;
  return (
    <>
      <DialogDisclosure state={dialog}>
        {(disclosureProps) => (
          <Button {...disclosureProps} color="danger">
            Delete
          </Button>
        )}
      </DialogDisclosure>
      <Dialog state={dialog} style={{ width: 560 }}>
        <FormProvider {...form}>
          <Form onSubmit={onSubmit}>
            <DialogBody>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogText>
                This project will be deleted, along with all of its Builds,
                Screenshots, Screenshot Diffs, and Settings.
              </DialogText>
              <div className="my-8 rounded bg-danger-600 p-2">
                <strong>Warning:</strong> This action is not reversible. Please
                be certain.
              </div>
              <FormTextInput
                {...form.register("name", {
                  validate: (value) => {
                    if (value !== slug) {
                      return "Project name does not match";
                    }
                    return true;
                  },
                })}
                className="mb-4"
                label={
                  <>
                    Enter the project name <strong>{slug}</strong> to continue:
                  </>
                }
              />
              <FormTextInput
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
              <FormSubmit color="danger">Delete</FormSubmit>
            </DialogFooter>
          </Form>
        </FormProvider>
      </Dialog>
    </>
  );
};

const ProjectFragment = graphql(`
  fragment ProjectDelete_Project on Project {
    id
    name
    account {
      id
      slug
    }
  }
`);

export type ProjectDeleteProps = {
  project: FragmentType<typeof ProjectFragment>;
};

export const ProjectDelete = (props: ProjectDeleteProps) => {
  const project = useFragment(ProjectFragment, props.project);
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
};
