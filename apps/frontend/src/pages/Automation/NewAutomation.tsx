import { useApolloClient } from "@apollo/client";
import { assertNever } from "@argos/util/assertNever";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { useSafeQuery } from "@/containers/Apollo";
import { SettingsLayout } from "@/containers/Layout";
import { graphql } from "@/gql";
import {
  AutomationActionType,
  AutomationConditionType,
  AutomationEvent,
  ProjectPermission,
} from "@/gql/graphql";
import { Button, LinkButton } from "@/ui/Button";
import { Card, CardBody, CardFooter } from "@/ui/Card";
import { Form } from "@/ui/Form";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";
import { entries } from "@/util/entries";

import { NotFound } from "../NotFound";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import { AutomationNameField, FormErrors } from "./AutomationForm";
import { AutomationActionsStep } from "./AutomationFormActionsStep";
import { AutomationConditionsStep } from "./AutomationFormConditionsStep";
import { AutomationWhenStep } from "./AutomationFormWhenStep";

const ProjectQuery = graphql(`
  query ProjectNewAutomation_project(
    $accountSlug: String!
    $projectName: String!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      buildNames
    }
  }
`);

const CreateAutomationMutation = graphql(`
  mutation NewAutomation_createAutomation(
    $projectId: String!
    $name: String!
    $events: [AutomationEvent!]!
    $conditions: [AutomationConditionInput!]!
    $actions: [AutomationActionInput!]!
  ) {
    createAutomationRule(
      input: {
        projectId: $projectId
        name: $name
        events: $events
        conditions: $conditions
        actions: $actions
      }
    ) {
      id
    }
  }
`);

export type NewAutomationInputs = {
  name: string;
  events: AutomationEvent[];
  conditions: Record<AutomationConditionType, string>;
  actions: { type: AutomationActionType; payload: any }[];
};

function PageContent(props: { accountSlug: string; projectName: string }) {
  const client = useApolloClient();
  const navigate = useNavigate();

  const form = useForm<NewAutomationInputs>({
    defaultValues: {
      name: "",
      events: [],
      conditions: {},
      actions: [],
    },
  });

  const projectResult = useSafeQuery(ProjectQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
    },
  });

  if (!projectResult.data) {
    return <PageLoader />;
  }

  const project = projectResult.data?.project;

  if (!project) {
    return <NotFound />;
  }

  const onSubmit: SubmitHandler<NewAutomationInputs> = async (data) => {
    await client.mutate({
      mutation: CreateAutomationMutation,
      variables: {
        projectId: project.id,
        name: data.name,
        events: data.events,
        conditions: entries(data.conditions).map(([type, value]) => ({
          type,
          value,
        })),
        actions: data.actions.map(({ type, payload }) => {
          switch (type) {
            case AutomationActionType.SendSlackMessage:
              return {
                type: type,
                payload: {
                  name: payload.slackChannelName,
                  slackId: payload.slackChannelId,
                },
              };

            default:
              assertNever(type, `Unknown action type: ${type}`);
          }
        }),
      },
    });
    navigate(`/${props.accountSlug}/${props.projectName}/automations`, {
      replace: true,
    });
  };

  return (
    <Page>
      <Helmet>
        <title>New Automation</title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>New Automation Rule</Heading>
            <Text slot="headline">
              Create a new automation for this project.
            </Text>
          </PageHeaderContent>
        </PageHeader>

        <SettingsLayout>
          <Card>
            <FormProvider {...form}>
              <Form onSubmit={onSubmit}>
                <CardBody>
                  <div className="flex flex-col gap-6">
                    <AutomationNameField form={form} name="name" />
                    <AutomationWhenStep form={form} />
                    <AutomationConditionsStep
                      form={form}
                      projectBuildNames={project.buildNames}
                    />
                    <AutomationActionsStep form={form} />
                    <FormErrors form={form} />
                  </div>
                </CardBody>

                <CardFooter>
                  <div className="flex justify-end gap-2">
                    <LinkButton href="../automations" variant="secondary">
                      Cancel
                    </LinkButton>
                    <Button
                      type="submit"
                      isDisabled={form.formState.isSubmitting}
                    >
                      Create Automation
                    </Button>
                  </div>
                </CardFooter>
              </Form>
            </FormProvider>
          </Card>
        </SettingsLayout>
      </PageContainer>
    </Page>
  );
}

/** @route */
export function Component() {
  const { accountSlug, projectName } = useParams();
  const { permissions } = useProjectOutletContext();
  const hasAdminPermission = permissions.includes(ProjectPermission.Admin);

  if (!accountSlug || !projectName || !hasAdminPermission) {
    return <NotFound />;
  }

  return (
    <Page>
      <Helmet>
        <title>
          {accountSlug}/{projectName} • Automations
        </title>
      </Helmet>
      <PageContent accountSlug={accountSlug} projectName={projectName} />
    </Page>
  );
}
