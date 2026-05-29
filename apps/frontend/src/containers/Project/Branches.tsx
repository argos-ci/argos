import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

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

type Project = DocumentType<typeof _ProjectFragment>;

function getEffectiveDefaultBaseBranch(project: Project): string {
  return (
    project.customDefaultBaseBranch ||
    project.repository?.defaultBranch ||
    "main"
  );
}

const LearnMoreFooter = () => (
  <>
    Learn more about{" "}
    <Link
      href="https://argos-ci.com/docs/learn/platform-fundamentals/baseline-build"
      target="_blank"
    >
      baseline builds
    </Link>
    .
  </>
);

export const ProjectBranches = (props: { project: Project }) => {
  return (
    <>
      <DefaultBaseBranchCard project={props.project} />
      <AutoApprovedBranchesCard project={props.project} />
    </>
  );
};

type DefaultBaseBranchInputs = {
  noCustomDefaultBaseBranch: boolean;
  defaultBaseBranch: string;
};

function DefaultBaseBranchCard(props: { project: Project }) {
  const { project } = props;
  const effectiveDefaultBaseBranch = getEffectiveDefaultBaseBranch(project);
  const form = useForm<DefaultBaseBranchInputs>({
    defaultValues: {
      noCustomDefaultBaseBranch: project.customDefaultBaseBranch === null,
      defaultBaseBranch: effectiveDefaultBaseBranch,
    },
  });

  const client = useApolloClient();

  const onSubmit: SubmitHandler<DefaultBaseBranchInputs> = async (data) => {
    await client.mutate({
      mutation: UpdateBranchesMutation,
      variables: {
        id: project.id,
        defaultBaseBranch: data.noCustomDefaultBaseBranch
          ? null
          : data.defaultBaseBranch,
      },
    });
    form.reset(data);
  };

  const noCustomDefaultBaseBranch = form.watch("noCustomDefaultBaseBranch");

  const defaultBaseBranchFieldProps = form.register("defaultBaseBranch", {
    required: { message: "Branch required", value: true },
  });

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Default base branch</CardTitle>
          <CardParagraph>
            Argos will find the first ancestor commit on base branch in Git
            history. It uses pull-request base branch if available, else it
            defaults to the project default branch specified here.
          </CardParagraph>
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
              control={form.control}
              {...defaultBaseBranchFieldProps}
              ref={(element) => {
                defaultBaseBranchFieldProps.ref(element);
                if (element) {
                  if (
                    !noCustomDefaultBaseBranch &&
                    form.formState.defaultValues?.noCustomDefaultBaseBranch !==
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
        </CardBody>
        <FormCardFooter control={form.control}>
          <LearnMoreFooter />
        </FormCardFooter>
      </Form>
    </Card>
  );
}

type AutoApprovedBranchesInputs = {
  noCustomApprovedBranchGlob: boolean;
  autoApprovedBranchGlob: string;
};

function AutoApprovedBranchesCard(props: { project: Project }) {
  const { project } = props;
  const effectiveDefaultBaseBranch = getEffectiveDefaultBaseBranch(project);
  const form = useForm<AutoApprovedBranchesInputs>({
    defaultValues: {
      noCustomApprovedBranchGlob: project.customAutoApprovedBranchGlob === null,
      autoApprovedBranchGlob:
        project.customAutoApprovedBranchGlob || effectiveDefaultBaseBranch,
    },
  });

  const client = useApolloClient();

  const onSubmit: SubmitHandler<AutoApprovedBranchesInputs> = async (data) => {
    await client.mutate({
      mutation: UpdateBranchesMutation,
      variables: {
        id: project.id,
        autoApprovedBranchGlob: data.noCustomApprovedBranchGlob
          ? null
          : data.autoApprovedBranchGlob,
      },
    });
    form.reset(data);
  };

  const noCustomApprovedBranchGlob = form.watch("noCustomApprovedBranchGlob");

  const autoApprovedBranchGlobFieldProps = form.register(
    "autoApprovedBranchGlob",
    {
      required: { message: "Pattern required", value: true },
    },
  );

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Auto-approved branches</CardTitle>
          <CardParagraph>
            Any branch that matches the specified pattern will be automatically
            approved and have a success status check.
          </CardParagraph>
          <FormSwitch
            control={form.control}
            name="noCustomApprovedBranchGlob"
            label={
              effectiveDefaultBaseBranch ? (
                <>
                  Auto-approve only the default base branch:{" "}
                  <Code>{effectiveDefaultBaseBranch}</Code>
                </>
              ) : (
                "Auto-approve only the default base branch"
              )
            }
          />
          {!noCustomApprovedBranchGlob && (
            <>
              <FormTextInput
                control={form.control}
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
                <Code>{`{main,production}`}</Code>, or <Code>release/**</Code>.
              </p>
            </>
          )}
        </CardBody>
        <FormCardFooter control={form.control}>
          <LearnMoreFooter />
        </FormCardFooter>
      </Form>
    </Card>
  );
}
