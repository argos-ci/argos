import { useDeferredValue, useState } from "react";
import { useMutation, useSuspenseQuery, type Reference } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import {
  CircleXIcon,
  ClockAlertIcon,
  MailIcon,
  MoreVerticalIcon,
} from "lucide-react";
import { Heading, MenuTrigger, Text } from "react-aria-components";
import { toast } from "sonner";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { TeamMemberLabel } from "@/containers/UserList";
import { graphql, type DocumentType } from "@/gql";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { DialogTrigger } from "@/ui/Dialog";
import { IconButton } from "@/ui/IconButton";
import { EmptyState, EmptyStateActions } from "@/ui/Layout";
import { List, ListLoadMore, ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";

import { InviteDialog } from "./InviteDialog";
import { SearchFilter } from "./SearchFilter";

const INITIAL_NB_INVITES = 10;
const NB_INVITES_PER_PAGE = 100;

const TeamInvitesQuery = graphql(`
  query InvitesList_invites(
    $id: ID!
    $first: Int!
    $after: Int!
    $search: String
  ) {
    team: teamById(id: $id) {
      id
      invites(first: $first, after: $after, search: $search) {
        edges {
          ...InvitesList_TeamInvite
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }

  fragment InvitesList_TeamInvite on TeamInvite {
    id
    email
    userLevel
    expired
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

const _TeamFragment = graphql(`
  fragment InvitesList_Team on Team {
    id
    ...InviteDialog_Team
  }
`);

interface TeamInvitesListProps {
  team: DocumentType<typeof _TeamFragment>;
  amOwner: boolean;
}

const TeamInviteCancelMutation = graphql(`
  mutation InvitesList_cancelInvite($teamInviteId: ID!) {
    cancelInvite(teamInviteId: $teamInviteId) {
      id
    }
  }
`);

const ResendInviteMutation = graphql(`
  mutation InvitesList_inviteMembers($input: InviteMembersInput!) {
    inviteMembers(input: $input) {
      id
      ...InvitesList_TeamInvite
    }
  }
`);

export function TeamInvitesList(props: TeamInvitesListProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [cancelInvite] = useMutation(TeamInviteCancelMutation);
  const [resendInvite] = useMutation(ResendInviteMutation);
  const { data, fetchMore } = useSuspenseQuery(TeamInvitesQuery, {
    variables: {
      id: props.team.id,
      after: 0,
      first: INITIAL_NB_INVITES,
      search: deferredSearch,
    },
  });
  if (!data) {
    return null;
  }

  invariant(data.team?.__typename === "Team", "Invalid team");
  if (!data.team.invites) {
    return null;
  }
  const invites = data.team.invites.edges;
  return (
    <div>
      <div aria-label="Filters" className="mb-2 flex gap-2">
        <SearchFilter value={search} onChange={setSearch} />
      </div>
      {invites.length > 0 ? (
        <List className={search !== deferredSearch ? "opacity-disabled" : ""}>
          {invites.map((invite) => {
            return (
              <ListRow
                key={invite.id}
                className="flex items-center gap-4 px-4 py-2"
              >
                <AccountAvatar
                  avatar={invite.avatar}
                  className="size-9 shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      Pending invitation
                      <MailIcon className="text-low size-4" />
                    </div>
                  </div>
                  <div className="text-low text-xs">{invite.email}</div>
                </div>
                {invite.expired ? (
                  <Chip icon={<ClockAlertIcon />} scale="sm" color="warning">
                    Expired
                  </Chip>
                ) : null}
                <div className="text-low text-sm">
                  {TeamMemberLabel[invite.userLevel]}
                </div>

                {props.amOwner ? (
                  <MenuTrigger>
                    <IconButton>
                      <MoreVerticalIcon />
                    </IconButton>
                    <Popover>
                      <Menu aria-label="Actions">
                        <MenuItem
                          variant="danger"
                          onAction={() => {
                            toast.promise(
                              cancelInvite({
                                variables: { teamInviteId: invite.id },
                                update(cache, { data }) {
                                  if (data?.cancelInvite) {
                                    cache.modify({
                                      id: cache.identify({
                                        __typename: "Team",
                                        id: props.team.id,
                                      }),
                                      fields: {
                                        invites: (
                                          existingInvites,
                                          { readField },
                                        ) => {
                                          return {
                                            ...existingInvites,
                                            edges: existingInvites.edges.filter(
                                              (ref: Reference) =>
                                                readField("id", ref) !==
                                                invite.id,
                                            ),
                                            pageInfo: {
                                              ...existingInvites.pageInfo,
                                              totalCount:
                                                existingInvites.pageInfo
                                                  .totalCount - 1,
                                            },
                                          };
                                        },
                                      },
                                    });
                                  }
                                },
                              }),
                              {
                                loading: "Canceling invitation…",
                                success: "Invitation canceled",
                                error: "Failed to cancel invitation",
                              },
                            );
                          }}
                        >
                          <MenuItemIcon>
                            <CircleXIcon />
                          </MenuItemIcon>
                          Cancel Invitation
                        </MenuItem>
                        <MenuItem
                          onAction={() => {
                            toast.promise(
                              resendInvite({
                                variables: {
                                  input: {
                                    teamAccountId: props.team.id,
                                    members: [
                                      {
                                        email: invite.email,
                                        level: invite.userLevel,
                                      },
                                    ],
                                  },
                                },
                              }),
                              {
                                loading: "Resending invitation…",
                                success: "Invitation resent",
                                error: "Failed to resend invitation",
                              },
                            );
                          }}
                        >
                          <MenuItemIcon>
                            <MailIcon />
                          </MenuItemIcon>
                          Resend Invitation
                        </MenuItem>
                      </Menu>
                    </Popover>
                  </MenuTrigger>
                ) : (
                  <div className="w-4" />
                )}
              </ListRow>
            );
          })}
        </List>
      ) : deferredSearch !== "" ? (
        <EmptyState>
          <Heading>No pending invitations found</Heading>
          <Text slot="description">
            Your team has no invitations matching the current search.
          </Text>
          <EmptyStateActions>
            <Button
              variant="secondary"
              onPress={() => {
                setSearch("");
              }}
            >
              Clear search
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <EmptyState>
          <Heading>No pending invitations found</Heading>
          <Text slot="description">
            Invite people to your team to give them access to your projects.
          </Text>
          <EmptyStateActions>
            <DialogTrigger>
              <Button variant="secondary">Invite members</Button>
              <Modal>
                <InviteDialog team={props.team} />
              </Modal>
            </DialogTrigger>
          </EmptyStateActions>
        </EmptyState>
      )}
      {data.team.invites.pageInfo.hasNextPage && (
        <ListLoadMore
          onPress={() => {
            fetchMore({
              variables: {
                after: invites.length,
                first: NB_INVITES_PER_PAGE,
              },
              updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult) {
                  return prev;
                }
                if (!fetchMoreResult.team) {
                  return prev;
                }
                if (!prev.team) {
                  return prev;
                }
                if (!prev.team.invites) {
                  return prev;
                }
                if (!fetchMoreResult.team.invites) {
                  return prev;
                }
                return {
                  team: {
                    ...prev.team,
                    invites: {
                      ...prev.team.invites,
                      edges: [
                        ...prev.team.invites.edges,
                        ...fetchMoreResult.team.invites.edges,
                      ],
                      pageInfo: fetchMoreResult.team.invites.pageInfo,
                    },
                  },
                };
              },
            });
          }}
        />
      )}
    </div>
  );
}
