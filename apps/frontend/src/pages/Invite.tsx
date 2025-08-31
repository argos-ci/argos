import type { ComponentPropsWithRef } from "react";
import { useMutation } from "@apollo/client";
import { invariant } from "@apollo/client/utilities/globals";
import clsx from "clsx";
import { Helmet } from "react-helmet";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { useSafeQuery } from "@/containers/Apollo";
import { useIsLoggedIn } from "@/containers/Auth";
import { graphql } from "@/gql";
import { Button, LinkButton } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Separator } from "@/ui/Separator";

import { getAccountURL } from "./Account/AccountParams";

const InvitationQuery = graphql(`
  query Invite_invitation($secret: String!) {
    invitation(secret: $secret) {
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

const AcceptInvitationMutation = graphql(`
  mutation Invite_acceptInvitation($secret: String!) {
    acceptInvitation(secret: $secret) {
      id
      slug
    }
  }
`);

function JoinTeamButton(props: { secret: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  const [accept, { data, loading }] = useMutation(AcceptInvitationMutation, {
    variables: {
      secret: props.secret,
    },
    onCompleted(data) {
      const team = data.acceptInvitation;
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
  const { data } = useSafeQuery(InvitationQuery, {
    variables: { secret },
  });
  const { pathname } = useLocation();

  const team = data?.invitation;
  const teamName = team?.name || team?.slug;
  const teamTitle = teamName ? `${team?.name || team?.slug} Team` : `Team`;

  return (
    <>
      <Helmet>
        <title>{`Join ${teamTitle}`}</title>
      </Helmet>
      <Container className="mt-32 max-w-3xl text-center">
        {(() => {
          if (data) {
            const team = data.invitation;
            if (team) {
              if (!loggedIn) {
                return (
                  <div className="flex flex-col items-center">
                    <AccountAvatar
                      avatar={team.avatar}
                      className="size-18 mb-8"
                    />
                    <Heading>
                      You’ve been invited to the <strong>{teamTitle}</strong>{" "}
                      team.
                    </Heading>
                    <Paragraph>
                      Before accepting the invite you have to create a new Argos
                      Account or login to an existing one.
                    </Paragraph>
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
                  </div>
                );
              }
              const alreadyJoined = Boolean(
                data.me?.teams?.some((t) => t.id === team?.id),
              );
              if (alreadyJoined) {
                return (
                  <div className="flex flex-col items-center">
                    <Heading>This invitation has already been accepted</Heading>
                    <Paragraph>
                      You are already a member of <strong>{teamTitle}</strong>{" "}
                      team.
                    </Paragraph>
                    <LinkButton
                      className="mt-8"
                      size="large"
                      href={getAccountURL({ accountSlug: team.slug })}
                    >
                      View Team Projects
                    </LinkButton>
                  </div>
                );
              }
              return (
                <div className="flex flex-col items-center">
                  <AccountAvatar
                    avatar={team.avatar}
                    className="size-18 mb-8"
                  />
                  <Heading>
                    You’ve been invited to the <strong>{teamTitle}</strong> team
                  </Heading>
                  <Paragraph className="mb-8">
                    Let's use Argos to review visual differences in your
                    applications.
                  </Paragraph>
                  <JoinTeamButton secret={secret}>
                    Join {teamTitle}
                  </JoinTeamButton>
                </div>
              );
            }
            return (
              <>
                <Heading>Invalid invitation</Heading>
                <Paragraph>
                  Team not found by the given invite code or user is not
                  authorized to join team.
                </Paragraph>
              </>
            );
          }
          return <PageLoader />;
        })()}
      </Container>
    </>
  );
}

function Heading(props: ComponentPropsWithRef<"h1">) {
  return (
    <h1
      {...props}
      className={clsx("mb-2 text-2xl font-medium", props.className)}
    />
  );
}

function Paragraph(props: ComponentPropsWithRef<"p">) {
  return <p {...props} className={clsx("text-low", props.className)} />;
}
