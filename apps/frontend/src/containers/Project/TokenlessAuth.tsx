import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";

const _ProjectFragment = graphql(`
  fragment ProjectTokenlessAuth_Project on Project {
    id
    tokenlessAuthEnabled
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

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Tokenless authentication</CardTitle>
          <CardParagraph>
            Allow GitHub Actions workflows to authenticate without an{" "}
            <code>ARGOS_TOKEN</code> environment variable. Disable this if you
            want to require every CI run to set a project token explicitly.
          </CardParagraph>
          <FormSwitch
            control={form.control}
            name="tokenlessAuthEnabled"
            label="Enable tokenless authentication for this project"
          />
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
}
