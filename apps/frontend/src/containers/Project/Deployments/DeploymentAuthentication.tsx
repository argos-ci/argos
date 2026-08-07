import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { DeploymentAuth } from "@/gql/graphql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { FieldError } from "@/ui/FieldError";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { Link } from "@/ui/Link";
import {
  ListBox,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
} from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { SelectButton, SelectField } from "@/ui/Select";

type DeploymentAuthLevel =
  | DeploymentAuth.DomainPrivate
  | DeploymentAuth.Private;

const _ProjectFragment = graphql(`
  fragment DeploymentAuthentication_Project on Project {
    id
    deploymentAuth
  }
`);

const UpdateProjectMutation = graphql(`
  mutation DeploymentAuthentication_updateProject(
    $projectId: ID!
    $deploymentAuth: DeploymentAuth
  ) {
    updateProject(input: { id: $projectId, deploymentAuth: $deploymentAuth }) {
      id
      deploymentAuth
    }
  }
`);

type Inputs = {
  deploymentAuthEnabled: boolean;
  deploymentAuth: DeploymentAuthLevel;
};

export function DeploymentAuthentication(props: {
  project: DocumentType<typeof _ProjectFragment>;
  isTeam: boolean;
}) {
  const { project, isTeam } = props;
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      deploymentAuthEnabled: project.deploymentAuth !== DeploymentAuth.Public,
      deploymentAuth: getDeploymentAuthLevel(project.deploymentAuth, isTeam),
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const deploymentAuth = data.deploymentAuthEnabled
      ? data.deploymentAuth
      : DeploymentAuth.Public;
    await client.mutate({
      mutation: UpdateProjectMutation,
      variables: { projectId: project.id, deploymentAuth },
    });
    form.reset(data);
  };

  const deploymentAuthEnabled = form.watch("deploymentAuthEnabled");
  const deploymentAuth = form.watch("deploymentAuth");
  const deploymentAuthDef = DEPLOYMENT_AUTH_DEFS[deploymentAuth];

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Deployment authentication</CardTitle>
          <CardParagraph>
            Restrict who can access your deployment URLs by requiring viewers to
            log in with an Argos account that has access to this project.
          </CardParagraph>
          <div className="flex flex-col gap-10 sm:flex-row sm:items-center">
            <FormSwitch
              control={form.control}
              name="deploymentAuthEnabled"
              label="Log in protection"
            />
            {deploymentAuthEnabled && (
              <SelectField
                control={form.control}
                name="deploymentAuth"
                aria-label="Deployment authentication level"
                className="sm:w-80"
              >
                <SelectButton className="w-full">
                  {deploymentAuthDef.label}
                </SelectButton>
                <FieldError />
                <Popover className="max-w-sm">
                  <ListBox>
                    <ListBoxItem
                      id={DeploymentAuth.DomainPrivate}
                      textValue="Standard protection"
                    >
                      <ListBoxItemLabel>Standard protection</ListBoxItemLabel>
                      <ListBoxItemDescription>
                        Protect all except production custom domains for your
                        project.
                      </ListBoxItemDescription>
                    </ListBoxItem>
                    <ListBoxItem
                      id={DeploymentAuth.Private}
                      textValue="All deployments"
                      isDisabled={!isTeam}
                    >
                      <ListBoxItemLabel>All deployments</ListBoxItemLabel>
                      <ListBoxItemDescription>
                        {isTeam ? "Protect all domains." : "Requires a team."}
                      </ListBoxItemDescription>
                    </ListBoxItem>
                  </ListBox>
                </Popover>
              </SelectField>
            )}
          </div>
        </CardBody>
        <FormCardFooter control={form.control}>
          Learn more about{" "}
          <Link
            href="https://argos-ci.com/docs/learn/deployments/access-protection"
            target="_blank"
          >
            deployment access protection
          </Link>
          .
        </FormCardFooter>
      </Form>
    </Card>
  );
}

const DEPLOYMENT_AUTH_DEFS: Record<DeploymentAuthLevel, { label: string }> = {
  [DeploymentAuth.DomainPrivate]: { label: "Standard protection" },
  [DeploymentAuth.Private]: { label: "All deployments" },
};

function getDeploymentAuthLevel(
  deploymentAuth: DeploymentAuth,
  isTeam: boolean,
): DeploymentAuthLevel {
  return isTeam && deploymentAuth === DeploymentAuth.Private
    ? DeploymentAuth.Private
    : DeploymentAuth.DomainPrivate;
}
