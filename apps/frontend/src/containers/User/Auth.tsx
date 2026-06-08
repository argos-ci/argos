import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { MonitorIcon, SmartphoneIcon } from "lucide-react";
import { toast } from "sonner";

import { logout } from "@/containers/Auth";
import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { List, ListRow } from "@/ui/List";
import { Time } from "@/ui/Time";
import { getErrorMessage } from "@/util/error";

import { EmailAuth } from "./providers/EmailAuth";
import { GitHubAuth } from "./providers/GitHubAuth";
import { GitLabAuth } from "./providers/GitLabAuth";
import { GoogleAuth } from "./providers/GoogleAuth";

const _SessionFragment = graphql(`
  fragment UserAuth_Session on UserSession {
    id
    isCurrent
    deviceLabel
    location
    lastSeenAt
  }
`);

const _AccountFragment = graphql(`
  fragment UserAuth_Account on Account {
    id
    ... on User {
      ...GitHubAuth_Account
      ...GitLabAuth_Account
      ...GoogleAuth_Account
      ...EmailAuth_Account
      sessions {
        ...UserAuth_Session
      }
    }
  }
`);

const RevokeSessionMutation = graphql(`
  mutation UserAuth_revokeUserSession($id: ID!) {
    revokeUserSession(input: { id: $id }) {
      id
      sessions {
        ...UserAuth_Session
      }
    }
  }
`);

const RevokeAllSessionsMutation = graphql(`
  mutation UserAuth_revokeAllUserSessions {
    revokeAllUserSessions {
      id
      sessions {
        ...UserAuth_Session
      }
    }
  }
`);

type Session = DocumentType<typeof _SessionFragment>;

/** Pick an icon from the device label (cosmetic). */
function DeviceIcon(props: { deviceLabel: string | null; className?: string }) {
  if (props.deviceLabel && /iOS|iPhone|iPad|Android/i.test(props.deviceLabel)) {
    return <SmartphoneIcon className={props.className} />;
  }
  return <MonitorIcon className={props.className} />;
}

function SessionRow(props: {
  session: Session;
  subtitle: React.ReactNode;
  action: React.ReactNode;
}) {
  const { session, subtitle, action } = props;
  return (
    <ListRow className="group flex items-center gap-3 p-4">
      <div className="bg-subtle flex size-9 shrink-0 items-center justify-center rounded-md border">
        <DeviceIcon
          deviceLabel={session.deviceLabel}
          className="text-low size-4"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {session.deviceLabel ?? "Unknown device"}
        </div>
        <div className="text-low truncate text-xs">{subtitle}</div>
      </div>
      <div className="opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        {action}
      </div>
    </ListRow>
  );
}

function UserSessions(props: { sessions: readonly Session[] }) {
  const { sessions } = props;
  const current = sessions.find((session) => session.isCurrent) ?? null;
  const others = sessions.filter((session) => !session.isCurrent);

  const [revokeSession, { loading: revoking }] = useMutation(
    RevokeSessionMutation,
    { onError: (error) => toast.error(getErrorMessage(error)) },
  );
  const [revokeAllSessions, { loading: revokingAll }] = useMutation(
    RevokeAllSessionsMutation,
    { onError: (error) => toast.error(getErrorMessage(error)) },
  );

  return (
    <Card>
      <CardBody>
        <CardTitle>Sessions</CardTitle>
        <CardParagraph>Devices logged into your account.</CardParagraph>

        {current ? (
          <List className="mb-4">
            <SessionRow
              session={current}
              subtitle={
                <>
                  <span className="text-success-low inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-current" />
                    Current session
                  </span>
                  {current.location ? ` · ${current.location}` : null}
                </>
              }
              action={
                <Button
                  variant="secondary"
                  size="small"
                  onPress={() => logout()}
                >
                  Log out
                </Button>
              }
            />
          </List>
        ) : null}

        {others.length > 0 ? (
          <List>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-medium">
                {others.length} other session{others.length > 1 ? "s" : ""}
              </div>
              <Button
                variant="secondary"
                size="small"
                isDisabled={revokingAll}
                onPress={() => {
                  revokeAllSessions().catch(() => {});
                }}
              >
                Revoke all
              </Button>
            </div>
            {others.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                subtitle={
                  <>
                    {session.location ? `${session.location} · ` : null}
                    Last seen <Time date={session.lastSeenAt} />
                  </>
                }
                action={
                  <Button
                    variant="secondary"
                    size="small"
                    isDisabled={revoking}
                    onPress={() => {
                      revokeSession({ variables: { id: session.id } }).catch(
                        () => {},
                      );
                    }}
                  >
                    Revoke
                  </Button>
                }
              />
            ))}
          </List>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function UserAuth(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  invariant(account.__typename === "User");
  return (
    <>
      <UserSessions sessions={account.sessions} />
      <Card>
        <CardBody>
          <CardTitle>Authentication</CardTitle>
          <CardParagraph>
            Connect your Argos Account with a third-party service to use it for
            login.
          </CardParagraph>
          <div className="flex flex-col gap-2">
            <EmailAuth account={account} />
            <GitHubAuth account={account} />
            <GitLabAuth account={account} />
            <GoogleAuth account={account} />
          </div>
        </CardBody>
      </Card>
    </>
  );
}
