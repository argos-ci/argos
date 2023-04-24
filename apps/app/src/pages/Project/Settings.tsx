import { useMutation } from "@apollo/client";
import { Helmet } from "react-helmet";
import { SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { SettingsLayout } from "@/containers/Layout";
import { DocumentType, graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Container } from "@/ui/Container";
import { FormCheckbox } from "@/ui/FormCheckbox";
import { FormError } from "@/ui/FormError";
import { FormRadio } from "@/ui/FormRadio";
import { FormSuccess } from "@/ui/FormSuccess";
import { FormTextInput } from "@/ui/FormTextInput";
import { Anchor } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { Pre } from "@/ui/Pre";
import { Heading } from "@/ui/Typography";

import { useProjectContext } from ".";

const ProjectQuery = graphql(`
  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      token
      baselineBranch
      ghRepository {
        id
        defaultBranch
        private
      }
      private
    }
  }
`);

const UpdateBaselineBranchMutation = graphql(`
  mutation ProjectSettings_updateBaselineBranch(
    $projectId: ID!
    $baselineBranch: String
  ) {
    updateProject(input: { id: $projectId, baselineBranch: $baselineBranch }) {
      id
      baselineBranch
    }
  }
`);

const UpdatePrivateMutation = graphql(`
  mutation ProjectSettings_UpdatePrivate($projectId: ID!, $private: Boolean) {
    updateProject(input: { id: $projectId, private: $private }) {
      id
      private
    }
  }
`);

type ProjectDocument = DocumentType<typeof ProjectQuery>;
type Project = NonNullable<ProjectDocument["project"]>;

const TokenCard = ({ project }: { project: Project }) => {
  return (
    <Card>
      <CardBody>
        <CardTitle>Upload token</CardTitle>
        <CardParagraph>
          Use this <Code>ARGOS_TOKEN</Code> to authenticate your project when
          you send screenshots to Argos.
        </CardParagraph>
        <Pre>
          <code>ARGOS_TOKEN={project.token}</code>
        </Pre>
        <CardParagraph>
          <strong>
            This token should be kept secret. Do not expose it publicly.
          </strong>
        </CardParagraph>
      </CardBody>
      <CardFooter>
        Read{" "}
        <Anchor href="https://argos-ci.com/docs" external>
          Argos documentation
        </Anchor>{" "}
        for more information about installing and using it.
      </CardFooter>
    </Card>
  );
};

type ReferenceBranchInputs = {
  useDefaultBranch: boolean;
  baselineBranch: string;
};

const ReferenceBranchCard = ({ project }: { project: Project }) => {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting, isSubmitSuccessful, defaultValues },
  } = useForm<ReferenceBranchInputs>({
    defaultValues: {
      useDefaultBranch: project.baselineBranch === null,
      baselineBranch:
        project.baselineBranch || project.ghRepository?.defaultBranch || "main",
    },
  });

  const [update] = useMutation(UpdateBaselineBranchMutation);

  const onSubmit: SubmitHandler<ReferenceBranchInputs> = async (data) => {
    try {
      await update({
        variables: {
          projectId: project.id,
          baselineBranch: data.useDefaultBranch ? null : data.baselineBranch,
        },
      });
      clearErrors();
    } catch (error) {
      setError("root.serverError", {
        type: "manual",
        message: "Something went wrong. Please try again.",
      });
    }
  };

  const useDefaultBranch = watch("useDefaultBranch");

  const baselineBranchProps = register("baselineBranch", {
    required: { message: "Branch required", value: true },
  });

  const baselineBranchRef = (element: HTMLInputElement | null) => {
    baselineBranchProps.ref(element);
    if (!element) return;
    // Just checked
    if (
      !useDefaultBranch &&
      defaultValues?.useDefaultBranch !== useDefaultBranch
    ) {
      element.focus();
    }
  };

  return (
    <Card>
      <form
        onSubmit={handleSubmit(onSubmit)}
        aria-labelledby="reference-branch"
      >
        <CardBody>
          <CardTitle id="reference-branch">Reference branch</CardTitle>
          <CardParagraph>
            Argos uses this branch as the reference for screenshots comparison.
          </CardParagraph>
          <FormCheckbox
            {...register("useDefaultBranch")}
            label="Use GitHub default branch"
            className="my-4"
          />
          {!useDefaultBranch && (
            <FormTextInput
              {...baselineBranchProps}
              ref={baselineBranchRef}
              error={errors.baselineBranch}
              label="Custom reference branch"
            />
          )}
        </CardBody>
        <CardFooter className="flex items-center justify-end gap-4">
          {errors.root?.serverError && (
            <FormError>{errors.root.serverError.message}</FormError>
          )}
          {isSubmitSuccessful && <FormSuccess>Saved</FormSuccess>}
          <Button type="submit" disabled={isSubmitting}>
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

type VisibilityInputs = {
  visiblity: "default" | "public" | "private";
};

const formatVisiblity = (
  isPrivate: boolean | null
): VisibilityInputs["visiblity"] => {
  switch (isPrivate) {
    case null:
      return "default";
    case false:
      return "public";
    case true:
      return "private";
  }
};

const parseVisibility = (
  visiblity: VisibilityInputs["visiblity"]
): boolean | null => {
  switch (visiblity) {
    case "default":
      return null;
    case "public":
      return false;
    case "private":
      return true;
  }
};

const VisibilityCard = ({ project }: { project: Project }) => {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<VisibilityInputs>({
    defaultValues: {
      visiblity: formatVisiblity(project.private ?? null),
    },
  });

  const [update] = useMutation(UpdatePrivateMutation);

  const onSubmit: SubmitHandler<VisibilityInputs> = async (data) => {
    try {
      await update({
        variables: {
          projectId: project.id,
          private: parseVisibility(data.visiblity),
        },
      });
      clearErrors();
    } catch (error) {
      setError("root.serverError", {
        type: "manual",
        message: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <Card>
      <form
        onSubmit={handleSubmit(onSubmit)}
        aria-labelledby="reference-branch"
      >
        <CardBody>
          <CardTitle id="reference-branch">Project visibility</CardTitle>
          <CardParagraph>
            Make a public project private in order to restrict access to builds
            and screenshots to only authorized users.
          </CardParagraph>
          <CardParagraph>
            This will also mark the screenshots as private and use up credit.
          </CardParagraph>
          <div className="my-4 flex flex-col gap-4">
            <FormRadio
              {...register("visiblity")}
              value="default"
              label={
                <>
                  Use GitHub visibility settings{" "}
                  <span className="text-on-light">
                    {project.ghRepository
                      ? `(currently ${
                          project.ghRepository.private ? "private" : "public"
                        })`
                      : `(currently unknown)`}
                  </span>
                </>
              }
            />
            <FormRadio
              {...register("visiblity")}
              value="private"
              label="Visible only from Team members"
            />
            <FormRadio
              {...register("visiblity")}
              value="public"
              label="Visible from everyone"
            />
          </div>
        </CardBody>
        <CardFooter className="flex items-center justify-end gap-4">
          {errors.root?.serverError && (
            <FormError>{errors.root.serverError.message}</FormError>
          )}
          {isSubmitSuccessful && <FormSuccess>Saved</FormSuccess>}
          <Button type="submit" disabled={isSubmitting}>
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export const ProjectSettings = () => {
  const { accountSlug, projectName } = useParams();
  const { hasWritePermission } = useProjectContext();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>
          {accountSlug}/{projectName} • Settings
        </title>
      </Helmet>
      <Heading>Project Settings</Heading>
      <Query
        fallback={<PageLoader />}
        query={ProjectQuery}
        variables={{
          accountSlug,
          projectName,
        }}
      >
        {({ project }) => {
          if (!project) return <NotFound />;

          return (
            <SettingsLayout>
              <TokenCard project={project} />
              <ReferenceBranchCard project={project} />
              <VisibilityCard project={project} />
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
};
