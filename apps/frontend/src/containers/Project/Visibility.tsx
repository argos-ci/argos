import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormRadio, FormRadioGroup } from "@/ui/FormRadio";
import { getRepositoryLabel } from "../Repository";

const UpdatePrivateMutation = graphql(`
  mutation ProjectVisibility_updateProject($id: ID!, $private: Boolean) {
    updateProject(input: { id: $id, private: $private }) {
      id
      private
    }
  }
`);

type Inputs = {
  visibility: "default" | "public" | "private";
};

const formatVisibility = (isPrivate: boolean | null): Inputs["visibility"] => {
  switch (isPrivate) {
    case null:
      return "default";
    case false:
      return "public";
    case true:
      return "private";
  }
};

const parseVisibility = (visibility: Inputs["visibility"]): boolean | null => {
  switch (visibility) {
    case "default":
      return null;
    case "public":
      return false;
    case "private":
      return true;
  }
};

const ProjectFragment = graphql(`
  fragment ProjectVisibility_Project on Project {
    id
    private
    repository {
      __typename
      id
      private
    }
  }
`);

export const ProjectVisibility = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const project = useFragment(ProjectFragment, props.project);
  const form = useForm<Inputs>({
    defaultValues: {
      visibility: formatVisibility(project.private ?? null),
    },
  });

  const client = useApolloClient();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdatePrivateMutation,
      variables: {
        id: project.id,
        private: parseVisibility(data.visibility),
      },
    });
  };

  const repositoryLabel = project.repository
    ? getRepositoryLabel(project.repository.__typename)
    : null;

  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Project visibility</CardTitle>
            <CardParagraph>
              Make a public project private in order to restrict access to
              builds and screenshots to only authorized users.
            </CardParagraph>
            <FormRadioGroup>
              <FormRadio
                {...form.register("visibility")}
                value="default"
                label={
                  <>
                    Use {repositoryLabel ?? "Git provider"} visibility settings{" "}
                    {project.repository ? (
                      <span className="text-low">
                        ({project.repository.private ? "private" : "public"})
                      </span>
                    ) : null}
                  </>
                }
              />
              <FormRadio
                {...form.register("visibility")}
                value="private"
                label="Visible only from Team members"
              />
              <FormRadio
                {...form.register("visibility")}
                value="public"
                label="Visible from everyone"
              />
            </FormRadioGroup>
          </CardBody>
          <FormCardFooter />
        </Form>
      </FormProvider>
    </Card>
  );
};
