import { useState } from "react";
import { invariant } from "@argos/util/invariant";

import { useSafeQuery } from "@/containers/Apollo";
import { useAssertAuthTokenPayload } from "@/containers/Auth";
import { ProjectContributorLevelLabel } from "@/containers/ProjectContributor";
import { RemoveMenu, UserListRow } from "@/containers/UserList";
import { graphql } from "@/gql";
import {
  List,
  ListEmpty,
  ListLoadMore,
  ListRowLoader,
  ListTitle,
} from "@/ui/List";
import { Modal } from "@/ui/Modal";

import { ProjectContributorLevelSelect } from "./ProjectContributorLevelSelect";
import {
  LeaveProjectDialog,
  RemovedUser,
  RemoveFromProjectDialog,
} from "./ProjectRemoveContributor";

const NB_MEMBERS_PER_PAGE = 10;

const ProjectContributorsQuery = graphql(`
  query ProjectContributorsQuery($projectId: ID!, $after: Int, $first: Int) {
    project: projectById(id: $projectId) {
      id
      contributors(after: $after, first: $first) {
        edges {
          id
          level
          user {
            id
            ...UserListRow_user
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`);

export function ProjectContributorsList(props: {
  projectId: string;
  projectName: string;
  readOnly: boolean;
}) {
  const authPayload = useAssertAuthTokenPayload();
  const [removedUser, setRemovedUser] = useState<RemovedUser | null>(null);
  const removeModal = {
    isOpen: removedUser !== null,
    onOpenChange: (open: boolean) => {
      if (!open) {
        setRemovedUser(null);
      }
    },
  };
  const result = useSafeQuery(ProjectContributorsQuery, {
    variables: {
      projectId: props.projectId,
      after: 0,
      first: NB_MEMBERS_PER_PAGE,
    },
  });
  return (
    <>
      <div className="my-4">
        <ListTitle>Project contributors</ListTitle>
        {(() => {
          if (!result.data) {
            return (
              <List>
                <ListRowLoader>Loading contributors…</ListRowLoader>
              </List>
            );
          }
          invariant(result.data.project, "Project not found");
          const contributors = result.data.project.contributors.edges;
          return (
            <>
              {contributors.length > 0 ? (
                <List>
                  {contributors.map((contributor) => {
                    const isMe = authPayload.account.id === contributor.user.id;
                    const user = contributor.user;
                    return (
                      <UserListRow key={contributor.id} user={user}>
                        <div>
                          {props.readOnly ? (
                            <div className="text-sm">
                              {ProjectContributorLevelLabel[contributor.level]}
                            </div>
                          ) : (
                            <ProjectContributorLevelSelect
                              projectId={props.projectId}
                              userId={user.id}
                              level={contributor.level}
                            />
                          )}
                        </div>
                        {(isMe || !props.readOnly) && (
                          <RemoveMenu
                            label="Contributor actions"
                            actionLabel={
                              isMe ? "Leave Project" : "Remove from Project"
                            }
                            onRemove={() => setRemovedUser(user)}
                          />
                        )}
                      </UserListRow>
                    );
                  })}
                </List>
              ) : (
                <ListEmpty>There's no contributors yet.</ListEmpty>
              )}
              {result.data.project.contributors.pageInfo.hasNextPage && (
                <ListLoadMore
                  onPress={() => {
                    result.fetchMore({
                      variables: { after: contributors.length },
                      updateQuery: (prev, { fetchMoreResult }) => {
                        if (!fetchMoreResult?.project || !prev?.project) {
                          return prev;
                        }
                        return {
                          project: {
                            ...prev.project,
                            contributors: {
                              ...prev.project.contributors,
                              ...fetchMoreResult.project.contributors,
                              edges: [
                                ...prev.project.contributors.edges,
                                ...fetchMoreResult.project.contributors.edges,
                              ],
                            },
                          },
                        };
                      },
                    });
                  }}
                />
              )}
            </>
          );
        })()}
      </div>
      <Modal {...removeModal}>
        {removedUser ? (
          authPayload.account.id === removedUser.id ? (
            <LeaveProjectDialog
              projectId={props.projectId}
              projectName={props.projectName}
              userAccountId={removedUser.id}
            />
          ) : (
            <RemoveFromProjectDialog
              projectId={props.projectId}
              projectName={props.projectName}
              user={removedUser}
            />
          )
        ) : null}
      </Modal>
    </>
  );
}
