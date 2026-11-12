import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { Button, type ButtonProps } from "@/ui/Button";
import { List, ListHeaderRow, ListRow } from "@/ui/List";

const JoinMutation = graphql(`
  mutation TeamJoin_joinTeam($teamAccountId: ID!) {
    joinTeam(teamAccountId: $teamAccountId) {
      id
      slug
    }
  }
`);

/**
 * Join a team the viewer has an invite to, by email or by email domain, then
 * go to `redirect`, or to the team when there is none.
 */
export function JoinTeamButton(
  props: { teamAccountId: string; redirect?: string | null } & Omit<
    ButtonProps,
    "onClick"
  >,
) {
  const { redirect, teamAccountId, ...buttonProps } = props;
  const navigate = useNavigate();
  const [accept, { data, loading }] = useMutation(JoinMutation, {
    variables: {
      teamAccountId,
    },
    onCompleted(data) {
      const team = data.joinTeam;
      const redirectURL = redirect ?? getAccountURL({ accountSlug: team.slug });
      navigate(redirectURL);
    },
  });
  return (
    <Button
      {...buttonProps}
      disabled={loading || !!data || buttonProps.disabled}
      onClick={() => {
        accept().catch(() => {});
      }}
    />
  );
}

const _AutoInviteFragment = graphql(`
  fragment TeamJoin_AutoInvite on AutoInvite {
    id
    email
    domain
    team {
      id
      slug
      name
      avatar {
        ...AccountAvatarFragment
      }
    }
  }
`);

/**
 * The teams the viewer can join because one of their verified emails is on a
 * domain the team opened itself to.
 */
export function AutoInviteList(props: {
  autoInvites: DocumentType<typeof _AutoInviteFragment>[];
  /** Where to go once a team is joined; the team itself when null. */
  getRedirect: (team: { slug: string }) => string | null;
}) {
  const { autoInvites, getRedirect } = props;
  return (
    <List>
      <ListHeaderRow>Teams matching your email domain</ListHeaderRow>
      {autoInvites.map((autoInvite) => (
        <ListRow
          key={autoInvite.id}
          className="flex items-center justify-between gap-3 p-4 text-lg"
        >
          <div className="flex items-center gap-3">
            <AccountAvatar
              avatar={autoInvite.team.avatar}
              className="size-11"
            />
            <div className="flex flex-col">
              <span>{autoInvite.team.name || autoInvite.team.slug}</span>
              <span className="text-low text-xs">
                <strong>{autoInvite.email}</strong> matches the{" "}
                <strong>{autoInvite.domain}</strong> team domain.
              </span>
            </div>
          </div>
          <JoinTeamButton
            teamAccountId={autoInvite.team.id}
            redirect={getRedirect(autoInvite.team)}
          >
            Join
          </JoinTeamButton>
        </ListRow>
      ))}
    </List>
  );
}
