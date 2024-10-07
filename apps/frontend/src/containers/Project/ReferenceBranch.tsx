import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormCheckbox } from "@/ui/FormCheckbox";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";

import { getRepositoryLabel } from "../Repository";

const UpdateBaselineBranchMutation = graphql(`
  mutation ProjectReferenceBranch_updateProject(
    $id: ID!
    $defaultBaseBranch: String
    $referenceBranchGlob: String
  ) {
    updateProject(
      input: {
        id: $id
        defaultBaseBranch: $defaultBaseBranch
        referenceBranchGlob: $referenceBranchGlob
      }
    ) {
      id
      customDefaultBaseBranch
      customReferenceBranchGlob
    }
  }
`);

type Inputs = {
  autoDefaultBaseBranch: boolean;
  defaultBaseBranch: string;
  autoReferenceBranch: boolean;
  referenceBranchGlob: string;
};

const ProjectFragment = graphql(`
  fragment ProjectReferenceBranch_Project on Project {
    id
    customDefaultBaseBranch
    customReferenceBranchGlob
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
  const defaultDefaultBaseBranch =
    project.customDefaultBaseBranch ||
    project.repository?.defaultBranch ||
    "main";
  const form = useForm<Inputs>({
    defaultValues: {
      autoDefaultBaseBranch: project.customDefaultBaseBranch === null,
      defaultBaseBranch: defaultDefaultBaseBranch,
      autoReferenceBranch: project.customReferenceBranchGlob === null,
      referenceBranchGlob:
        project.customReferenceBranchGlob || defaultDefaultBaseBranch,
    },
  });

  const client = useApolloClient();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateBaselineBranchMutation,
      variables: {
        id: project.id,
        defaultBaseBranch: data.autoDefaultBaseBranch
          ? null
          : data.defaultBaseBranch,
        referenceBranchGlob: data.autoReferenceBranch
          ? null
          : data.referenceBranchGlob,
      },
    });
  };

  const defaultBaseBranch = form.watch("defaultBaseBranch");
  const autoDefaultBaseBranch = form.watch("autoDefaultBaseBranch");
  const autoReferenceBranch = form.watch("autoReferenceBranch");

  const defaultBaseBranchFieldProps = form.register("defaultBaseBranch", {
    required: { message: "Branch required", value: true },
  });

  const referenceBranchGlobFieldProps = form.register("referenceBranchGlob", {
    required: { message: "Pattern required", value: true },
  });

  const dynamicDefaultBaseBranch = autoDefaultBaseBranch
    ? defaultDefaultBaseBranch
    : defaultBaseBranch;

  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Branches</CardTitle>
            <CardParagraph>
              Choose how Argos will determine the reference branch for your
              builds in Continuous Integration (CI) mode.
            </CardParagraph>
            <div className="mb-4 rounded border p-4">
              <h3 className="mb-1 font-semibold">Default base branch</h3>
              <p className="text-low text-sm">
                Argos will compare the Git history between the base branch and
                the head branch. If a pull request specifies a base branch, that
                branch will be used. Otherwise, Argos defaults to the
                repository's main branch.
              </p>
              <div className="mt-4">
                <FormCheckbox
                  {...form.register("autoDefaultBaseBranch")}
                  label={
                    project.repository ? (
                      <>
                        Use {getRepositoryLabel(project.repository.__typename)}{" "}
                        repository's default branch:{" "}
                        <Code>{project.repository.defaultBranch}</Code>
                      </>
                    ) : (
                      "Use main branch"
                    )
                  }
                />
                {!autoDefaultBaseBranch && (
                  <FormTextInput
                    {...defaultBaseBranchFieldProps}
                    ref={(element) => {
                      defaultBaseBranchFieldProps.ref(element);
                      if (element) {
                        if (
                          !autoDefaultBaseBranch &&
                          form.formState.defaultValues
                            ?.autoDefaultBaseBranch !== autoDefaultBaseBranch
                        ) {
                          element.focus();
                        }
                      }
                    }}
                    label="Default base branch"
                    className="mt-4"
                  />
                )}
              </div>
            </div>
            <div className="rounded border p-4">
              <h3 className="mb-1 font-semibold">Reference branches</h3>
              <p className="text-low text-sm">
                Any branch that matches the specified pattern will be
                automatically approved as a reference build and won’t need
                manual approval.
              </p>
              <div className="mt-4">
                <FormCheckbox
                  {...form.register("autoReferenceBranch")}
                  label={
                    dynamicDefaultBaseBranch ? (
                      <>
                        Automatically match branches based on the default base
                        branch: <Code>{dynamicDefaultBaseBranch}</Code>
                      </>
                    ) : (
                      "Automatically match branches based on the default base branch"
                    )
                  }
                />
                {!autoReferenceBranch && (
                  <>
                    <FormTextInput
                      {...referenceBranchGlobFieldProps}
                      ref={(element) => {
                        referenceBranchGlobFieldProps.ref(element);
                        if (element) {
                          if (
                            !autoReferenceBranch &&
                            form.formState.defaultValues
                              ?.autoReferenceBranch !== autoReferenceBranch
                          ) {
                            element.focus();
                          }
                        }
                      }}
                      label="Reference branch pattern"
                      className="mt-4"
                    />
                    <p className="text-low mt-2 text-sm">
                      Use patterns like <Code>main</Code>,{" "}
                      <Code>release/*</Code>, or <Code>feature/**</Code>.
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardBody>
          <FormCardFooter>
            Learn more about{" "}
            <Link
              href="https://argos-ci.com/docs/reference-build"
              target="_blank"
            >
              reference build
            </Link>
            .
          </FormCardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
