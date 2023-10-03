import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { List, ListRow } from "@/ui/List";
import { Loader } from "@/ui/Loader";
import { Time } from "@/ui/Time";

import { Query } from "./Apollo";

const ProjectsQuery = graphql(`
  query GitlabProjectList_glApiProjects(
    $userId: ID
    $groupId: ID
    $accessToken: String!
    $page: Int!
  ) {
    glApiProjects(
      userId: $userId
      groupId: $groupId
      accessToken: $accessToken
      page: $page
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
  namespace: {
    id: string;
    kind: string;
  };
  gitlabAccessToken: string;
  onSelectProject: (project: { id: string }) => void;
  disabled?: boolean;
  connectButtonLabel: string;
};

export const GitlabProjectList = (props: GitlabProjectListProps) => {
  const args = (() => {
    switch (props.namespace.kind) {
      case "user":
        return { userId: props.namespace.id };
      case "group":
        return { groupId: props.namespace.id };
      default:
        throw new Error("Invalid namespace kind");
    }
  })();
  return (
    <Query
      fallback={<Loader />}
      query={ProjectsQuery}
      variables={{ ...args, accessToken: props.gitlabAccessToken, page: 1 }}
    >
      {({ glApiProjects }) => {
        if (glApiProjects.edges.length === 0) {
          return (
            <div className="text-center">No projects in this namespace</div>
          );
        }
        return (
          <List className="overflow-auto">
            {glApiProjects.edges.map((project) => (
              <ListRow
                key={project.id}
                className="justify-between p-4 items-center"
              >
                <div>
                  {project.name} •{" "}
                  <Time date={project.last_activity_at} className="text-low" />
                </div>
                <Button
                  onClick={() => {
                    props.onSelectProject(project);
                  }}
                  disabled={props.disabled}
                >
                  {props.connectButtonLabel}
                </Button>
              </ListRow>
            ))}
          </List>
        );
      }}
    </Query>
  );
};
