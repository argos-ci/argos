import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { MonitorIcon, SmartphoneIcon } from "lucide-react";
import moment from "moment";
import { Button as RACButton } from "react-aria-components";
import { toast } from "sonner";

import { logout } from "@/containers/Auth";
import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
  useDialogValueState,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { List, ListRow } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";

import { EmailAuth } from "./providers/EmailAuth";
import { GitHubAuth } from "./providers/GitHubAuth";
import { GitLabAuth } from "./providers/GitLabAuth";
import { GoogleAuth } from "./providers/GoogleAuth";

const _SessionFragment = graphql(`
  fragment UserAuth_Session on UserSession {
    id
    isCurrent
    deviceLabel
    ip
    location
    createdAt
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

function getDeviceName(session: Session) {
  return session.deviceLabel ?? "Unknown device";
}

/** Pick an icon from the device label (cosmetic). */
function DeviceIcon(props: { deviceLabel: string | null; className?: string }) {
  if (props.deviceLabel && /iOS|iPhone|iPad|Android/i.test(props.deviceLabel)) {
    return <SmartphoneIcon className={props.className} />;
  }
  return <MonitorIcon className={props.className} />;
}

function DeviceIconBox(props: { session: Session }) {
  return (
    <div className="bg-subtle flex size-9 shrink-0 items-center justify-center rounded-md border">
      <DeviceIcon
        deviceLabel={props.session.deviceLabel}
        className="text-low size-4"
      />
    </div>
  );
}

/** Shared row layout: device icon, name + subtitle, and a trailing slot. */
function SessionRowLayout(props: {
  session: Session;
  subtitle: React.ReactNode;
  trailing: React.ReactNode;
}) {
  return (
    <>
      <DeviceIconBox session={props.session} />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-medium">
          {getDeviceName(props.session)}
        </div>
        <div className="text-low truncate text-xs">{props.subtitle}</div>
      </div>
      {props.trailing}
    </>
  );
}

function RevokeSessionDialog(props: { session: Session }) {
  const { session } = props;
  const state = useOverlayTriggerState();
  const [revokeSession, { loading, error }] = useMutation(
    RevokeSessionMutation,
    {
      variables: { id: session.id },
      onCompleted: () => {
        state.close();
        toast.success("Session revoked");
      },
    },
  );

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Device", value: getDeviceName(session) },
    { label: "IP address", value: session.ip ?? "—" },
    { label: "Last location", value: session.location ?? "—" },
    {
      label: "Original sign in",
      value: <Time date={session.createdAt} format="ll" tooltip="none" />,
    },
  ];

  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>
          <span className="flex items-center gap-3">
            <DeviceIconBox session={session} />
            {getDeviceName(session)}
          </span>
        </DialogTitle>
        <dl className="mt-2 text-sm">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="grid grid-cols-[1fr_2fr] gap-4 border-b py-3 last:border-b-0"
            >
              <dt className="text-low">{detail.label}</dt>
              <dd className="min-w-0 break-all">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </DialogBody>
      <DialogFooter>
        {error ? (
          <ErrorMessage className="flex-1">{error.message}</ErrorMessage>
        ) : null}
        <DialogDismiss isDisabled={loading}>Cancel</DialogDismiss>
        <Button
          variant="destructive"
          isPending={loading}
          onPress={() => {
            revokeSession().catch(() => {});
          }}
        >
          Revoke Access
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function RevokeAllSessionsDialog(props: { count: number }) {
  const state = useOverlayTriggerState();
  const [revokeAllSessions, { loading, error }] = useMutation(
    RevokeAllSessionsMutation,
    {
      onCompleted: () => {
        state.close();
        toast.success("Sessions revoked");
      },
    },
  );

  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Revoke all other sessions</DialogTitle>
        <DialogText>
          This will sign you out of {props.count} other{" "}
          {props.count > 1 ? "devices" : "device"}. Your current session won’t
          be affected.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {error ? (
          <ErrorMessage className="flex-1">{error.message}</ErrorMessage>
        ) : null}
        <DialogDismiss isDisabled={loading}>Cancel</DialogDismiss>
        <Button
          variant="destructive"
          isPending={loading}
          onPress={() => {
            revokeAllSessions().catch(() => {});
          }}
        >
          Revoke all
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function UserSessions(props: { sessions: readonly Session[] }) {
  const { sessions } = props;
  const current = sessions.find((session) => session.isCurrent) ?? null;
  const others = sessions.filter((session) => !session.isCurrent);

  const revoking = useDialogValueState<Session | null>(null);

  return (
    <Card>
      <CardBody>
        <CardTitle>Sessions</CardTitle>
        <CardParagraph>Devices logged into your account.</CardParagraph>

        {current ? (
          <List className="mb-4">
            <ListRow className="group flex items-center gap-3 p-4">
              <SessionRowLayout
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
                trailing={
                  <div className="opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="small"
                      onPress={() => logout()}
                    >
                      Log out
                    </Button>
                  </div>
                }
              />
            </ListRow>
          </List>
        ) : null}

        {others.length > 0 ? (
          <List>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-medium">
                {others.length} other session{others.length > 1 ? "s" : ""}
              </div>
              <DialogTrigger>
                <Button variant="secondary" size="small">
                  Revoke all
                </Button>
                <Modal>
                  <RevokeAllSessionsDialog count={others.length} />
                </Modal>
              </DialogTrigger>
            </div>
            {others.map((session) => (
              <RACButton
                key={session.id}
                onPress={() => revoking.open(session)}
                className="group bg-app data-focus-visible:bg-hover data-hovered:bg-hover flex w-full items-center gap-3 border-b p-4 last:border-b-0 focus:outline-hidden"
              >
                <SessionRowLayout
                  session={session}
                  subtitle={
                    <>
                      {session.location ? `${session.location} · ` : null}
                      Last seen {moment(session.lastSeenAt).fromNow()}
                    </>
                  }
                  trailing={
                    <span className="border-default text-default rounded-md border px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
                      Revoke
                    </span>
                  }
                />
              </RACButton>
            ))}
          </List>
        ) : null}
      </CardBody>

      {revoking.value ? (
        <Modal isOpen={revoking.isOpen} onOpenChange={revoking.onOpenChange}>
          <RevokeSessionDialog session={revoking.value} />
        </Modal>
      ) : null}
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
