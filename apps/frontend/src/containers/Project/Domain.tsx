import { useApolloClient } from "@apollo/client/react";
import { SLUG_REGEX } from "@argos/util/slug";
import { DialogTrigger } from "react-aria-components";
import { SubmitHandler, useForm } from "react-hook-form";

import { config } from "@/config";
import { DocumentType, graphql } from "@/gql";
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
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";
import { Modal } from "@/ui/Modal";

import { getRepositoryLabel } from "../Repository";

const INTERNAL_DOMAIN_SUFFIX = config.deployments.baseDomain;

const _ProjectFragment = graphql(`
  fragment ProjectDomain_Project on Project {
    id
    domain
    deploymentEnabled
    customDeploymentProductionBranchGlob
    repository {
      __typename
      id
      defaultBranch
    }
  }
`);

const EnableProjectDeploymentsMutation = graphql(`
  mutation ProjectDomain_enableProjectDeployments($projectId: ID!) {
    enableProjectDeployments(projectId: $projectId) {
      id
      deploymentEnabled
    }
  }
`);

const DisableProjectDeploymentsMutation = graphql(`
  mutation ProjectDomain_disableProjectDeployments($projectId: ID!) {
    disableProjectDeployments(projectId: $projectId) {
      id
      deploymentEnabled
    }
  }
`);

const UpdateProjectDomainMutation = graphql(`
  mutation ProjectDomain_updateProjectDomain(
    $input: UpdateProjectDomainInput!
  ) {
    updateProjectDomain(input: $input) {
      id
      domain
    }
  }
`);

const UpdateProjectDeploymentBranchMutation = graphql(`
  mutation ProjectDomain_updateProject(
    $id: ID!
    $deploymentProductionBranchGlob: String
  ) {
    updateProject(
      input: {
        id: $id
        deploymentProductionBranchGlob: $deploymentProductionBranchGlob
      }
    ) {
      id
      customDeploymentProductionBranchGlob
    }
  }
`);

export function ProjectDomain(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;

  if (project.deploymentEnabled) {
    return <ProjectDeploymentsEnabled project={project} />;
  }

  return <ProjectDeploymentsDisabled project={project} />;
}

type Inputs = {
  domain: string;
  noCustomDeploymentProductionBranchGlob: boolean;
  deploymentProductionBranchGlob: string;
};

