import { useApolloClient, useSuspenseQuery } from "@apollo/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { SettingsLayout } from "@/containers/Layout";
import { DocumentType, graphql } from "@/gql";
import { AutomationConditionType, ProjectPermission } from "@/gql/graphql";
import { Button, LinkButton } from "@/ui/Button";
import { Card, CardBody, CardFooter } from "@/ui/Card";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";

import { Form } from "../../ui/Form";
import { Tooltip } from "../../ui/Tooltip";
import { NotFound } from "../NotFound";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import {
  AutomationNameField,
  formDataToVariables,
  FormErrors,
} from "./AutomationForm";
import { AutomationActionsStep } from "./AutomationFormActionsStep";
import { AutomationConditionsStep } from "./AutomationFormConditionsStep";
import { AutomationWhenStep } from "./AutomationFormWhenStep";
import {
  AutomationFieldValuesSchema,
  type AutomationTransformedValues,
} from "./types";

const AutomationRuleQuery = graphql(`
  query ProjectEditAutomation_automationRule(
    $accountSlug: String!
    $projectName: String!
    $id: String!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      buildNames
      account {
        id
        __typename
      }
    }

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

type ProjectRuleDocument = DocumentType<typeof AutomationRuleQuery>;
type Project = NonNullable<ProjectRuleDocument["project"]>;
type AutomationRuleDocument = DocumentType<typeof AutomationRuleQuery>;
type AutomationRule = NonNullable<AutomationRuleDocument["automationRule"]>;

function EditAutomationForm({
  automationRule,
  project,
  accountSlug,
  projectName,
  hasEditPermission,
}: {
  automationRule: AutomationRule;
  project: Project;
  accountSlug: string;
  projectName: string;
  hasEditPermission: boolean;
}) {
  const client = useApolloClient();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(AutomationFieldValuesSchema),
    defaultValues: AutomationFieldValuesSchema.parse({
      name: automationRule?.name ?? "",
      events: automationRule?.on ?? [],
      conditions:
        automationRule?.if?.all?.reduce<
          Partial<Record<AutomationConditionType, string | null>>
        >((acc, c) => {
          acc[c.type] = c.value;
          return acc;
        }, {}) ?? {},
      actions:
        automationRule?.then?.map((a) => ({
          type: a.action,
          payload: a.actionPayload,
        })) ?? [],
    }),
  });

  const onSubmit: SubmitHandler<AutomationTransformedValues> = async (data) => {
    if (!hasEditPermission) {
      throw new Error("You do not have permission to edit this automation.");
    }
    await client.mutate({
      mutation: UpdateAutomationMutation,
      variables: {
        id: automationRule.id,
        ...formDataToVariables(data),
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
            <Heading>{automationRule.name}</Heading>
            <Text slot="headline">Edit this automation for the project.</Text>
          </PageHeaderContent>
        </PageHeader>
        <SettingsLayout>
          <Card>
            <FormProvider {...form}>
              <Form onSubmit={onSubmit}>
                <CardBody>
                  <div className="flex flex-col gap-6">
                    <AutomationNameField form={form} />
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
                      {hasEditPermission ? "Cancel" : "Back"}
                    </LinkButton>

                    <Tooltip
                      content={
                        hasEditPermission
                          ? ""
                          : "You don't have permission to edit this automation."
                      }
                    >
                      <div className="flex">
                        <Button
                          type="submit"
                          isDisabled={
                            !hasEditPermission || form.formState.isSubmitting
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
  hasEditPermission: boolean;
}) {
  const {
    data: { project, automationRule },
  } = useSuspenseQuery(AutomationRuleQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
      id: props.automationId,
    },
  });

  const account = project?.account;
  const isTeam = account?.__typename === "Team";

  if (!project || !automationRule || !isTeam) {
    return <NotFound />;
  }

  return (
    <EditAutomationForm
      automationRule={automationRule}
      project={project}
      accountSlug={props.accountSlug}
      projectName={props.projectName}
      hasEditPermission={props.hasEditPermission}
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
        hasEditPermission={hasEditPermission}
      />
    </Page>
  );
}
