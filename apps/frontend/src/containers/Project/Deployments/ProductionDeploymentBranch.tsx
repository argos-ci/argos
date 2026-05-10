import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";

import { getRepositoryLabel } from "../../Repository";

const _ProjectFragment = graphql(`
  fragment ProductionDeploymentBranch_Project on Project {
    id
    customDeploymentProductionBranchGlob
    repository {
      __typename
      id
      defaultBranch
    }
  }
`);

const UpdateProjectMutation = graphql(`
  mutation ProductionDeploymentBranch_updateProject(
    $projectId: ID!
    $deploymentProductionBranchGlob: String
  ) {
    updateProject(
      input: {
        id: $projectId
        deploymentProductionBranchGlob: $deploymentProductionBranchGlob
      }
    ) {
      id
      customDeploymentProductionBranchGlob
    }
  }
`);

type Inputs = {
  noCustomDeploymentProductionBranchGlob: boolean;
  deploymentProductionBranchGlob: string;
};

export function ProductionDeploymentBranch(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const client = useApolloClient();
  const defaultDeploymentProductionBranchGlob =
    project.repository?.defaultBranch || "main";
  const form = useForm<Inputs>({
    defaultValues: {
      noCustomDeploymentProductionBranchGlob:
        project.customDeploymentProductionBranchGlob === null,
      deploymentProductionBranchGlob:
        project.customDeploymentProductionBranchGlob ||
        defaultDeploymentProductionBranchGlob,
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectMutation,
      variables: {
        projectId: project.id,
        deploymentProductionBranchGlob:
          data.noCustomDeploymentProductionBranchGlob
            ? null
            : data.deploymentProductionBranchGlob,
      },
    });
    form.reset(data);
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
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Production deployment branch</CardTitle>
          <CardParagraph>
            Any deployment from a branch that matches the specified pattern
            will be treated as a production deployment.
          </CardParagraph>
          <FormSwitch
            control={form.control}
            name="noCustomDeploymentProductionBranchGlob"
            label={
              project.repository ? (
                <>
                  Use {getRepositoryLabel(project.repository.__typename)}{" "}
                  repository's default branch:{" "}
                  <Code>{defaultDeploymentProductionBranchGlob}</Code>
                </>
              ) : (
                <>
                  Use <Code>main</Code> as production deployment branch
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
                  deploymentProductionBranchGlobFieldProps.ref(element);
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
                <Code>{`{main,production}`}</Code>, or <Code>release/**</Code>.
              </p>
            </>
          )}
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
}
