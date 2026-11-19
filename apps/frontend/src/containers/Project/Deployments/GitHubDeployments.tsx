import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { Link } from "@/ui/Link";

const _ProjectFragment = graphql(`
  fragment GitHubDeployments_Project on Project {
    id
    githubDeploymentEnabled
  }
`);

const UpdateProjectMutation = graphql(`
  mutation GitHubDeployments_updateProject(
    $projectId: ID!
    $githubDeploymentEnabled: Boolean
  ) {
    updateProject(
      input: {
        id: $projectId
        githubDeploymentEnabled: $githubDeploymentEnabled
      }
    ) {
      id
      githubDeploymentEnabled
    }
  }
`);

type Inputs = {
  githubDeploymentEnabled: boolean;
};

export function GitHubDeployments(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      githubDeploymentEnabled: project.githubDeploymentEnabled,
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectMutation,
      variables: {
        projectId: project.id,
        githubDeploymentEnabled: data.githubDeploymentEnabled,
      },
    });
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>GitHub deployments</CardTitle>
          <CardParagraph>
            Report each deployment to your GitHub repository. Pull requests show
            a <strong>View deployment</strong> button, and your{" "}
            <Code>deployment_status</Code> workflows run when it is ready.
          </CardParagraph>
          <FormSwitch
            control={form.control}
            name="githubDeploymentEnabled"
            label="Create GitHub deployments"
          />
        </CardBody>
        <FormCardFooter control={form.control}>
          Learn more about{" "}
          <Link
            href="https://argos-ci.com/docs/learn/integrations/github-integration#github-deployments"
            external
            target="_blank"
          >
            GitHub deployments
          </Link>
          .
        </FormCardFooter>
      </Form>
    </Card>
  );
}
