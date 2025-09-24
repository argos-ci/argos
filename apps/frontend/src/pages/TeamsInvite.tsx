import { useMutation } from "@apollo/client";
import { invariant } from "@apollo/client/utilities/globals";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useSafeQuery } from "@/containers/Apollo";
import { useIsLoggedIn } from "@/containers/Auth";
import {
  AlreadyJoined,
  InvalidInvite,
  InviteAccountAvatar,
  InviteContainer,
} from "@/containers/Team/Invite";
import { graphql } from "@/gql";
import { Button, LinkButton } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { PageLoader } from "@/ui/PageLoader";
import { Separator } from "@/ui/Separator";

import { getAccountURL } from "./Account/AccountParams";

const InviteQuery = graphql(`
  query TeamsInvite_teamInvite($secret: String!) {
    teamInvite(secret: $secret) {
      id
      name
      slug
      avatar {
        ...AccountAvatarFragment
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
  mutation TeamInvite_acceptTeamInvite($secret: String!) {
    acceptTeamInvite(secret: $secret) {
      id
      slug
    }
  }
`);

function JoinTeamButton(props: { secret: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  const [accept, { data, loading }] = useMutation(AcceptInviteMutation, {
    variables: {
      secret: props.secret,
    },
    onCompleted(data) {
      const team = data.acceptTeamInvite;
      navigate(getAccountURL({ accountSlug: team.slug }), { replace: true });
    },
  });
  return (
    <Button
      size="large"
      isDisabled={loading || !!data}
      onPress={() => {
        accept().catch(() => {});
      }}
    >
      {props.children}
    </Button>
  );
}

/** @route */
export function Component() {
  const loggedIn = useIsLoggedIn();
  const params = useParams();
  const secret = params.inviteSecret;
  invariant(secret, "no invite secret");
  const { data } = useSafeQuery(InviteQuery, {
    variables: { secret },
  });
  const { pathname } = useLocation();

  const team = data?.teamInvite;
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
            const team = data.teamInvite;
            if (team) {
              const teamName = team.name || team.slug;
              if (!loggedIn) {
                return (
                  <>
                    <InviteAccountAvatar avatar={team.avatar} />
                    <Heading>
                      You’ve been invited to the <strong>{teamName}</strong>{" "}
                      team.
                    </Heading>
                    <Text>
                      Before accepting the invite you have to create a new Argos
                      Account or login to an existing one.
                    </Text>
                    <div className="mt-15 gap-15 flex self-stretch text-left">
                      <div className="flex flex-1 flex-col gap-4">
                        <div className="text-low text-xs font-medium uppercase">
                          I don’t have an Argos account
                        </div>
                        <LinkButton
                          href={`/signup?r=${encodeURIComponent(pathname)}`}
                          size="large"
                          className="justify-center"
                        >
                          Sign Up
                        </LinkButton>
                      </div>
                      <div className="relative">
                        <Separator orientation="vertical" className="h-full" />
                        <Chip
                          scale="sm"
                          color="neutral"
                          className="-translate-1/2 absolute top-1/2"
                        >
                          OR
                        </Chip>
                      </div>
                      <div className="flex flex-1 flex-col gap-4">
                        <div className="text-low text-xs font-medium uppercase">
                          I already have an Argos account
                        </div>
                        <LinkButton
                          href={`/login?r=${encodeURIComponent(pathname)}`}
                          size="large"
                          className="justify-center"
                        >
                          Log In
                        </LinkButton>
                      </div>
                    </div>
                  </>
                );
              }
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
                    Let's use Argos to review visual differences in your
                    applications.
                  </Text>
                  <JoinTeamButton secret={secret}>
                    Join {teamName}
                  </JoinTeamButton>
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
