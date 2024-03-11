import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormCheckbox } from "@/ui/FormCheckbox";
import { FormTextInput } from "@/ui/FormTextInput";
import { getRepositoryLabel } from "../Repository";
import { Anchor } from "@/ui/Anchor";

const UpdateBaselineBranchMutation = graphql(`
  mutation ProjectReferenceBranch_updateProject(
    $id: ID!
    $baselineBranch: String
  ) {
    updateProject(input: { id: $id, baselineBranch: $baselineBranch }) {
      id
      baselineBranch
    }
  }
`);

type Inputs = {
  useDefaultBranch: boolean;
  baselineBranch: string;
};

const ProjectFragment = graphql(`
  fragment ProjectReferenceBranch_Project on Project {
    id
    baselineBranch
    repository {
      __typename
      id
      defaultBranch
    }
  }
`);

export const ProjectReferenceBranch = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const project = useFragment(ProjectFragment, props.project);
  const form = useForm<Inputs>({
    defaultValues: {
      useDefaultBranch: project.baselineBranch === null,
      baselineBranch:
        project.baselineBranch || project.repository?.defaultBranch || "main",
    },
  });

  const client = useApolloClient();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateBaselineBranchMutation,
      variables: {
        id: project.id,
        baselineBranch: data.useDefaultBranch ? null : data.baselineBranch,
      },
    });
  };

  const useDefaultBranch = form.watch("useDefaultBranch");

  const baselineBranchFieldProps = form.register("baselineBranch", {
    required: { message: "Branch required", value: true },
  });

  const baselineBranchRef = (element: HTMLInputElement | null) => {
    baselineBranchFieldProps.ref(element);
    if (!element) return;
    // Just checked
    if (
      !useDefaultBranch &&
      form.formState.defaultValues?.useDefaultBranch !== useDefaultBranch
    ) {
      element.focus();
    }
  };

  const defaultLabel = project.repository ? (
    <>
      Use linked {getRepositoryLabel(project.repository.__typename)} repository
      default branch{" "}
      <span className="text-low">({project.repository.defaultBranch})</span>
    </>
  ) : (
    "Use main branch"
  );

  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Reference branch</CardTitle>
            <CardParagraph>
              Argos uses this branch as the reference for screenshots
              comparison.
            </CardParagraph>
            <FormCheckbox
              {...form.register("useDefaultBranch")}
              label={defaultLabel}
            />
            {!useDefaultBranch && (
              <FormTextInput
                {...baselineBranchFieldProps}
                ref={baselineBranchRef}
                label="Custom reference branch"
                className="mt-4"
              />
            )}
          </CardBody>
          <FormCardFooter>
            Learn more about{" "}
            <Anchor href="https://argos-ci.com/docs/reference-build" external>
              reference branch
            </Anchor>
            .
          </FormCardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
