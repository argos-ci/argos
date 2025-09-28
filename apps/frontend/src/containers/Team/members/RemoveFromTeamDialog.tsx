import { memo } from "react";
import type { Reference } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

import { UserListRow } from "@/containers/UserList";
import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { List } from "@/ui/List";

const RemoveUserFromTeamMutation = graphql(`
  mutation TeamMembers_removeUserFromTeam(
    $teamAccountId: ID!
    $userAccountId: ID!
  ) {
    removeUserFromTeam(
      input: { teamAccountId: $teamAccountId, userAccountId: $userAccountId }
    ) {
      teamMemberId
    }
  }
`);

const _RemoveFromTeamDialogUserFragment = graphql(`
  fragment RemoveFromTeamDialog_User on User {
    id
    ...UserListRow_user
  }
`);

export type RemovedUser = DocumentType<
  typeof _RemoveFromTeamDialogUserFragment
>;

export const RemoveFromTeamDialog = memo(
  (props: { teamName: string; teamAccountId: string; user: RemovedUser }) => {
    const state = useOverlayTriggerState();
    const [removeFromTeam, { loading, error }] = useMutation(
      RemoveUserFromTeamMutation,
      {
        onCompleted() {
          state.close();
        },
        update(cache, { data }) {
          if (data?.removeUserFromTeam) {
            cache.modify({
              id: cache.identify({
                __typename: "Team",
                id: props.teamAccountId,
              }),
              fields: {
                members: (existingMembers, { readField }) => {
                  return {
                    ...existingMembers,
                    edges: existingMembers.edges.filter(
                      (ref: Reference) =>
                        readField("id", ref) !==
                        data.removeUserFromTeam.teamMemberId,
                    ),
                    pageInfo: {
                      ...existingMembers.pageInfo,
                      totalCount: existingMembers.pageInfo.totalCount - 1,
                    },
                  };
                },
              },
            });
          }
        },
        variables: {
          teamAccountId: props.teamAccountId,
          userAccountId: props.user.id,
        },
      },
    );
    return (
      <Dialog>
        <DialogBody confirm>
          <DialogTitle>Remove Team Member</DialogTitle>
          <DialogText>
            You are about to remove the following Team Member, are you sure you
            want to continue?
          </DialogText>
          <List className="text-left">
            <UserListRow user={props.user} />
          </List>
        </DialogBody>
        <DialogFooter>
          {error && (
            <ErrorMessage>Something went wrong. Please try again.</ErrorMessage>
          )}
          <DialogDismiss>Cancel</DialogDismiss>
          <Button
            isDisabled={loading}
            variant="destructive"
            onPress={() => {
              removeFromTeam().catch(() => {});
            }}
          >
            Remove from Team
          </Button>
        </DialogFooter>
      </Dialog>
    );
  },
);
