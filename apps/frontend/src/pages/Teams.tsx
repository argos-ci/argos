import { useMutation, useSuspenseQuery } from "@apollo/client/react";
import { PlusCircleIcon } from "lucide-react";
import { Heading } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard, RedirectToWebsite } from "@/containers/AuthGuard";
import { graphql } from "@/gql";
import { Button, type ButtonProps } from "@/ui/Button";
import { StandalonePage } from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { List, ListHeaderRow, ListRow, ListRowLink } from "@/ui/List";

import { getAccountURL } from "./Account/AccountParams";

const TeamsQuery = graphql(`
  query Teams_me {
    me {
      id
      teams {
        id
        slug
        name
        avatar {
          ...AccountAvatarFragment
        }
      }
      invites {
        id
        invitedBy {
          id
          name
          slug
        }
        team {
          id
          slug
          name
          avatar {
            ...AccountAvatarFragment
          }
        }
      }
    }
  }
`);

function TeamsList() {
  const { data } = useSuspenseQuery(TeamsQuery);
  if (!data.me) {
    return <RedirectToWebsite />;
  }
  if (data.me.invites.length === 0 && data.me.teams.length === 0) {
    return (
      <div className="text-center">
        <Heading className="mb-6">You’re not part of any team yet.</Heading>
        <p className="mb-8">
          To join one, ask a team owner to{" "}
          <Link
            href="https://argos-ci.com/docs/faq#how-to-invite-someone-to-my-argos-team"
            target="_blank"
          >
            send you an invite
          </Link>
          .
        </p>
        <p className="mb-1">Or get started now:</p>
        <ul className="space-y-1">
          <li>
            <Link href="/">Go to my personal dashboard</Link>
          </li>
          <li>
            <Link href="/teams/new">Create a new team</Link>
          </li>
        </ul>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <Heading className="mb-6">Your Teams</Heading>
      {data.me.invites.length > 0 ? (
        <List>
          <ListHeaderRow>Invitations</ListHeaderRow>
          {data.me.invites.map((invite) => (
            <ListRow
              key={invite.team.id}
              className="flex items-center justify-between gap-3 p-4 text-lg"
            >
              <div className="flex items-center gap-3">
                <AccountAvatar
                  avatar={invite.team.avatar}
                  className="size-11"
                />
                <div className="flex flex-col">
                  <span>{invite.team.name || invite.team.slug}</span>
                  <span className="text-low text-xs">
                    Invited by {invite.invitedBy.name || invite.invitedBy.slug}
                  </span>
                </div>
              </div>
              <JoinButton teamAccountId={invite.team.id}>Join</JoinButton>
            </ListRow>
          ))}
        </List>
      ) : null}
      <List>
        {data.me.invites.length > 0 ? (
          <ListHeaderRow>Teams</ListHeaderRow>
        ) : null}
        {data.me.teams.map((team) => (
          <ListRowLink
            key={team.id}
            className="flex items-center gap-3 p-4 text-lg"
            href={getAccountURL({ accountSlug: team.slug })}
          >
            <AccountAvatar avatar={team.avatar} className="size-11" />
            {team.name || team.slug}
          </ListRowLink>
        ))}
        <ListRowLink
          className="text flex items-center gap-3 p-4 text-sm"
          href="/teams/new"
        >
          <PlusCircleIcon className="size-4" />
          New team
        </ListRowLink>
      </List>
    </div>
  );
}

const JoinMutation = graphql(`
  mutation Teams_joinTeam($teamAccountId: ID!) {
    joinTeam(teamAccountId: $teamAccountId) {
      id
      slug
    }
  }
`);

function JoinButton(
  props: { teamAccountId: string } & Omit<ButtonProps, "onPress">,
) {
  const navigate = useNavigate();
  const [accept, { data, loading }] = useMutation(JoinMutation, {
    variables: {
      teamAccountId: props.teamAccountId,
    },
    onCompleted(data) {
      const team = data.joinTeam;
      const redirectURL = getAccountURL({ accountSlug: team.slug });
      navigate(redirectURL);
    },
  });
  return (
    <Button
      {...props}
      isDisabled={loading || !!data || props.isDisabled}
      onPress={() => {
        accept().catch(() => {});
      }}
    />
  );
}

/** @route */
export function Component() {
  return (
    <StandalonePage>
      <Helmet>
        <title>Teams</title>
      </Helmet>
      <AuthGuard>
        {() => {
          return (
            <div className="w-full max-w-lg">
              <TeamsList />
            </div>
          );
        }}
      </AuthGuard>
    </StandalonePage>
  );
}
