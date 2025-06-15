import { useMutation, useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { BoxesIcon, PlusCircleIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
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
import { useProjectParams } from "../Project/ProjectParams";
import { AutomationRulesList } from "./AutomationRulesList";

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
          lastAutomationRunDate
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

const DeactivateAutomationRuleMutation = graphql(`
  mutation Automations_deactivateAutomationRule($id: String!) {
    deactivateAutomationRule(id: $id) {
      id
    }
  }
`);

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
      Add Automation
    </LinkButton>
  );
}

function PageContent(props: { project: ProjectDocument }) {
  const { project } = props;
  const [deactivateAutomationRule] = useMutation(
    DeactivateAutomationRuleMutation,
    {
      update(cache, { data }) {
        if (!data?.deactivateAutomationRule?.id) return;
        const id = data.deactivateAutomationRule.id;
        // Find the project id in the cache
        const projectId = cache.identify({
          __typename: "Project",
          id: project?.id,
        });
        if (!projectId) return;
        cache.modify({
          id: projectId,
          fields: {
            automationRules(existingAutomationRules = {}, { readField }) {
              if (!existingAutomationRules.edges) {
                return existingAutomationRules;
              }

              return {
                ...existingAutomationRules,
                edges: existingAutomationRules.edges.filter(
                  (ruleRef: any) => readField("id", ruleRef) !== id,
                ),
                pageInfo: {
                  ...existingAutomationRules.pageInfo,
                  totalCount: existingAutomationRules.pageInfo.totalCount - 1,
                },
              };
            },
          },
        });
      },
    },
  );

  const automationRuleConnection = project?.automationRules;
  const account = project?.account;
  const isTeam = account?.__typename === "Team";

  if (!project || !automationRuleConnection || !isTeam) {
    return <NotFound />;
  }

  if (automationRuleConnection.pageInfo.totalCount === 0) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIcon>
            <BoxesIcon strokeWidth={1} />
          </EmptyStateIcon>
          <Heading>No automation</Heading>
          <Text slot="description">
            There is no automation yet on this project.
          </Text>
          <EmptyStateActions>
            <AddAutomationButton />
          </EmptyStateActions>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Automations</Heading>
          <Text slot="headline">
            View all the automations associated with this project.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions>
          <AddAutomationButton variant="secondary" />
        </PageHeaderActions>
      </PageHeader>
      <div className="relative flex-1">
        <AutomationRulesList
          automationRules={automationRuleConnection.edges}
          onDelete={(id: string) => {
            deactivateAutomationRule({ variables: { id } });
          }}
        />
      </div>
    </PageContainer>
  );
}

/** @route */
export function Component() {
  const params = useProjectParams();
  invariant(params, "Project params are required");
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

  if (project?.account?.__typename !== "Team") {
    return <NotFound />;
  }

  return (
    <Page>
      <Helmet>
        <title>
          {params.accountSlug}/{params.projectName} • Automations
        </title>
      </Helmet>
      <PageContent project={project} />
    </Page>
  );
}
