import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { Link } from "@/ui/Link";

import { DeploymentAuthentication } from "./DeploymentAuthentication";
import { ProductionDeploymentBranch } from "./ProductionDeploymentBranch";
import { ProductionDomain } from "./ProductionDomain";

const _ProjectFragment = graphql(`
  fragment ProjectDeployments_Project on Project {
    id
    deploymentEnabled
    ...DeploymentAuthentication_Project
    ...ProductionDomain_Project
    ...ProductionDeploymentBranch_Project
  }
`);

const UpdateProjectMutation = graphql(`
  mutation Deployments_updateProject(
    $projectId: ID!
    $deploymentEnabled: Boolean
  ) {
    updateProject(
      input: { id: $projectId, deploymentEnabled: $deploymentEnabled }
    ) {
      id
      deploymentEnabled
    }
  }
`);

export function ProjectDeployments(props: {
  project: DocumentType<typeof _ProjectFragment>;
  isTeam: boolean;
}) {
  const { project, isTeam } = props;
  return (
    <>
      <DeploymentsCard project={project} />
      {project.deploymentEnabled && (
        <>
          <DeploymentAuthentication project={project} isTeam={isTeam} />
          <ProductionDomain project={project} />
          <ProductionDeploymentBranch project={project} />
        </>
      )}
    </>
  );
}

type Inputs = {
  deploymentEnabled: boolean;
};

function DeploymentsCard(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      deploymentEnabled: project.deploymentEnabled,
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectMutation,
      variables: {
        projectId: project.id,
        deploymentEnabled: data.deploymentEnabled,
      },
    });
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Deployments</CardTitle>
          <CardParagraph>
            Deploy static environments like Storybook and review them on
            dedicated URLs.
          </CardParagraph>
          <FormSwitch
            control={form.control}
            name="deploymentEnabled"
            label="Enable deployments for this project"
          />
        </CardBody>
        <FormCardFooter control={form.control}>
          Learn more about{" "}
          <Link href="https://argos-ci.com/docs/deployments" target="_blank">
            deployments
          </Link>
          .
        </FormCardFooter>
      </Form>
    </Card>
  );
}
