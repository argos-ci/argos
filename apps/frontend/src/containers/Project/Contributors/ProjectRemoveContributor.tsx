import { memo } from "react";
import { useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";

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
import { getGraphQLErrorMessage } from "@/ui/Form";
import { FormError } from "@/ui/FormError";
import { List } from "@/ui/List";

import { removeContributor } from "./operations";

const RemoveContributorFromProjectMutation = graphql(`
  mutation RemoveContributorFromProjectMutation(
    $projectId: ID!
    $userAccountId: ID!
  ) {
    removeContributorFromProject(
      input: { projectId: $projectId, userAccountId: $userAccountId }
    ) {
      projectContributorId
    }
  }
`);

export const LeaveProjectDialog = memo(
  (props: {
    projectId: string;
    userAccountId: string;
    projectName: string;
  }) => {
    const state = useOverlayTriggerState();
    const navigate = useNavigate();
    const [leaveProject, { loading, error }] = useMutation(
      RemoveContributorFromProjectMutation,
      {
        variables: {
          projectId: props.projectId,
          userAccountId: props.userAccountId,
        },
        onCompleted() {
          state.close();
          navigate("/");
        },
      },
    );
    return (
      <Dialog size="medium">
        <DialogBody confirm>
          <DialogTitle>Remove me as contributor</DialogTitle>
          <DialogText>
            You are about to remove you as contributor of the project{" "}
            {props.projectName}. In order to be able to access it again, you
            will need to be added back by another project admin.
          </DialogText>
          <DialogText>Are you sure you want to continue?</DialogText>
        </DialogBody>
        <DialogFooter>
          {error && <FormError>{getGraphQLErrorMessage(error)}</FormError>}
          <DialogDismiss>Cancel</DialogDismiss>
          <Button
            isDisabled={loading}
            variant="destructive"
            onPress={() => {
              leaveProject().catch(() => {});
            }}
          >
            Remove me as contributor
          </Button>
        </DialogFooter>
      </Dialog>
    );
  },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RemoveFromProjectDialogUserFragment = graphql(`
  fragment RemoveFromProjectDialog_User on User {
    id
    ...UserListRow_user
  }
`);

export type RemovedUser = DocumentType<
  typeof RemoveFromProjectDialogUserFragment
>;

export const RemoveFromProjectDialog = memo(
  (props: { projectName: string; projectId: string; user: RemovedUser }) => {
    const state = useOverlayTriggerState();
    const [removeFromProject, { loading, error }] = useMutation(
      RemoveContributorFromProjectMutation,
      {
        onCompleted() {
          state.close();
        },
        update(cache, { data }) {
          if (data?.removeContributorFromProject) {
            removeContributor(cache, {
              projectId: props.projectId,
              userId: props.user.id,
              projectContributorId:
                data.removeContributorFromProject.projectContributorId,
            });
          }
        },
        variables: {
          projectId: props.projectId,
          userAccountId: props.user.id,
        },
      },
    );
    return (
      <Dialog size="medium">
        <DialogBody confirm>
          <DialogTitle>Remove Project contributor</DialogTitle>
          <DialogText>
            You are about to remove the following Project contributor, are you
            sure you want to continue?
          </DialogText>
          <List className="text-left">
            <UserListRow user={props.user} />
          </List>
        </DialogBody>
        <DialogFooter>
          {error && (
            <FormError>Something went wrong. Please try again.</FormError>
          )}
          <DialogDismiss>Cancel</DialogDismiss>
          <Button
            isDisabled={loading}
            variant="destructive"
            onPress={() => {
              removeFromProject().catch(() => {});
            }}
          >
            Remove from Project
          </Button>
        </DialogFooter>
      </Dialog>
    );
  },
);
