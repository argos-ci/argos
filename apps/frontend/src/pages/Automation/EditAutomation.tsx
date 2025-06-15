import { useApolloClient, useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { SettingsLayout } from "@/containers/Layout";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { Button, LinkButton } from "@/ui/Button";
import { Card, CardBody, CardFooter } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Tooltip } from "@/ui/Tooltip";

import { NotFound } from "../NotFound";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import { getProjectURL, useProjectParams } from "../Project/ProjectParams";
import {
  AutomationFieldValuesSchema,
  AutomationNameField,
  formDataToVariables,
  type AutomationTransformedValues,
} from "./AutomationForm";
import { AutomationActionsStep } from "./AutomationFormActionsStep";
import { AutomationConditionsStep } from "./AutomationFormConditionsStep";
import { AutomationWhenStep } from "./AutomationFormWhenStep";
import { useAutomationParams } from "./AutomationParams";

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
        actionPayload
      }
    }
  }
`);

const UpdateAutomationMutation = graphql(`
  mutation EditAutomation_updateAutomation(
    $id: String!
    $name: String!
    $events: [String!]!
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
        actionPayload
      }
    }
  }
`);

type AllDocument = DocumentType<typeof AutomationRuleQuery>;
type Project = NonNullable<AllDocument["project"]>;
type AutomationRule = NonNullable<AllDocument["automationRule"]>;

function EditAutomationForm(props: {
  automationRule: AutomationRule;
  project: Project;
  hasEditPermission: boolean;
}) {
  const { automationRule, project, hasEditPermission } = props;
  const params = useProjectParams();
  invariant(params, "Project params are required");
  const client = useApolloClient();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(AutomationFieldValuesSchema),
    defaultValues: AutomationFieldValuesSchema.parse({
      name: automationRule.name,
      events: automationRule.on,
      conditions: automationRule.if.all,
      actions: automationRule.then.map((action) => ({
        type: action.action,
        payload: action.actionPayload,
      })),
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
    navigate(`${getProjectURL(params)}/automations`, {
      replace: true,
    });
  };

  return (
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
            <FormRootError form={form} />
          </div>
        </CardBody>

        <CardFooter>
          <div className="flex justify-end gap-2">
            <LinkButton
              href={`${getProjectURL(params)}/automations`}
              variant="secondary"
            >
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
                  isDisabled={!hasEditPermission || form.formState.isSubmitting}
                >
                  Save Changes
                </Button>
              </div>
            </Tooltip>
          </div>
        </CardFooter>
      </Form>
    </FormProvider>
  );
}

function AutomationPage() {
  const params = useAutomationParams();
  invariant(params, "Automation params are required");

  const { permissions } = useProjectOutletContext();
  const hasEditPermission = permissions.includes(ProjectPermission.Admin);

  const {
    data: { project, automationRule },
  } = useSuspenseQuery(AutomationRuleQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      id: params.automationId,
    },
  });

  if (!automationRule || project?.account?.__typename !== "Team") {
    return <NotFound />;
  }

  return (
    <Page>
      <Helmet>
        <title>
          {params.accountSlug}/{params.projectName} •{" "}
          {hasEditPermission ? "Edit" : "View"} Automation
        </title>
      </Helmet>
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
              <EditAutomationForm
                automationRule={automationRule}
                project={project}
                hasEditPermission={hasEditPermission}
              />
            </Card>
          </SettingsLayout>
        </PageContainer>
      </Page>
    </Page>
  );
}

/** @route */
export function Component() {
  const params = useAutomationParams();
  invariant(params, "Automation params are required");
  const { permissions } = useProjectOutletContext();
  const hasReadPermission = permissions.includes(
    ProjectPermission.ViewSettings,
  );

  if (!hasReadPermission) {
    return <NotFound />;
  }

  return <AutomationPage />;
}
