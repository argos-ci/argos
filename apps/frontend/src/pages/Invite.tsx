import { useMutation, useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router";

import { useAuth } from "@/containers/Auth";
import {
  AlreadyJoined,
  InvalidInvite,
  InviteAccountAvatar,
  InviteContainer,
} from "@/containers/Team/Invite";
import { graphql } from "@/gql";
import { Button, type ButtonProps } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import { PageLoader } from "@/ui/PageLoader";
import { Text } from "@/ui/Text";
import { toast } from "@/ui/Toaster";
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
    }
  }
`);

function AcceptInviteButton(
  props: { secret: string } & Omit<ButtonProps, "onPress">,
) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [accept, { data, loading }] = useMutation(AcceptInviteMutation, {
    variables: {
      secret: props.secret,
    },
    onError(error) {
      toast.error(getErrorMessage(error));
    },
    onCompleted(data) {
      const { team } = data.acceptInvite;
      const redirectURL = getAccountURL({ accountSlug: team.slug });
      if (auth.status === "authenticated") {
        navigate(redirectURL, { replace: true });
      } else {
        // Accepting the invite as a new user established a session cookie
        // server-side. Full navigation so the app re-bootstraps logged-in.
        window.location.replace(redirectURL);
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

export function Component() {
  const auth = useAuth();
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
                    {auth.status === "authenticated" ? (
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
