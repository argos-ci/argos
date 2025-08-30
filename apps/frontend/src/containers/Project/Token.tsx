import { ComponentProps, useEffect, useRef } from "react";
import { useApolloClient } from "@apollo/client";
import { DialogTrigger } from "react-aria-components";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { useProjectOutletContext } from "@/pages/Project/ProjectOutletContext";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Code } from "@/ui/Code";
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
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";
import { Modal } from "@/ui/Modal";
import { Pre } from "@/ui/Pre";
import { usePrevious } from "@/ui/usePrevious";

const _ProjectFragment = graphql(`
  fragment ProjectToken_Project on Project {
    id
    token
    name
    account {
      id
      slug
    }
  }
`);

export function ProjectToken(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;

  // The user may not have permission
  if (!project.token) {
    return null;
  }

  return (
    <Card>
      <CardBody>
        <CardTitle>Upload token</CardTitle>
        <CardParagraph>
          Use this <Code>ARGOS_TOKEN</Code> to authenticate your project when
          you send screenshots to Argos.
        </CardParagraph>
        <ProjectTokenPre projectId={project.id} token={project.token} />
        <CardParagraph>
          <strong>
            This token should be kept secret. Do not expose it publicly.
          </strong>
        </CardParagraph>
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <div>
          Read{" "}
          <Link href="https://argos-ci.com/docs" target="_blank">
            Argos documentation
          </Link>{" "}
          for more information about installing and using it.
        </div>
        <RegenerateTokenButton
          projectId={project.id}
          projectSlug={`${project.account.slug}/${project.name}`}
        />
      </CardFooter>
    </Card>
  );
}

function RegenerateTokenButton(
  props: ComponentProps<typeof RegenerateTokenDialog>,
) {
  const { permissions } = useProjectOutletContext();
  const hasAdminPermission = permissions.includes(ProjectPermission.Admin);
  if (!hasAdminPermission) {
    return null;
  }
  return (
    <DialogTrigger>
      <Button variant="secondary">Regenerate token</Button>
      <Modal>
        <Dialog size="medium">
          <RegenerateTokenDialog {...props} />
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}

function ProjectTokenPre(props: { token: string; projectId: string }) {
  const { token, projectId } = props;
  const copyRef = useRef<() => void>(null);
  const previous = usePrevious({ projectId, token });
  // Copy the token when it has been changed.
  useEffect(() => {
    if (!previous) {
      return;
    }

    // Token has changed.
    if (previous.projectId === projectId && previous.token !== token) {
      copyRef.current?.();
    }
  }, [token, projectId, previous]);
  return <Pre code={token} copyRef={copyRef} />;
}

const RegenerateTokenMutation = graphql(`
  mutation RegenerateTokenMutation($projectId: ID!) {
    regenerateProjectToken(id: $projectId) {
      id
      token
    }
  }
`);

type RenerateTokenInputs = {
  slug: string;
};

function RegenerateTokenDialog(props: {
  projectId: string;
  projectSlug: string;
}) {
  const { projectId, projectSlug } = props;
  const client = useApolloClient();
  const state = useOverlayTriggerState();
  const form = useForm<RenerateTokenInputs>({
    defaultValues: { slug: "" },
  });
  const onSubmit: SubmitHandler<RenerateTokenInputs> = async () => {
    await client.mutate({
      mutation: RegenerateTokenMutation,
      variables: {
        projectId,
      },
    });
    state.close();
  };
  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Regenerate token</DialogTitle>
          <DialogText>
            Regenerating the token if you suspect it has been compromised.
          </DialogText>
          <div className="bg-danger-hover text-danger-low my-4 rounded-sm p-2">
            <strong>Warning:</strong> By regenerating the token, the current
            token will be invalidated immediately.
          </div>
          <FormTextInput
            control={form.control}
            {...form.register("slug", {
              validate: (value) => {
                if (value !== projectSlug) {
                  return "Project name does not match";
                }
                return true;
              },
            })}
            autoFocus
            className="mb-4"
            label={
              <>
                Enter the project name <strong>{projectSlug}</strong> to
                continue:
              </>
            }
          />
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control} variant="destructive">
            Regenerate
          </FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}
