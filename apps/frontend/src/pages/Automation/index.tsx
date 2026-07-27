import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { FilterIcon, PlusCircleIcon, SendIcon, ZapIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { useParams } from "react-router";

import { AutomationsIllustration } from "@/containers/EmptyStateIllustrations";
import { DocumentType, graphql } from "@/gql";
import { ButtonIcon, LinkButton, LinkButtonProps } from "@/ui/Button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIllustration,
  EmptyStateLearnMore,
  EmptyStateStep,
  EmptyStateSteps,
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
          <EmptyStateIllustration>
            <AutomationsIllustration />
          </EmptyStateIllustration>
          <Heading>No automations yet</Heading>
          <Text slot="description">
            An automation watches for something happening on this project and
            reacts to it, so nobody has to notice and relay it by hand.
          </Text>
          <EmptyStateActions>
            <AddAutomationButton />
          </EmptyStateActions>
          <EmptyStateLearnMore href="https://argos-ci.com/docs/learn/review-workflow/automations" />
          <EmptyStateSteps>
            <EmptyStateStep
              icon={<ZapIcon />}
              step="When"
              title="Pick a trigger"
            >
              Start from a build event — a review submitted, a build failing, an
              auto-approved build finishing.
            </EmptyStateStep>
            <EmptyStateStep
              icon={<FilterIcon />}
              step="If"
              title="Narrow it down"
            >
              Add conditions so the rule only fires on the branches or build
              names you actually care about.
            </EmptyStateStep>
            <EmptyStateStep
              icon={<SendIcon />}
              step="Then"
              title="Send it somewhere"
            >
              Post to Slack or Microsoft Teams, so the right channel hears about
              it the moment it happens.
            </EmptyStateStep>
          </EmptyStateSteps>
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
