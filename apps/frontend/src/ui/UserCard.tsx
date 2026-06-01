import { clsx } from "clsx";

import { DocumentType, graphql } from "@/gql";

import { Tooltip } from "./Tooltip";

/**
 * Fields the user card needs. Colocated so any query rendering a card selects
 * them. `role` is scoped to a project via its slug/name — the embedding
 * operation must provide `$accountSlug` and `$projectName`.
 */
export const UserCardFragment = graphql(`
  fragment UserCard_user on User {
    id
    name
    slug
    avatar {
      ...AccountAvatarFragment
    }
    role(accountSlug: $accountSlug, projectName: $projectName)
  }
`);

export interface UserCardData {
  name?: string | null;
  slug: string;
  imageUrl?: string | null;
  initial?: string | null;
  /** Team role (e.g. "owner"), shown as a humanized label when present. */
  role?: string | null;
}

/** Map the `UserCard_user` fragment to the data the card renders. */
export function getUserCardData(
  user: DocumentType<typeof UserCardFragment>,
): UserCardData {
  return {
    name: user.name,
    slug: user.slug,
    imageUrl: user.avatar.url,
    initial: user.avatar.initial,
    role: user.role,
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
 * The body of the user hover card: avatar, name, slug and (optional) role.
 * Rendered inside a {@link Tooltip} by {@link UserHoverCard}, but exported so it
 * can be embedded elsewhere if needed.
 */
export function UserCard(props: { user: UserCardData }) {
  const { user } = props;
  const name = user.name || user.slug;
  return (
    <div className="flex items-center gap-2">
      <UserCardAvatar user={user} className="size-8 shrink-0" />
      <div className="min-w-0 leading-tight">
        <div className="text-default truncate text-sm font-medium">{name}</div>
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
