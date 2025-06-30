import { useApolloClient, useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { SettingsLayout } from "@/containers/Layout";
import { graphql, type DocumentType } from "@/gql";
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
import {
  TestAutomationButton,
  useTestAutomation,
} from "./AutomationTestNotification";

const ProjectQuery = graphql(`
  query ProjectNewAutomation_project(
    $accountSlug: String!
    $projectName: String!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      buildNames
      account {
        __typename
        id
      }
    }
  }
`);

type ProjectDocument = NonNullable<
  DocumentType<typeof ProjectQuery>["project"]
>;

const CreateAutomationMutation = graphql(`
  mutation NewAutomation_createAutomation(
    $projectId: String!
    $name: String!
    $events: [String!]!
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
      createdAt
      name
      on
    }
  }
`);

function NewAutomationPage() {
  const params = useProjectParams();
  invariant(params, "Project params are required");

  const {
    data: { project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });

  if (!project || project.account?.__typename !== "Team") {
    return <NotFound />;
  }

  return (
    <Page>
      <Helmet>
        <title>
          New Automation Rule • {params.accountSlug}/{params.projectName}
        </title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>New Automation Rule</Heading>
            <Text slot="headline">
              Trigger actions when specific events occur in your project.
            </Text>
          </PageHeaderContent>
        </PageHeader>

        <SettingsLayout>
          <NewAutomationForm project={project} />
        </SettingsLayout>
      </PageContainer>
    </Page>
  );
}

function NewAutomationForm(props: { project: ProjectDocument }) {
  const { project } = props;
  const params = useProjectParams();
  invariant(params, "Project params are required");
  const client = useApolloClient();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(AutomationFieldValuesSchema),
    defaultValues: {
      name: "",
      events: [],
      conditions: [],
      actions: [],
    },
  });

  const testAutomation = useTestAutomation({ projectId: project.id });

  const onSubmit: SubmitHandler<AutomationTransformedValues> = async (
    data,
    event,
  ) => {
    if (await testAutomation.onSubmit(data, event)) {
      return;
    }

    await client.mutate({
      mutation: CreateAutomationMutation,
      variables: {
        projectId: project.id,
        ...formDataToVariables(data),
      },
      update(cache, { data }) {
        const newAutomation = data?.createAutomationRule;
        if (!newAutomation) return;

        const projectIdInCache = cache.identify({
          __typename: "Project",
          id: project.id,
        });
        if (!projectIdInCache) return;

        cache.modify({
          id: projectIdInCache,
          fields: {
            automationRules(existingAutomationRules = {}) {
              return {
                ...existingAutomationRules,
                edges: [
                  ...(existingAutomationRules.edges ?? []),
                  newAutomation,
                ],
                pageInfo: {
                  ...existingAutomationRules.pageInfo,
                  totalCount:
                    (existingAutomationRules.pageInfo?.totalCount ?? 0) + 1,
                },
              };
            },
          },
        });
      },
    });
    navigate(`${getProjectURL(params)}/automations`, {
      replace: true,
    });
  };

  return (
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
              <FormRootError form={form} />
            </div>
          </CardBody>

          <CardFooter>
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <LinkButton
                href={`${getProjectURL(params)}/automations`}
                variant="secondary"
                className="order-2"
              >
                Cancel
              </LinkButton>
              <Button
                type="submit"
                isDisabled={form.formState.isSubmitting}
                className="order-3"
              >
                Create Rule
              </Button>
              <div className="order-1">
                <TestAutomationButton
                  {...testAutomation.buttonProps}
                  isDisabled={form.formState.isSubmitting}
                />
              </div>
            </div>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
}

/** @route */
export function Component() {
  const { permissions } = useProjectOutletContext();
  const hasAdminPermission = permissions.includes(ProjectPermission.Admin);

  if (!hasAdminPermission) {
    return <NotFound />;
  }

  return <NewAutomationPage />;
}
