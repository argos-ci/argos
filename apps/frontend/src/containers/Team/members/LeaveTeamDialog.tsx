import { memo } from "react";
import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";

import { useAuthTokenPayload } from "@/containers/Auth";
import { graphql } from "@/gql";
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
import { getErrorMessage } from "@/util/error";

const LeaveTeamMutation = graphql(`
  mutation TeamMembers_leaveTeam($teamAccountId: ID!) {
    leaveTeam(input: { teamAccountId: $teamAccountId })
  }
`);

export const LeaveTeamDialog = memo(
  (props: { teamName: string; teamAccountId: string }) => {
    const state = useOverlayTriggerState();
    const authPayload = useAuthTokenPayload();
    const [leaveTeam, { loading, error }] = useMutation(LeaveTeamMutation, {
      variables: {
        teamAccountId: props.teamAccountId,
      },
      onCompleted() {
        state.close();
        navigate(authPayload ? `/${authPayload.account.slug}` : "/");
      },
    });
    const navigate = useNavigate();
    return (
      <Dialog>
        <DialogBody confirm>
          <DialogTitle>Leave Team</DialogTitle>
          <DialogText>
            You are about to leave {props.teamName}. In order to regain access
            at a later time, a Team Owner must invite you.
          </DialogText>
          <DialogText>Are you sure you want to continue?</DialogText>
        </DialogBody>
        <DialogFooter>
          {error && <ErrorMessage>{getErrorMessage(error)}</ErrorMessage>}
          <DialogDismiss>Cancel</DialogDismiss>
          <Button
            isDisabled={loading}
            variant="destructive"
            onPress={() => {
              leaveTeam().catch(() => {});
            }}
          >
            Leave Team
          </Button>
        </DialogFooter>
      </Dialog>
    );
  },
);
