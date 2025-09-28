import { useMutation, useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth, useIsLoggedIn } from "@/containers/Auth";
import {
  AlreadyJoined,
  InvalidInvite,
  InviteAccountAvatar,
  InviteContainer,
} from "@/containers/Team/Invite";
import { graphql } from "@/gql";
import { Button, type ButtonProps } from "@/ui/Button";
import { PageLoader } from "@/ui/PageLoader";
import { getErrorMessage } from "@/util/error";

import { getAccountURL } from "./Account/AccountParams";

const InviteQuery = graphql(`
  query Invite_invite($secret: String!) {
    invite(secret: $secret) {
      id
      email
      invitedBy {
        id
        name
        slug
      }
      team {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
    }

    me {
      id
      teams {
        id
      }
    }
  }
`);

const AcceptInviteMutation = graphql(`
  mutation Invite_acceptInvite($secret: String!) {
    acceptInvite(secret: $secret) {
      team {
        id
        slug
      }
      jwt
    }
  }
`);

function AcceptInviteButton(
  props: { secret: string } & Omit<ButtonProps, "onPress">,
) {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [accept, { data, loading }] = useMutation(AcceptInviteMutation, {
    variables: {
      secret: props.secret,
    },
    onError(error) {
      toast.error(getErrorMessage(error));
    },
    onCompleted(data) {
      const { jwt, team } = data.acceptInvite;
      const redirectURL = getAccountURL({ accountSlug: team.slug });
      if (jwt) {
        setToken(jwt, { silent: true });
        window.location.replace(redirectURL);
      } else {
        navigate(redirectURL, { replace: true });
      }
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
  const isLoggedIn = useIsLoggedIn();
  const params = useParams();
  const secret = params.inviteSecret;
  invariant(secret, "no invite secret");
  const { data, error } = useQuery(InviteQuery, {
    variables: { secret },
  });
  if (error) {
    throw error;
  }

  const team = data?.invite?.team;
  const teamName = team?.name || team?.slug;
  const teamTitle = teamName ? `${teamName} Team` : `Team`;

  return (
    <>
      <Helmet>
        <title>{`Join ${teamTitle}`}</title>
      </Helmet>
      <InviteContainer>
        {(() => {
          if (data) {
            const { invite } = data;
            if (invite) {
              const { team } = invite;
              const teamName = team.name || team.slug;
              const alreadyJoined = Boolean(
                data.me?.teams?.some((t) => t.id === team?.id),
              );
              if (alreadyJoined) {
                return (
                  <AlreadyJoined teamName={teamName} accountSlug={team.slug} />
                );
              }
              return (
                <>
                  <InviteAccountAvatar avatar={team.avatar} />
                  <Heading>
                    You’ve been invited to the <strong>{teamName}</strong> team
                  </Heading>
                  <Text className="mb-8">
                    Invited by {invite.invitedBy.name || invite.invitedBy.slug}
                  </Text>
                  <AcceptInviteButton secret={secret} size="large">
                    {isLoggedIn ? (
                      <>Join {teamName}</>
                    ) : (
                      <>Continue as {invite.email}</>
                    )}
                  </AcceptInviteButton>
                </>
              );
            }
            return <InvalidInvite />;
          }
          return <PageLoader />;
        })()}
      </InviteContainer>
    </>
  );
}
