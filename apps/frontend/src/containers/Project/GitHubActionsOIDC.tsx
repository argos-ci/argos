import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { Link } from "@/ui/Link";

import {
  ConnectedRepository,
  ConnectRepositoryButton,
  isGithubRepositoryConnected,
} from "./ConnectedRepository";

const _ProjectFragment = graphql(`
  fragment ProjectGitHubActionsOIDC_Project on Project {
    id
    githubActionsOidcEnabled
    ...ConnectedRepository_Project
  }
`);

const UpdateProjectMutation = graphql(`
  mutation ProjectGitHubActionsOIDC_updateProject(
    $projectId: ID!
    $githubActionsOidcEnabled: Boolean
  ) {
    updateProject(
      input: {
        id: $projectId
        githubActionsOidcEnabled: $githubActionsOidcEnabled
      }
    ) {
      id
      githubActionsOidcEnabled
    }
  }
`);

type Inputs = {
  githubActionsOidcEnabled: boolean;
};

export function ProjectGitHubActionsOIDC(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const client = useApolloClient();
  const eligible = isGithubRepositoryConnected(project);
  const form = useForm<Inputs>({
    defaultValues: {
      githubActionsOidcEnabled: project.githubActionsOidcEnabled,
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectMutation,
      variables: {
        projectId: project.id,
        githubActionsOidcEnabled: data.githubActionsOidcEnabled,
      },
    });
    form.reset(data);
  };

  const title = <CardTitle>GitHub Actions OIDC</CardTitle>;
  const description = (
    <CardParagraph>
      Allow GitHub Actions workflows to authenticate with Argos using
      short-lived OpenID Connect tokens instead of the project token.
    </CardParagraph>
  );
  const learnMore = (
    <>
      Learn more about{" "}
      <Link
        href="https://argos-ci.com/docs/learn/integrations/github-oidc-authentication"
        target="_blank"
      >
        GitHub Actions OIDC
      </Link>
      .
    </>
  );

  if (!eligible) {
    return (
      <Card>
        <CardBody>
          {title}
          {description}
          <ConnectedRepository project={project} />
        </CardBody>
        <CardFooter className="flex items-center justify-between gap-4">
          <div>{learnMore}</div>
          <ConnectRepositoryButton project={project} />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          {title}
          {description}
          <ConnectedRepository project={project} className="mb-4" />
          <FormSwitch
            control={form.control}
            name="githubActionsOidcEnabled"
            label="Enable GitHub Actions OIDC"
          />
        </CardBody>
        <FormCardFooter control={form.control}>{learnMore}</FormCardFooter>
      </Form>
    </Card>
  );
}
