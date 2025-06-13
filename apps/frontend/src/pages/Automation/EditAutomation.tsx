import { useApolloClient } from "@apollo/client";
import { assertNever } from "@argos/util/assertNever";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { useSafeQuery } from "@/containers/Apollo";
import { SettingsLayout } from "@/containers/Layout";
import { DocumentType, graphql } from "@/gql";
import {
  AutomationActionType,
  AutomationConditionType,
  AutomationEvent,
  ProjectPermission,
} from "@/gql/graphql";
import { Button, LinkButton } from "@/ui/Button";
import { Card, CardBody, CardFooter } from "@/ui/Card";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";
import { entries } from "@/util/entries";

import { Form } from "../../ui/Form";
import { Tooltip } from "../../ui/Tooltip";
import { NotFound } from "../NotFound";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import { AutomationNameField, FormErrors } from "./AutomationForm";
import { AutomationActionsStep } from "./AutomationFormActionsStep";
import { AutomationConditionsStep } from "./AutomationFormConditionsStep";
import { AutomationWhenStep } from "./AutomationFormWhenStep";

const ProjectQuery = graphql(`
  query ProjectEditAutomation_project(
    $accountSlug: String!
    $projectName: String!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      buildNames
    }
  }
`);

const AutomationRuleQuery = graphql(`
  query ProjectEditAutomation_automationRule($id: String!) {
    automationRule(id: $id) {
      id
      name
      on
      if {
        all {
          type
          value
        }
      }
      then {
        action
        actionPayload {
          ... on AutomationActionSendSlackMessagePayload {
            channelId
            slackId
            name
          }
        }
      }
    }
  }
`);

const UpdateAutomationMutation = graphql(`
  mutation EditAutomation_updateAutomation(
    $id: String!
    $name: String!
    $events: [AutomationEvent!]!
    $conditions: [AutomationConditionInput!]!
    $actions: [AutomationActionInput!]!
  ) {
    updateAutomationRule(
      input: {
        id: $id
        name: $name
        events: $events
        conditions: $conditions
        actions: $actions
      }
    ) {
      id
      name
      on
      if {
        all {
          type
          value
        }
      }
      then {
        action
        actionPayload {
          ... on AutomationActionSendSlackMessagePayload {
            channelId
            slackId
            name
          }
        }
      }
    }
  }
`);

type ProjectRuleDocument = DocumentType<typeof ProjectQuery>;
type Project = NonNullable<ProjectRuleDocument["project"]>;
type AutomationRuleDocument = DocumentType<typeof AutomationRuleQuery>;
type AutomationRule = NonNullable<AutomationRuleDocument["automationRule"]>;

export type EditAutomationInputs = {
  name: string;
  events: AutomationEvent[];
  conditions: Record<AutomationConditionType, string>;
  actions: { type: AutomationActionType; payload: any }[];
};

function EditAutomationForm({
  automationRule,
  project,
  accountSlug,
  projectName,
  editPermission,
}: {
  automationRule: AutomationRule;
  project: Project;
  accountSlug: string;
  projectName: string;
  editPermission: boolean;
}) {
  const client = useApolloClient();
  const navigate = useNavigate();

  const form = useForm<EditAutomationInputs>({
    defaultValues: {
      name: automationRule?.name || "",
      events: automationRule?.on || [],
      conditions:
        automationRule?.if?.all?.reduce(
          (acc, c) => {
            acc[c.type as AutomationConditionType] = c.value;
            return acc;
          },
          {} as Record<AutomationConditionType, string>,
        ) || {},
      actions:
        automationRule?.then?.map((a) => ({
          type: a.action,
          payload: a.actionPayload,
        })) || [],
    },
  });

  const onSubmit: SubmitHandler<EditAutomationInputs> = async (data) => {
    if (!editPermission) {
      throw new Error("You do not have permission to edit this automation.");
    }
    await client.mutate({
      mutation: UpdateAutomationMutation,
      variables: {
        id: automationRule.id,
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
                  channelId: payload.channelId,
                  name: payload.name,
                  slackId: payload.slackId,
                },
              };

            default:
              assertNever(type, `Unknown action type: ${type}`);
          }
        }),
      },
    });
    navigate(`/${accountSlug}/${projectName}/automations`, {
      replace: true,
    });
  };

  return (
    <Page>
      <Helmet>
        <title>Edit Automation</title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>Edit Automation Rule</Heading>
            <Text slot="headline">Edit this automation for the project.</Text>
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
                    <LinkButton href={`../automations`} variant="secondary">
                      {editPermission ? "Cancel" : "Back"}
                    </LinkButton>

                    <Tooltip
                      content={
                        editPermission
                          ? ""
                          : "You don't have permission to edit this automation."
                      }
                    >
                      <div className="flex">
                        <Button
                          type="submit"
                          isDisabled={
                            !editPermission || form.formState.isSubmitting
                          }
                        >
                          Save Changes
                        </Button>
                      </div>
                    </Tooltip>
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

function PageContent(props: {
  accountSlug: string;
  projectName: string;
  automationId: string;
  editPermission: boolean;
}) {
  const projectResult = useSafeQuery(ProjectQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
    },
  });

  const project = projectResult.data?.project;

  const automationRuleResult = useSafeQuery(AutomationRuleQuery, {
    variables: { id: props.automationId },
    skip: !project,
  });

  const automationRule = automationRuleResult.data?.automationRule;

  if (!projectResult.data || !automationRuleResult.data) {
    return <PageLoader />;
  }

  if (!project || !automationRule) {
    return <NotFound />;
  }

  return (
    <EditAutomationForm
      automationRule={automationRule}
      project={project}
      accountSlug={props.accountSlug}
      projectName={props.projectName}
      editPermission={props.editPermission}
    />
  );
}

/** @route */
export function Component() {
  const { accountSlug, projectName, automationId } = useParams();
  const { permissions } = useProjectOutletContext();
  const hasEditPermission = permissions.includes(ProjectPermission.Admin);
  const hasReadPermission = permissions.includes(
    ProjectPermission.ViewSettings,
  );

  if (!accountSlug || !projectName || !automationId || !hasReadPermission) {
    return <NotFound />;
  }

  return (
    <Page>
      <Helmet>
        <title>
          {accountSlug}/{projectName} • {hasEditPermission ? "Edit" : "View"}{" "}
          Automation
        </title>
      </Helmet>
      <PageContent
        accountSlug={accountSlug}
        projectName={projectName}
        automationId={automationId}
        editPermission={hasEditPermission}
      />
    </Page>
  );
}
