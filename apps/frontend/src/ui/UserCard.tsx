import { useEffect, useState } from "react";
import { useSubscription } from "@apollo/client/react";
import { clsx } from "clsx";
import { BotIcon, ClockIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { UserType } from "@/gql/graphql";

import { type MentionUser } from "./Editor/mention";
import { Time } from "./Time";
import { Tooltip } from "./Tooltip";

/**
 * Fields the user card needs. Colocated so any query rendering a card selects
 * them. `role` is scoped to a project via its slug/name — the embedding
 * operation must provide `$accountSlug` and `$projectName`. `lastSeenAt` and
 * `timezone` power the presence dot and local-time line (both null unless the
 * viewer shares a team with the user).
 */
export const UserCardFragment = graphql(`
  fragment UserCard_user on User {
    id
    name
    slug
    avatar {
      ...AccountAvatarFragment
    }
    lastSeenAt
    timezone
    role(accountSlug: $accountSlug, projectName: $projectName)
    type
  }
`);

/**
 * Pushes a fresh `lastSeenAt` whenever the user becomes active again. The
 * returned `user` is normalized by id, so Apollo merges it into the cache and
 * any open card recolors its dot live — no manual cache write needed.
 */
const UserPresenceChangedSubscription = graphql(`
  subscription UserCard_userPresenceChanged($userId: ID!) {
    userPresenceChanged(userId: $userId) {
      user {
        id
        lastSeenAt
        timezone
      }
    }
  }
`);

export interface UserCardData {
  /** Public account id; needed to subscribe to live presence. */
  id?: string | null;
  name?: string | null;
  slug: string;
  imageUrl?: string | null;
  initial?: string | null;
  /** Team role (e.g. "owner"), shown as a humanized label when present. */
  role?: string | null;
  /** ISO timestamp of last activity; null when unknown/not visible. */
  lastSeenAt?: string | null;
  /** IANA timezone (e.g. "Europe/Paris"); null when unknown/not visible. */
  timezone?: string | null;
  /** Automated account (e.g. the Argos bot) — shown instead of presence. */
  isBot?: boolean;
}

/** Map the `UserCard_user` fragment to the data the card renders. */
export function getUserCardData(
  user: DocumentType<typeof UserCardFragment>,
): UserCardData {
  return {
    id: user.id,
    name: user.name,
    slug: user.slug,
    imageUrl: user.avatar.url,
    initial: user.avatar.initial,
    role: user.role,
    lastSeenAt: user.lastSeenAt,
    timezone: user.timezone,
    isBot: user.type === UserType.Bot,
  };
}

/**
 * Map the `UserCard_user` fragment to a {@link MentionUser}, used both to feed
 * the `@` autocomplete and to resolve stored mentions (which keep only the id)
 * back to a name, avatar and role at render time.
 */
export function getMentionUser(
  user: DocumentType<typeof UserCardFragment>,
): MentionUser {
  return {
    id: user.id,
    label: user.name || user.slug,
    secondaryLabel: user.name ? user.slug : null,
    imageUrl: user.avatar.url,
    initial: user.avatar.initial,
    role: user.role,
    lastSeenAt: user.lastSeenAt,
    timezone: user.timezone,
  };
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  member: "Member",
  contributor: "Contributor",
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

/** A user is "online" within this window of their last activity, "away" until the next. */
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const AWAY_THRESHOLD_MS = 30 * 60 * 1000;
/** How often the dot/clock re-evaluate while the card is open. */
const PRESENCE_TICK_MS = 30 * 1000;

type PresenceStatus = "online" | "away" | "offline";

function getPresenceStatus(lastSeenAt: string, nowMs: number): PresenceStatus {
  const age = nowMs - new Date(lastSeenAt).getTime();
  if (age < ONLINE_THRESHOLD_MS) {
    return "online";
  }
  if (age < AWAY_THRESHOLD_MS) {
    return "away";
  }
  return "offline";
}

const PRESENCE_DOT: Record<PresenceStatus, string> = {
  online: "bg-success-solid",
  away: "bg-warning-solid",
  offline: "bg-current opacity-40",
};

/** Re-render on an interval so the dot ages and the clock ticks while open. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatLocalTime(timezone: string, nowMs: number): string | null {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(nowMs));
  } catch {
    // Invalid/unknown timezone — hide the row rather than crash the card.
    return null;
  }
}

function UserCardAvatar(props: { user: UserCardData; className?: string }) {
  const { user, className } = props;
  if (user.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt=""
        className={clsx("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={clsx(
        "bg-ui text-low flex items-center justify-center rounded-full font-medium uppercase",
        className,
      )}
    >
      {(user.initial || user.name || user.slug || "?").slice(0, 1)}
    </span>
  );
}

/**
 * The presence + local-time block shown below the divider. Renders nothing when
 * there's no presence data (e.g. a user the viewer doesn't share a team with, or
 * a mention card built without it).
 */
function UserCardPresence(props: {
  lastSeenAt?: string | null;
  timezone?: string | null;
}) {
  const { lastSeenAt, timezone } = props;
  const now = useNow(PRESENCE_TICK_MS);
  // No `lastSeenAt` means no recent activity (or presence isn't visible to the
  // viewer) — treat the user as offline.
  const status: PresenceStatus = lastSeenAt
    ? getPresenceStatus(lastSeenAt, now)
    : "offline";
  const localTime = timezone ? formatLocalTime(timezone, now) : null;

  return (
    <div className="text-low border-t-thin mt-3 flex flex-col gap-1.5 pt-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="flex size-3.5 shrink-0 items-center justify-center">
          <span className={clsx("size-2 rounded-full", PRESENCE_DOT[status])} />
        </span>
        {status === "offline" ? (
          lastSeenAt ? (
            <span>
              Last seen{" "}
              <Time
                date={lastSeenAt}
                tooltip="none"
                className="text-default font-medium"
              />
            </span>
          ) : (
            <span>Offline</span>
          )
        ) : status === "online" ? (
          <span className="text-default font-medium">Online</span>
        ) : (
          <span>Away</span>
        )}
      </div>
      {localTime ? (
        <div className="text-low flex items-center gap-2">
          <ClockIcon className="text-default size-3.5 shrink-0" />
          <span>
            <span className="text-default font-medium">{localTime}</span> local
            time
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shown below the divider for automated accounts (e.g. the Argos bot) in place
 * of the presence/local-time block — a bot has no presence to report.
 */
function UserCardBotInfo() {
  return (
    <div className="text-low border-t-thin mt-3 flex items-center gap-2 pt-3 text-xs">
      <BotIcon className="size-3.5 shrink-0 opacity-70" />
      <span>
        Automated account — actions are performed by Argos, not a person.
      </span>
    </div>
  );
}

/**
 * The body of the user hover card: avatar, name, slug, role, then a live
 * presence dot and local time. Rendered inside a {@link Tooltip} by
 * {@link UserHoverCard}, but exported so it can be embedded elsewhere if needed.
 *
 * Mounting is lazy (the tooltip renders its content on open), so the presence
 * subscription and ticking timer only run while a card is actually shown.
 */
function UserCard(props: { user: UserCardData }) {
  const { user } = props;
  const name = user.name || user.slug;

  // Keep presence live while the card is open. Apollo merges the normalized
  // `user` result into the cache, so the dot recolors without an explicit
  // handler. Skipped for cards built without an id (e.g. mention resolution)
  // and for bots, which have no presence.
  useSubscription(UserPresenceChangedSubscription, {
    variables: { userId: user.id ?? "" },
    skip: !user.id || user.isBot,
  });

  return (
    <div className="max-w-80 min-w-52">
      <div className="flex items-center gap-3">
        <UserCardAvatar user={user} className="size-10 shrink-0" />
        <div className="min-w-0 leading-tight">
          <div className="text-default truncate text-sm font-semibold">
            {name}
          </div>
          <div className="text-low flex items-center gap-1 truncate text-xs">
            <span className="truncate">{user.slug}</span>
            {user.role ? (
              <>
                <span aria-hidden>·</span>
                <span>{getRoleLabel(user.role)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {user.isBot ? (
        <UserCardBotInfo />
      ) : user.id ? (
        <UserCardPresence
          lastSeenAt={user.lastSeenAt}
          timezone={user.timezone}
        />
      ) : null}
    </div>
  );
}

/**
 * Wraps a trigger element with a hover/focus card showing a user's avatar,
 * name, slug and role. Shared by comment mentions and the build activity flow
 * (e.g. "Approved by …").
 */
export function UserHoverCard(props: {
  user: UserCardData;
  children: React.ComponentProps<typeof Tooltip>["children"];
  placement?: React.ComponentProps<typeof Tooltip>["placement"];
}) {
  return (
    <Tooltip
      variant="info"
      delay={1200}
      placement={props.placement ?? "top"}
      content={
        <div>
          <UserCard user={props.user} />
        </div>
      }
    >
      {props.children}
    </Tooltip>
  );
}
