import { useQuery } from "@apollo/client/react";
import { FolderCodeIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";

import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { EmptyState, EmptyStateIcon } from "@/ui/Layout";
import { List, ListRow } from "@/ui/List";
import { Loader } from "@/ui/Loader";
import { Time } from "@/ui/Time";
import { Truncable } from "@/ui/Truncable";

const ProjectsQuery = graphql(`
  query GitlabProjectList_glApiProjects(
    $accountId: ID!
    $userId: ID
    $groupId: ID
    $allProjects: Boolean!
    $page: Int!
    $search: String
  ) {
    glApiProjects(
      userId: $userId
      groupId: $groupId
      allProjects: $allProjects
      accountId: $accountId
      page: $page
      search: $search
    ) {
      edges {
        id
        name
        last_activity_at
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`);

export type GitlabProjectListProps = {
  accountId: string;
  onSelectProject: (project: { id: string }) => void;
  disabled?: boolean;
  connectButtonLabel: string;
  search: string;
  allProjects: boolean;
} & (
  | { groupId: string; userId?: never }
  | { groupId?: never; userId: string }
  | { groupId?: never; userId?: never }
);

export function GitlabProjectList(props: GitlabProjectListProps) {
  const result = useQuery(ProjectsQuery, {
    variables: {
      accountId: props.accountId,
      userId: props.userId,
      groupId: props.groupId,
      allProjects: props.allProjects,
      search: props.search,
      page: 1,
    },
  });

  if (result.error) {
    throw result.error;
  }

  const data = result.data || result.previousData;

  if (!data) {
    return <Loader className="size-16" />;
  }

  const { glApiProjects } = data;

  if (glApiProjects.edges.length === 0) {
    return (
      <EmptyState>
        <EmptyStateIcon>
          <FolderCodeIcon strokeWidth={1} />
        </EmptyStateIcon>
        <Heading>No projects in this namespace</Heading>
        <Text slot="description">
          Your project may not be authorized yet on Argos or on another
          namespace.
        </Text>
      </EmptyState>
    );
  }
  return (
    <List>
      {glApiProjects.edges.map((project) => (
        <ListRow key={project.id} className="flex items-center gap-4 p-4">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Truncable>{project.name}</Truncable>
            <span className="text-low text-sm">•</span>
            <Time
              date={project.last_activity_at}
              className="text-low shrink-0 text-sm whitespace-nowrap"
            />
          </div>
          <Button
            onPress={() => {
              props.onSelectProject(project);
            }}
            isDisabled={props.disabled}
          >
            {props.connectButtonLabel}
          </Button>
        </ListRow>
      ))}
    </List>
  );
}