export function ProjectDeploymentsEnabled(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const client = useApolloClient();
  const defaultDeploymentProductionBranchGlob =
    project.repository?.defaultBranch || "main";
  const form = useForm<Inputs>({
    defaultValues: {
      domain: getDomainSlug(project.domain),
      noCustomDeploymentProductionBranchGlob:
        project.customDeploymentProductionBranchGlob === null,
      deploymentProductionBranchGlob:
        project.customDeploymentProductionBranchGlob ||
        defaultDeploymentProductionBranchGlob,
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const domain = `${data.domain}.${INTERNAL_DOMAIN_SUFFIX}`;

    const result = await client.mutate({
      mutation: UpdateProjectDomainMutation,
      variables: {
        input: {
          projectId: project.id,
          domain,
        },
      },
    });

    await client.mutate({
      mutation: UpdateProjectDeploymentBranchMutation,
      variables: {
        id: project.id,
        deploymentProductionBranchGlob:
          data.noCustomDeploymentProductionBranchGlob
            ? null
            : data.deploymentProductionBranchGlob,
      },
    });

    form.reset({
      ...data,
      domain: getDomainSlug(result.data?.updateProjectDomain.domain),
    });
  };

  const noCustomDeploymentProductionBranchGlob = form.watch(
    "noCustomDeploymentProductionBranchGlob",
  );
  const deploymentProductionBranchGlobFieldProps = form.register(
    "deploymentProductionBranchGlob",
    {
      required: { message: "Pattern required", value: true },
    },
  );

  return (
    <>
      <Card>
        <Form form={form} onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Deployments</CardTitle>
            <CardParagraph>
              Choose how Argos identifies and serves production deployments.
            </CardParagraph>
            <div className="flex flex-col gap-4">
              <Card>
                <CardBody>
                  <h3 className="mb-1 font-semibold">Production domain</h3>
                  <p className="text-low mb-4 text-sm">
                    Internal domain used to serve your production deployment.
                  </p>
                  <FormTextInput
                    control={form.control}
                    {...form.register("domain", {
                      required: "Please enter a domain slug",
                      maxLength: {
                        value: 48,
                        message: "Domain slugs must be 48 characters or less",
                      },
                      pattern: {
                        value: SLUG_REGEX,
                        message:
                          "Domain slugs must be lowercase, start and end with an alphanumeric character, and may contain dashes in the middle.",
                      },
                    })}
                    label="Production domain"
                    hiddenLabel
                    addon={`.${INTERNAL_DOMAIN_SUFFIX}`}
                    className="max-w-md"
                  />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <h3 className="mb-1 font-semibold">
                    Production deployment branch
                  </h3>
                  <p className="text-low text-sm">
                    Any deployment from a branch that matches the specified
                    pattern will be treated as a production deployment.
                  </p>
                  <div className="mt-4">
                    <FormSwitch
                      control={form.control}
                      name="noCustomDeploymentProductionBranchGlob"
                      label={
                        project.repository ? (
                          <>
                            Use{" "}
                            {getRepositoryLabel(project.repository.__typename)}{" "}
                            repository's default branch:{" "}
                            <Code>{defaultDeploymentProductionBranchGlob}</Code>
                          </>
                        ) : (
                          <>
                            Use <Code>main</Code> as production deployment
                            branch
                          </>
                        )
                      }
                    />
                    {!noCustomDeploymentProductionBranchGlob && (
                      <>
                        <FormTextInput
                          control={form.control}
                          {...deploymentProductionBranchGlobFieldProps}
                          ref={(element) => {
                            deploymentProductionBranchGlobFieldProps.ref(
                              element,
                            );
                            if (element) {
                              if (
                                !noCustomDeploymentProductionBranchGlob &&
                                form.formState.defaultValues
                                  ?.noCustomDeploymentProductionBranchGlob !==
                                  noCustomDeploymentProductionBranchGlob
                              ) {
                                element.focus();
                              }
                            }
                          }}
                          label="Production deployment branch pattern"
                          className="mt-4"
                        />
                        <p className="text-low mt-2 text-sm">
                          Use patterns like <Code>main</Code>,{" "}
                          <Code>{`{main,production}`}</Code>, or{" "}
                          <Code>release/**</Code>.
                        </p>
                      </>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          </CardBody>
          <FormCardFooter
            control={form.control}
            actions={<DisableProjectDeploymentsButton projectId={project.id} />}
          />
        </Form>
      </Card>
    </>
  );
}

function getDomainSlug(domain: string | null | undefined) {
  if (!domain) {
    return "";
  }

  const suffix = `.${INTERNAL_DOMAIN_SUFFIX}`;
  if (!domain.endsWith(suffix)) {
    return domain;
  }

  return domain.slice(0, -suffix.length);
}

export function ProjectDeploymentsDisabled(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;

  return (
    <Card>
      <CardBody>
        <CardTitle>Deployments</CardTitle>
        <CardParagraph>
          Enable deployments on this project to deploy static environments like
          Storybook.
        </CardParagraph>
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <div />
        <div className="flex items-center justify-end gap-4">
          <EnableProjectDeploymentsButton projectId={project.id} />
        </div>
      </CardFooter>
    </Card>
  );
}

function DisableProjectDeploymentsConfirmButton(props: { projectId: string }) {
  const { projectId } = props;
  const client = useApolloClient();
  const state = useOverlayTriggerState();

  return (
    <Button
      variant="destructive"
      onAction={async () => {
        await client.mutate({
          mutation: DisableProjectDeploymentsMutation,
          variables: {
            projectId,
          },
        });
        state.close();
      }}
    >
      Disable
    </Button>
  );
}

function DisableProjectDeploymentsButton(props: { projectId: string }) {
  const { projectId } = props;
  return (
    <DialogTrigger>
      <Button variant="secondary">Disable</Button>
      <Modal>
        <Dialog size="medium">
          <DialogBody>
            <DialogTitle>Disable Deployments</DialogTitle>
            <DialogText>
              Every deployment URL for this project will be made inaccessible
              until deployments are enabled again.
            </DialogText>
            <div className="bg-danger-hover text-danger-low my-4 rounded-sm p-2">
              <strong>Warning:</strong> This immediately affects existing
              deployment links.
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogDismiss>Cancel</DialogDismiss>
            <DisableProjectDeploymentsConfirmButton projectId={projectId} />
          </DialogFooter>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}

function EnableProjectDeploymentsButton(props: { projectId: string }) {
  const { projectId } = props;
  const client = useApolloClient();

  return (
    <Button
      onAction={async () => {
        await client.mutate({
          mutation: EnableProjectDeploymentsMutation,
          variables: {
            projectId,
          },
        });
      }}
    >
      Enable
    </Button>
  );
}
