import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const ProjectFragment = graphql(`
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
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const project = useFragment(ProjectFragment, props.project);
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
    await navigate(`/${project.account.slug}/${data.name}/settings`, {
      replace: true,
    });
  };
  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Project Name</CardTitle>
            <CardParagraph>
              Used to identify your Project on the Dashboard, in the URL and in
              your Builds.
            </CardParagraph>
            <FormTextInput
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
          <FormCardFooter />
        </Form>
      </FormProvider>
    </Card>
  );
};
