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
  fragment ProjectTokenlessAuth_Project on Project {
    id
    tokenlessAuthEnabled
    ...ConnectedRepository_Project
  }
`);

const UpdateProjectMutation = graphql(`
  mutation ProjectTokenlessAuth_updateProject(
    $projectId: ID!
    $tokenlessAuthEnabled: Boolean
  ) {
    updateProject(
      input: { id: $projectId, tokenlessAuthEnabled: $tokenlessAuthEnabled }
    ) {
      id
      tokenlessAuthEnabled
    }
  }
`);

type Inputs = {
  tokenlessAuthEnabled: boolean;
};

export function ProjectTokenlessAuth(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const client = useApolloClient();
  const eligible = isGithubRepositoryConnected(project);
  const form = useForm<Inputs>({
    defaultValues: {
      tokenlessAuthEnabled: project.tokenlessAuthEnabled,
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectMutation,
      variables: {
        projectId: project.id,
        tokenlessAuthEnabled: data.tokenlessAuthEnabled,
      },
    });
    form.reset(data);
  };

  const title = <CardTitle>Tokenless authentication</CardTitle>;
  const description = (
    <CardParagraph>
      Allow GitHub Actions workflows to authenticate without an{" "}
      <code>ARGOS_TOKEN</code> environment variable. Disable this if you want to
      require every CI run to set a project token explicitly.
    </CardParagraph>
  );
  const learnMore = (
    <>
      Learn more about{" "}
      <Link
        href="https://argos-ci.com/docs/learn/integrations/github-tokenless-authentication"
        target="_blank"
      >
        tokenless authentication
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
            name="tokenlessAuthEnabled"
            label="Enable tokenless authentication"
          />
        </CardBody>
        <FormCardFooter control={form.control}>{learnMore}</FormCardFooter>
      </Form>
    </Card>
  );
}
