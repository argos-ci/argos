import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { BoxesIcon, PlusCircleIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { useParams } from "react-router-dom";

import { DocumentType, graphql } from "@/gql";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";

import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "../Project/ProjectParams";
import { ProjectTitle } from "../Project/ProjectTitle";
import {
  AutomationRulesList,
  DeleteAutomation,
  useDeleteAutomationState,
} from "./AutomationRulesList";

const ProjectQuery = graphql(`
  query ProjectAutomations_project_Automations(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      account {
        __typename
        id
      }
      automationRules(first: $first, after: $after) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          createdAt
          name
          on
          lastAutomationRun {
            id
            createdAt
            status
            actionRuns {
              id
              createdAt
              actionName
              status
              completedAt
            }
          }
        }
      }
    }
  }
`);

type ProjectDocument = NonNullable<
  DocumentType<typeof ProjectQuery>["project"]
>;

export type AutomationRule =
  ProjectDocument["automationRules"]["edges"][number];

function AddAutomationButton(props: Omit<LinkButtonProps, "children">) {
  const { accountSlug, projectName } = useParams();
  return (
    <LinkButton
      href={`/${accountSlug}/${projectName}/automations/new`}
      {...props}
    >
      <ButtonIcon>
        <PlusCircleIcon />
      </ButtonIcon>
      New Automation
    </LinkButton>
  );
}

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const {
    data: { project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      after: 0,
      first: 50,
    },
  });

  const automationRuleConnection = project?.automationRules;
  const account = project?.account;
  const isTeam = account?.__typename === "Team";

  if (!project || !automationRuleConnection || !isTeam) {
    return <NotFound />;
  }

  return (
    <PageContainer>
      <PageContentFound project={project} />
    </PageContainer>
  );
}

function PageContentFound(props: { project: ProjectDocument }) {
  const { project } = props;

  const deleteAutomationState = useDeleteAutomationState();

  return (
    <>
      {project.automationRules.pageInfo.totalCount === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <BoxesIcon strokeWidth={1} />
          </EmptyStateIcon>
          <Heading>No automations</Heading>
          <Text slot="description">
            There is no automations yet on this project.
          </Text>
          <EmptyStateActions>
            <AddAutomationButton />
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <>
          <PageHeader>
            <PageHeaderContent>
              <Heading>Automations Rules</Heading>
              <Text slot="headline">
                Set up rules to trigger actions or notifications when specific
                events happen in your project.
              </Text>
            </PageHeaderContent>
            <PageHeaderActions>
              <AddAutomationButton variant="secondary" />
            </PageHeaderActions>
          </PageHeader>
          <div className="relative flex-1">
            <AutomationRulesList
              automationRules={project.automationRules.edges}
              onDelete={deleteAutomationState.setDeletedId}
            />
          </div>
        </>
      )}
      {/* When we delete the last automation we want to preserve the animation*/}
      <DeleteAutomation state={deleteAutomationState} projectId={project.id} />
    </>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "Project params are required");

  return (
    <Page>
      <ProjectTitle params={params}>Automations</ProjectTitle>
      <PageContent params={params} />
    </Page>
  );
}
