import { useApolloClient } from "@apollo/client";
import { SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { DocumentType, graphql } from "@/gql";
import { getProjectURL } from "@/pages/Project/ProjectParams";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const _ProjectFragment = graphql(`
  fragment ProjectChangeName_Project on Project {
    id
    name
    account {
      id
      slug
    }
  }
`);

const UpdateProjectMutation = graphql(`
  mutation ProjectChangeName_updateProject($id: ID!, $name: String!) {
    updateProject(input: { id: $id, name: $name }) {
      id
      name
    }
  }
`);

type Inputs = {
  name: string;
};

export const ProjectChangeName = (props: {
  project: DocumentType<typeof _ProjectFragment>;
}) => {
  const { project } = props;
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      name: project.name,
    },
  });
  const navigate = useNavigate();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectMutation,
      variables: {
        id: project.id,
        name: data.name,
      },
    });
    await navigate(
      `${getProjectURL({ accountSlug: project.account.slug, projectName: data.name })}/settings`,
      {
        replace: true,
      },
    );
  };
  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Project Name</CardTitle>
          <CardParagraph>
            Used to identify your Project on the Dashboard, in the URL and in
            your Builds.
          </CardParagraph>
          <FormTextInput
            control={form.control}
            {...form.register("name", {
              required: "Please enter a project name",
              maxLength: {
                value: 100,
                message: "Project name must be 100 characters or less",
              },
              pattern: {
                value: /^[a-zA-Z0-9\-_.]+$/,
                message:
                  "Project names must be alphanumeric characters with dots, hyphens and lodashes.",
              },
            })}
            label="Project name"
            hiddenLabel
          />
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
};
