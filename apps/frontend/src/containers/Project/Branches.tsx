import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";

import { getRepositoryLabel } from "../Repository";

const UpdateBranchesMutation = graphql(`
  mutation ProjectBranches_updateProject(
    $id: ID!
    $defaultBaseBranch: String
    $autoApprovedBranchGlob: String
  ) {
    updateProject(
      input: {
        id: $id
        defaultBaseBranch: $defaultBaseBranch
        autoApprovedBranchGlob: $autoApprovedBranchGlob
      }
    ) {
      id
      customDefaultBaseBranch
      customAutoApprovedBranchGlob
    }
  }
`);

type Inputs = {
  noCustomDefaultBaseBranch: boolean;
  defaultBaseBranch: string;
  noCustomApprovedBranchGlob: boolean;
  autoApprovedBranchGlob: string;
};

const _ProjectFragment = graphql(`
  fragment ProjectBranches_Project on Project {
    id
    customDefaultBaseBranch
    customAutoApprovedBranchGlob
    repository {
      __typename
      id
      defaultBranch
    }
  }
`);

export const ProjectBranches = (props: {
  project: DocumentType<typeof _ProjectFragment>;
}) => {
  const { project } = props;
  const defaultDefaultBaseBranch =
    project.customDefaultBaseBranch ||
    project.repository?.defaultBranch ||
    "main";
  const form = useForm<Inputs>({
    defaultValues: {
      noCustomDefaultBaseBranch: project.customDefaultBaseBranch === null,
      defaultBaseBranch: defaultDefaultBaseBranch,
      noCustomApprovedBranchGlob: project.customAutoApprovedBranchGlob === null,
      autoApprovedBranchGlob:
        project.customAutoApprovedBranchGlob || defaultDefaultBaseBranch,
    },
  });

  const client = useApolloClient();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateBranchesMutation,
      variables: {
        id: project.id,
        defaultBaseBranch: data.noCustomDefaultBaseBranch
          ? null
          : data.defaultBaseBranch,
        autoApprovedBranchGlob: data.noCustomApprovedBranchGlob
          ? null
          : data.autoApprovedBranchGlob,
      },
    });
    form.reset(data);
  };

  const defaultBaseBranch = form.watch("defaultBaseBranch");
  const noCustomDefaultBaseBranch = form.watch("noCustomDefaultBaseBranch");
  const noCustomApprovedBranchGlob = form.watch("noCustomApprovedBranchGlob");

  const defaultBaseBranchFieldProps = form.register("defaultBaseBranch", {
    required: { message: "Branch required", value: true },
  });

  const autoApprovedBranchGlobFieldProps = form.register(
    "autoApprovedBranchGlob",
    {
      required: { message: "Pattern required", value: true },
    },
  );

  const dynamicDefaultBaseBranch = noCustomDefaultBaseBranch
    ? defaultDefaultBaseBranch
    : defaultBaseBranch;

  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Branches</CardTitle>
            <CardParagraph>
              Choose Argos default base branch and auto-approved branches used
              in{" "}
              <Link external href="https://argos-ci.com/docs/monitoring-mode">
                Continous Integration (CI) builds
              </Link>
              .
            </CardParagraph>
            <div className="mb-4 rounded border p-4">
              <h3 className="mb-1 font-semibold">Default base branch</h3>
              <p className="text-low text-sm">
                Argos will find the first ancestor commit on base branch in Git
                history. It uses pull-request base branch if avalaible, else it
                defaults to the project default branch specified here.
              </p>
              <div className="mt-4">
                <FormSwitch
                  control={form.control}
                  name="noCustomDefaultBaseBranch"
                  label={
                    project.repository ? (
                      <>
                        Use {getRepositoryLabel(project.repository.__typename)}{" "}
                        repository's default branch:{" "}
                        <Code>{project.repository.defaultBranch}</Code>
                      </>
                    ) : (
                      <>
                        Use <Code>main</Code> as default base branch
                      </>
                    )
                  }
                />
                {!noCustomDefaultBaseBranch && (
                  <FormTextInput
                    {...defaultBaseBranchFieldProps}
                    ref={(element) => {
                      defaultBaseBranchFieldProps.ref(element);
                      if (element) {
                        if (
                          !noCustomDefaultBaseBranch &&
                          form.formState.defaultValues
                            ?.noCustomDefaultBaseBranch !==
                            noCustomDefaultBaseBranch
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
              <h3 className="mb-1 font-semibold">Auto-approved branches</h3>
              <p className="text-low text-sm">
                Any branch that matches the specified pattern will be
                automatically approved and have a success status check.
              </p>
              <div className="mt-4">
                <FormSwitch
                  control={form.control}
                  name="noCustomApprovedBranchGlob"
                  label={
                    dynamicDefaultBaseBranch ? (
                      <>
                        Auto-approve only the default base branch:{" "}
                        <Code>{dynamicDefaultBaseBranch}</Code>
                      </>
                    ) : (
                      "Auto-approve only the default base branch"
                    )
                  }
                />
                {!noCustomApprovedBranchGlob && (
                  <>
                    <FormTextInput
                      {...autoApprovedBranchGlobFieldProps}
                      ref={(element) => {
                        autoApprovedBranchGlobFieldProps.ref(element);
                        if (element) {
                          if (
                            !noCustomApprovedBranchGlob &&
                            form.formState.defaultValues
                              ?.noCustomApprovedBranchGlob !==
                              noCustomApprovedBranchGlob
                          ) {
                            element.focus();
                          }
                        }
                      }}
                      label="Auto-approved branch pattern"
                      className="mt-4"
                    />
                    <p className="text-low mt-2 text-sm">
                      Use patterns like <Code>main</Code>,{" "}
                      <Code>{`{main,production}`}</Code>, or{" "}
                      <Code>release/**</Code>.
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardBody>
          <FormCardFooter>
            Learn more about{" "}
            <Link
              href="https://argos-ci.com/docs/baseline-build"
              target="_blank"
            >
              baseline builds
            </Link>
            .
          </FormCardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
