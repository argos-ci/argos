import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormRadio, FormRadioGroup } from "@/ui/FormRadio";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";

import { getRepositoryLabel } from "../Repository";

const UpdateBranchesMutation = graphql(`
  mutation ProjectBranches_updateProject(
    $id: ID!
    $defaultBaseBranch: String
    $autoApprovedBranchGlob: String
    $autoApprovalEnabled: Boolean
  ) {
    updateProject(
      input: {
        id: $id
        defaultBaseBranch: $defaultBaseBranch
        autoApprovedBranchGlob: $autoApprovedBranchGlob
        autoApprovalEnabled: $autoApprovalEnabled
      }
    ) {
      id
      customDefaultBaseBranch
      customAutoApprovedBranchGlob
      autoApprovalEnabled
    }
  }
`);

const _ProjectFragment = graphql(`
  fragment ProjectBranches_Project on Project {
    id
    customDefaultBaseBranch
    customAutoApprovedBranchGlob
    autoApprovalEnabled
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

type AutoApprovalMode = "default-base-branch" | "pattern" | "none";

function getAutoApprovalMode(project: Project): AutoApprovalMode {
  if (!project.autoApprovalEnabled) {
    return "none";
  }
  return project.customAutoApprovedBranchGlob === null
    ? "default-base-branch"
    : "pattern";
}

type AutoApprovedBranchesInputs = {
  mode: AutoApprovalMode;
  autoApprovedBranchGlob: string;
};

function AutoApprovedBranchesCard(props: { project: Project }) {
  const { project } = props;
  const effectiveDefaultBaseBranch = getEffectiveDefaultBaseBranch(project);
  const form = useForm<AutoApprovedBranchesInputs>({
    defaultValues: {
      mode: getAutoApprovalMode(project),
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
        autoApprovalEnabled: data.mode !== "none",
        autoApprovedBranchGlob: (
          {
            "default-base-branch": null,
            pattern: data.autoApprovedBranchGlob,
            // Turning auto-approval off keeps the pattern, so turning it back
            // on restores it.
            none: undefined,
          } satisfies Record<AutoApprovalMode, string | null | undefined>
        )[data.mode],
      },
    });
    form.reset(data);
  };

  const mode = form.watch("mode");

  const autoApprovedBranchGlobFieldProps = form.register(
    "autoApprovedBranchGlob",
    {
      required: { message: "Pattern required", value: mode === "pattern" },
    },
  );

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Auto-approved branches</CardTitle>
          <CardParagraph>
            Builds pushed to an auto-approved branch are approved automatically
            and have a success status check. Pull request builds are never
            auto-approved.
          </CardParagraph>
          <FormRadioGroup>
            <FormRadio
              {...form.register("mode")}
              value="default-base-branch"
              label={
                <div className="ml-2">
                  Auto-approve the default base branch
                  <p className="text-low text-sm font-normal">
                    Builds on <Code>{effectiveDefaultBaseBranch}</Code> are
                    approved automatically.
                  </p>
                </div>
              }
            />
            <FormRadio
              {...form.register("mode")}
              value="pattern"
              label={
                <div className="ml-2">
                  Auto-approve branches matching a pattern
                  <p className="text-low text-sm font-normal">
                    Use patterns like <Code>main</Code>,{" "}
                    <Code>{`{main,production}`}</Code>, or{" "}
                    <Code>release/**</Code>.
                  </p>
                </div>
              }
            />
            {mode === "pattern" && (
              <FormTextInput
                control={form.control}
                {...autoApprovedBranchGlobFieldProps}
                autoFocus={form.formState.defaultValues?.mode !== "pattern"}
                label="Auto-approved branch pattern"
                className="ml-7"
              />
            )}
            <FormRadio
              {...form.register("mode")}
              value="none"
              label={
                <div className="ml-2">
                  Don't auto-approve any branch
                  <p className="text-low text-sm font-normal">
                    Every build needs a review, including on the base branch: a
                    build there is used as a baseline only once approved. Flaky
                    change detection learns from auto-approved builds, so it
                    stops collecting data.
                  </p>
                </div>
              }
            />
          </FormRadioGroup>
        </CardBody>
        <FormCardFooter control={form.control}>
          <LearnMoreFooter />
        </FormCardFooter>
      </Form>
    </Card>
  );
}
