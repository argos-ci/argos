import { useCallback, useRef } from "react";
import { useMutation } from "@apollo/client";
import { BoxesIcon, PlusCircleIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { useSafeQuery } from "@/containers/Apollo";
import { graphql } from "@/gql";
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
import { PageLoader } from "@/ui/PageLoader";

import { NotFound } from "../NotFound";
import { AutomationRulesList } from "./AutomationRulesList";

const ProjectQuery = graphql(`
  query ProjectAutomations_project(
    $accountSlug: String!
    $projectName: String!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      slug
    }
  }
`);

const ProjectAutomationsQuery = graphql(`
  query ProjectAutomations_project_Automations(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
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

function PageContent(props: { accountSlug: string; projectName: string }) {
  const projectResult = useSafeQuery(ProjectQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
    },
  });

  const automationsResult = useSafeQuery(ProjectAutomationsQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
      after: 0,
      first: 20,
    },
  });

  const { fetchMore } = automationsResult;
  const automationResultRef = useRef(automationsResult);
  automationResultRef.current = automationsResult;

  const fetchNextPage = useCallback(() => {
    const displayCount =
      automationResultRef.current.data?.project?.automationRules.edges.length;
    fetchMore({
      variables: {
        after: displayCount,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (
          !prev.project?.automationRules?.edges ||
          !fetchMoreResult?.project?.automationRules
        ) {
          return fetchMoreResult;
        }

        return {
          ...prev,
          project: {
            ...prev.project,
            automationRules: {
              ...prev.project.automationRules,
              ...fetchMoreResult.project.automationRules,
              edges: [
                ...prev.project.automationRules.edges,
                ...fetchMoreResult.project.automationRules.edges,
              ],
            },
          },
        };
      },
    });
  }, [fetchMore]);

  const [deactivateAutomationRule] = useMutation(
    DeactivateAutomationRuleMutation,
    {
      update(cache, { data }) {
        if (!data?.deactivateAutomationRule?.id) return;
        const id = data.deactivateAutomationRule.id;
        // Find the project id in the cache
        const projectId = cache.identify({
          __typename: "Project",
          id:
            projectResult.data?.project?.id ||
            projectResult.previousData?.project?.id,
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

  const handleDelete = useCallback(
    (id: string) => {
      deactivateAutomationRule({ variables: { id } });
    },
    [deactivateAutomationRule],
  );

  if (
    !(projectResult.data || projectResult.previousData) ||
    !(automationsResult.data || automationsResult.previousData)
  ) {
    return <PageLoader />;
  }

  const project =
    projectResult.data?.project || projectResult.previousData?.project;
  const automationRules =
    automationsResult.data?.project?.automationRules ||
    automationsResult.previousData?.project?.automationRules;

  if (!project || !automationRules) {
    return <NotFound />;
  }

  if (automationRules.pageInfo.totalCount === 0) {
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
          automationRules={automationRules}
          fetchNextPage={fetchNextPage}
          fetching={automationsResult.loading}
          onDelete={handleDelete}
        />
      </div>
    </PageContainer>
  );
}

/** @route */
export function Component() {
  const { accountSlug, projectName } = useParams();

  if (!accountSlug || !projectName) {
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
