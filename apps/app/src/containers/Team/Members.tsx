import { useMutation } from "@apollo/client";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import { memo } from "react";
import { useNavigate } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogState,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { FormError } from "@/ui/FormError";
import { List, ListRow } from "@/ui/List";
import { Menu, MenuButton, MenuItem, useMenuState } from "@/ui/Menu";
import { MagicTooltip } from "@/ui/Tooltip";

import { AccountAvatar } from "../AccountAvatar";

const TeamFragment = graphql(`
  fragment TeamMembers_Team on Team {
    id
    name
    slug
    users(first: 30, after: 0) {
      edges {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
      pageInfo {
        totalCount
      }
    }
  }
`);

const LeaveTeamMutation = graphql(`
  mutation TeamMembers_leaveTeam($accountId: ID!) {
    leaveTeam(input: { accountId: $accountId })
  }
`);

type LeaveTeamConfirmDialogProps = {
  state: DialogState;
  teamName: string;
  accountId: string;
};

const LeaveTeamConfirmDialog = memo<LeaveTeamConfirmDialogProps>((props) => {
  const [leaveTeam, { loading, error }] = useMutation(LeaveTeamMutation);
  const navigate = useNavigate();
  return (
    <Dialog state={props.state}>
      <DialogBody confirm>
        <DialogTitle>Leave Team</DialogTitle>
        <DialogText>
          You are about to leave {props.teamName}. In order to regain access at
          a later time, a Team Owner must invite you.
        </DialogText>
        <DialogText>Are you sure you want to continue?</DialogText>
      </DialogBody>
      <DialogFooter>
        {error && (
          <FormError>Something went wrong. Please try again.</FormError>
        )}
        <DialogDismiss>Cancel</DialogDismiss>
        <Button
          disabled={loading}
          color="danger"
          onClick={async () => {
            await leaveTeam({
              variables: {
                accountId: props.accountId,
              },
            });
            props.state.hide();
            navigate("/");
          }}
        >
          Leave Team
        </Button>
      </DialogFooter>
    </Dialog>
  );
});

type ActionsMenuProps = {
  teamName: string;
  accountId: string;
  lastOne: boolean;
};

const ActionsMenu = (props: ActionsMenuProps) => {
  const menu = useMenuState({ gutter: 4 });
  const dialog = useDialogState();
  return (
    <>
      <MenuButton
        state={menu}
        className="flex shrink-0 items-center justify-center"
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
      </MenuButton>
      <Menu state={menu} aria-label="Mute options">
        <MagicTooltip
          tooltip={
            props.lastOne
              ? "You are the last user of this team, you can't leave it"
              : null
          }
        >
          <MenuItem
            variant="danger"
            state={menu}
            onClick={() => {
              dialog.show();
              menu.hide();
            }}
            disabled={props.lastOne}
            accessibleWhenDisabled
          >
            Leave Team
          </MenuItem>
        </MagicTooltip>
      </Menu>
      <LeaveTeamConfirmDialog
        state={dialog}
        teamName={props.teamName}
        accountId={props.accountId}
      />
    </>
  );
};

export const TeamMembers = (props: {
  team: FragmentType<typeof TeamFragment>;
}) => {
  const team = useFragment(TeamFragment, props.team);
  const lastOne = team.users.pageInfo.totalCount === 1;
  return (
    <Card>
      <form>
        <CardBody>
          <CardTitle>Members</CardTitle>
          <CardParagraph>
            Add members to your team to give them access to your projects.
          </CardParagraph>
          <List className="mt-4">
            {team.users.edges.map((user) => {
              return (
                <ListRow key={user.id}>
                  <AccountAvatar
                    avatar={user.avatar}
                    size={36}
                    className="shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{user.name}</div>
                    </div>
                    <div className="text-xs text-slate-500">{user.slug}</div>
                  </div>
                  <ActionsMenu
                    teamName={team.name || team.slug}
                    accountId={team.id}
                    lastOne={lastOne}
                  />
                </ListRow>
              );
            })}
          </List>
        </CardBody>
      </form>
    </Card>
  );
};
