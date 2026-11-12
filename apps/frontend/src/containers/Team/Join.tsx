import type { ReactNode } from "react";
import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { List, ListHeaderRow, ListRow } from "@/ui/List";

const JoinMutation = graphql(`
  mutation TeamJoin_joinTeam($teamAccountId: ID!) {
    joinTeam(teamAccountId: $teamAccountId) {
      redirectPath
    }
  }
`);

function JoinTeamButton(props: {
  teamAccountId: string;
  redirect: string | null;
}) {
  const { teamAccountId, redirect } = props;
  const navigate = useNavigate();
  const [join, { data, loading }] = useMutation(JoinMutation, {
    variables: { teamAccountId },
    onCompleted(data) {
      navigate(redirect ?? data.joinTeam.redirectPath);
    },
  });
  return (
    <Button
      disabled={loading || Boolean(data)}
      onClick={() => {
        join().catch(() => {});
      }}
    >
      Join
    </Button>
  );
}

const _TeamFragment = graphql(`
  fragment TeamJoin_Team on Team {
    id
    slug
    name
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

/**
 * A team the viewer has an invite to, by email or by email domain.
 */
export function JoinTeamRow(props: {
  team: DocumentType<typeof _TeamFragment>;
  /** Why the viewer may join, shown under the team's name. */
  reason: ReactNode;
  /** Where to go once joined, instead of where the server sends them. */
  redirect?: string | null;
}) {
  const { team, reason, redirect = null } = props;
  return (
    <ListRow className="flex items-center justify-between gap-3 p-4 text-lg">
      <div className="flex items-center gap-3">
        <AccountAvatar avatar={team.avatar} className="size-11" />
        <div className="flex flex-col">
          <span>{team.name || team.slug}</span>
          <span className="text-low text-xs">{reason}</span>
        </div>
      </div>
      <JoinTeamButton teamAccountId={team.id} redirect={redirect} />
    </ListRow>
  );
}

const _AutoInviteFragment = graphql(`
  fragment TeamJoin_AutoInvite on AutoInvite {
    id
    email
    domain
    team {
      ...TeamJoin_Team
    }
  }
`);

/**
 * The teams the viewer can join because one of their verified emails is on a
 * domain the team opened itself to.
 */
export function AutoInviteList(props: {
  autoInvites: DocumentType<typeof _AutoInviteFragment>[];
  redirect?: string | null;
}) {
  const { autoInvites, redirect } = props;
  return (
    <List>
      <ListHeaderRow>Teams matching your email domain</ListHeaderRow>
      {autoInvites.map((autoInvite) => (
        <JoinTeamRow
          key={autoInvite.id}
          team={autoInvite.team}
          redirect={redirect}
          reason={
            <>
              <strong>{autoInvite.email}</strong> matches the{" "}
              <strong>{autoInvite.domain}</strong> team domain.
            </>
          }
        />
      ))}
    </List>
  );
}
