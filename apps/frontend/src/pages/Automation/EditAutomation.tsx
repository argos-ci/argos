import { useApolloClient, useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { CheckCircle2Icon, CircleDotIcon, XCircleIcon } from "lucide-react";
import { DialogTrigger, Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { SettingsPage } from "@/containers/Layout";
import { DocumentType, graphql } from "@/gql";
import { AutomationActionRunStatus, ProjectPermission } from "@/gql/graphql";
import { Button, LinkButton } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Modal } from "@/ui/Modal";
import { Tooltip } from "@/ui/Tooltip";

import { Time } from "../../ui/Time";
import { NotFound } from "../NotFound";
import { useProjectOutletContext } from "../Project/ProjectOutletContext";
import { getProjectURL, useProjectParams } from "../Project/ProjectParams";
import {
  AutomationFieldValuesSchema,
  AutomationNameField,
  formDataToVariables,
  type AutomationTransformedValues,
} from "./AutomationForm";
import { ACTIONS, AutomationActionsStep } from "./AutomationFormActionsStep";
import { AutomationConditionsStep } from "./AutomationFormConditionsStep";
import { AutomationWhenStep } from "./AutomationFormWhenStep";
import { useAutomationParams } from "./AutomationParams";
import { TestAutomationButton } from "./AutomationTestNotification";
import { DeleteAutomationDialog } from "./DeleteAutomation";

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
        all
      }
      then {
        action
        actionPayload
      }
      actionRuns {
        id
        createdAt
        actionName
        status
        completedAt
        failureReason
      }
    }
  }
`);

const UpdateAutomationMutation = graphql(`
  mutation EditAutomation_updateAutomation(
    $id: String!
    $name: String!
    $events: [String!]!
    $conditions: [JSONObject!]!
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
        all
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
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <div className="flex flex-col gap-6">
            <AutomationNameField form={form} />
            <AutomationWhenStep form={form} />
            <AutomationConditionsStep
              form={form}
              projectBuildNames={project.buildNames}
            />
            <AutomationActionsStep form={form} />
            <div>
              <TestAutomationButton
                form={form}
                projectId={project.id}
                isDisabled={!hasEditPermission || form.formState.isSubmitting}
              />
            </div>
            <FormRootError control={form.control} />
          </div>
        </CardBody>

        <CardFooter>
          <div className="flex items-center gap-2">
            <div className="flex flex-1">
              <DialogTrigger>
                <Button variant="destructive">Delete</Button>
                <Modal>
                  <DeleteAutomationDialog
                    automationRuleId={automationRule.id}
                    projectId={project.id}
                    onCompleted={() => {
                      navigate(`${getProjectURL(params)}/automations`, {
                        replace: true,
                      });
                    }}
                  />
                </Modal>
              </DialogTrigger>
            </div>
            <LinkButton
              href={`${getProjectURL(params)}/automations`}
              variant="secondary"
              className="order-2"
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
              <Button
                type="submit"
                isDisabled={!hasEditPermission || form.formState.isSubmitting}
                className="order-3"
              >
                Save Changes
              </Button>
            </Tooltip>
          </div>
        </CardFooter>
      </Form>
    </Card>
  );
}

export const AutomationActionRunStatusIcon = ({
  status,
}: {
  status: string;
}) => {
  const iconClassName = "shrink-0 size-3";

  switch (status) {
    case AutomationActionRunStatus.Aborted:
    case AutomationActionRunStatus.Failed:
    case AutomationActionRunStatus.Error:
      return (
        <>
          <XCircleIcon className={clsx(iconClassName, "text-danger-low")} />
          <span className="capitalize">{status}</span>
        </>
      );

    case AutomationActionRunStatus.Success:
      return (
        <>
          <CheckCircle2Icon
            className={clsx(iconClassName, "text-success-low")}
          />
          <span className="capitalize">{status}</span>
        </>
      );

    case AutomationActionRunStatus.Pending:
    case AutomationActionRunStatus.Progress:
      return (
        <>
          <CircleDotIcon className={clsx(iconClassName, "text-warning-low")} />
          <span className="capitalize">{status}</span>
        </>
      );

    default:
      throw new Error(`Unexpected status for AutomationActionRunId ${status}`);
  }
};

function ActionRunHistory(props: { automationRule: AutomationRule }) {
  const { automationRule } = props;

  if (!automationRule.actionRuns.length) {
    return <Text slot="description">No actions have been run yet.</Text>;
  }

  return (
    <Card>
      <CardBody>
        <CardTitle>Recent action runs</CardTitle>
        <CardParagraph>
          Showing the 20 most recent actions triggered by this rule.
        </CardParagraph>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Action</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Completed At</th>
                <th className="py-2 text-left">Failure Reason</th>
              </tr>
            </thead>
            <tbody>
              {automationRule.actionRuns.map((run) => {
                const action = ACTIONS.find((a) => a.type === run.actionName);

                return (
                  <tr key={run.id} className="border-b align-top last:border-0">
                    <td className="py-2 font-medium">{action?.label}</td>
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <AutomationActionRunStatusIcon status={run.status} />
                      </span>
                    </td>
                    <td className="py-2">
                      {run.completedAt ? (
                        <Time date={run.completedAt} />
                      ) : (
                        <span className="text-low">—</span>
                      )}
                    </td>
                    <td className="max-w-xs py-2 whitespace-pre-line">
                      {run.failureReason ? (
                        <span className="text-danger-low">
                          {run.failureReason}
                        </span>
                      ) : (
                        <span className="text-low">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
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
          {automationRule.name} • {params.accountSlug}/{params.projectName}
        </title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>{automationRule.name}</Heading>
            <Text slot="headline">
              Edit this automation rule and view the history of recent action
              runs.
            </Text>
          </PageHeaderContent>
        </PageHeader>
        <SettingsPage>
          <EditAutomationForm
            automationRule={automationRule}
            project={project}
            hasEditPermission={hasEditPermission}
          />

          <ActionRunHistory automationRule={automationRule} />
        </SettingsPage>
      </PageContainer>
    </Page>
  );
}

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
