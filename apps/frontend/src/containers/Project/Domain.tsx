import { useApolloClient } from "@apollo/client/react";
import { SLUG_REGEX } from "@argos/util/slug";
import { SubmitHandler, useForm } from "react-hook-form";

import { config } from "@/config";
import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";

import { getRepositoryLabel } from "../Repository";

const INTERNAL_DOMAIN_SUFFIX = config.deployments.baseDomain;

const _ProjectFragment = graphql(`
  fragment ProjectDomain_Project on Project {
    id
    domain
    customDeploymentProductionBranchGlob
    repository {
      __typename
      id
      defaultBranch
    }
  }
`);

const UpdateProjectDomainMutation = graphql(`
  mutation ProjectDomain_updateProjectDomain(
    $input: UpdateProjectDomainInput!
  ) {
    updateProjectDomain(input: $input) {
      id
      domain
    }
  }
`);

const UpdateProjectDeploymentBranchMutation = graphql(`
  mutation ProjectDomain_updateProject(
    $id: ID!
    $deploymentProductionBranchGlob: String
  ) {
    updateProject(
      input: {
        id: $id
        deploymentProductionBranchGlob: $deploymentProductionBranchGlob
      }
    ) {
      id
      customDeploymentProductionBranchGlob
    }
  }
`);

type Inputs = {
  domain: string;
  noCustomDeploymentProductionBranchGlob: boolean;
  deploymentProductionBranchGlob: string;
};

function getDomainSlug(domain: string | null | undefined) {
  if (!domain) {
    return "";
  }

  const suffix = `.${INTERNAL_DOMAIN_SUFFIX}`;
  if (!domain.endsWith(suffix)) {
    return domain;
  }

  return domain.slice(0, -suffix.length);
}

export const ProjectDomain = (props: {
  project: DocumentType<typeof _ProjectFragment>;
}) => {
  const client = useApolloClient();
  const defaultDeploymentProductionBranchGlob =
    props.project.repository?.defaultBranch || "main";
  const form = useForm<Inputs>({
    defaultValues: {
      domain: getDomainSlug(props.project.domain),
      noCustomDeploymentProductionBranchGlob:
        props.project.customDeploymentProductionBranchGlob === null,
      deploymentProductionBranchGlob:
        props.project.customDeploymentProductionBranchGlob ||
        defaultDeploymentProductionBranchGlob,
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const domain = `${data.domain}.${INTERNAL_DOMAIN_SUFFIX}`;

    const result = await client.mutate({
      mutation: UpdateProjectDomainMutation,
      variables: {
        input: {
          projectId: props.project.id,
          domain,
        },
      },
    });

    await client.mutate({
      mutation: UpdateProjectDeploymentBranchMutation,
      variables: {
        id: props.project.id,
        deploymentProductionBranchGlob:
          data.noCustomDeploymentProductionBranchGlob
            ? null
            : data.deploymentProductionBranchGlob,
      },
    });

    form.reset({
      ...data,
      domain: getDomainSlug(result.data?.updateProjectDomain.domain),
    });
  };

  const noCustomDeploymentProductionBranchGlob = form.watch(
    "noCustomDeploymentProductionBranchGlob",
  );
  const deploymentProductionBranchGlobFieldProps = form.register(
    "deploymentProductionBranchGlob",
    {
      required: { message: "Pattern required", value: true },
    },
  );

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Deployments</CardTitle>
          <CardParagraph>
            Choose how Argos identifies and serves production deployments.
          </CardParagraph>
          <div className="mb-4 rounded-sm border p-4">
            <h3 className="mb-1 font-semibold">Production domain</h3>
            <p className="text-low mb-4 text-sm">
              Internal domain used to serve your production deployment.
            </p>
            <FormTextInput
              control={form.control}
              {...form.register("domain", {
                required: "Please enter a domain slug",
                maxLength: {
                  value: 48,
                  message: "Domain slugs must be 48 characters or less",
                },
                pattern: {
                  value: SLUG_REGEX,
                  message:
                    "Domain slugs must be lowercase, start and end with an alphanumeric character, and may contain dashes in the middle.",
                },
              })}
              label="Production domain"
              hiddenLabel
              addon={`.${INTERNAL_DOMAIN_SUFFIX}`}
              className="max-w-md"
            />
          </div>
          <div className="rounded-sm border p-4">
            <h3 className="mb-1 font-semibold">Production deployment branch</h3>
            <p className="text-low text-sm">
              Any deployment from a branch that matches the specified pattern
              will be treated as a production deployment.
            </p>
            <div className="mt-4">
              <FormSwitch
                control={form.control}
                name="noCustomDeploymentProductionBranchGlob"
                label={
                  props.project.repository ? (
                    <>
                      Use{" "}
                      {getRepositoryLabel(props.project.repository.__typename)}{" "}
                      repository's default branch:{" "}
                      <Code>{defaultDeploymentProductionBranchGlob}</Code>
                    </>
                  ) : (
                    <>
                      Use <Code>main</Code> as production deployment branch
                    </>
                  )
                }
              />
              {!noCustomDeploymentProductionBranchGlob && (
                <>
                  <FormTextInput
                    control={form.control}
                    {...deploymentProductionBranchGlobFieldProps}
                    ref={(element) => {
                      deploymentProductionBranchGlobFieldProps.ref(element);
                      if (element) {
                        if (
                          !noCustomDeploymentProductionBranchGlob &&
                          form.formState.defaultValues
                            ?.noCustomDeploymentProductionBranchGlob !==
                            noCustomDeploymentProductionBranchGlob
                        ) {
                          element.focus();
                        }
                      }
                    }}
                    label="Production deployment branch pattern"
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
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
};
