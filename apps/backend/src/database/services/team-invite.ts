/**
 * Team invites: listing pending invites, sending new ones, and cancelling them.
 *
 * Shared by the GraphQL API (`Team.invites`, `inviteMembers`, `cancelInvite`)
 * and the public REST API (`/accounts/{accountSlug}/invites`) so an invite sent
 * from an agent is the exact same invite, with the same email, as one sent from
 * the dashboard.
 *
 * Services throw `HTTPError` (via `boom`); the GraphQL layer converts them to
 * GraphQL errors with `toGraphQLError`.
 */
import { invariant } from "@argos/util/invariant";
import type { QueryBuilder } from "objection";

import { getAccountAvatar, getAvatarColor } from "@/account/avatar";
import config from "@/config";
import { sendEmailTemplate } from "@/email/send-email-template";
import { sanitizeEmail } from "@/util/email";
import { boom, HTTPError } from "@/util/error";
import type { RequestLocation } from "@/util/request-location";

import type { Account } from "../models/Account";
import { TeamInvite } from "../models/TeamInvite";
import type { User } from "../models/User";
import { UserEmail } from "../models/UserEmail";
import { assertTeamAdmin, type TeamUserLevel } from "./team-member";

/** How long an invite stays valid. */
const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * Raised when some of the invited addresses already belong to a team member.
 *
 * Carries the offending addresses rather than a rendered field path: the path
 * that identifies an input is the caller's, not the service's — GraphQL points
 * at `members.N.email` in its input object, the REST API at the request body —
 * so each layer maps these back to its own shape.
 */
export class AlreadyTeamMembersError extends HTTPError {
  emails: string[];
  constructor(emails: string[]) {
    super(400, `Already a member of the team: ${emails.join(", ")}.`);
    this.name = "AlreadyTeamMembersError";
    this.emails = emails;
  }
}

/**
 * Build the query listing a team's pending invites, most recent first. Callers
 * apply their own pagination (`range`).
 */
export function queryTeamInvites(args: {
  teamId: string;
  search?: string | null | undefined;
}): QueryBuilder<TeamInvite, TeamInvite[]> {
  const query = TeamInvite.query()
    .where("teamId", args.teamId)
    .orderBy("createdAt", "desc");

  if (args.search) {
    query.where("email", "ilike", `%${args.search}%`);
  }

  return query;
}

export type TeamInviteRequest = {
  email: string;
  level: TeamUserLevel;
};

/**
 * Invite people to a team by email, and send them the invite email.
 *
 * Re-inviting an address that already has a pending invite refreshes it (new
 * secret, new expiry) rather than failing, so a lost invite can always be
 * resent. Addresses belonging to someone already in the team are rejected
 * outright — the caller wants a member added, and silently sending them an
 * invite they cannot use would look like it worked.
 */
export async function inviteTeamMembers(args: {
  account: Account;
  user: User;
  /** The acting user's own account, shown as the sender in the email. */
  actorAccount: Account;
  members: TeamInviteRequest[];
  /** Where the request came from, shown in the email for phishing awareness. */
  requestLocation?: RequestLocation | null | undefined;
}): Promise<TeamInvite[]> {
  const teamId = await assertTeamAdmin(args);
  const { account: teamAccount, user, actorAccount, members } = args;

  if (members.length === 0) {
    throw boom(400, "At least one member is required.");
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const data = members.map((member) => ({
    secret: TeamInvite.generateSecret(),
    email: sanitizeEmail(member.email),
    teamId,
    userLevel: member.level,
    expiresAt: expiresAt.toISOString(),
    invitedById: user.id,
  }));

  const userEmails = await UserEmail.query()
    .whereIn(
      "user_emails.email",
      data.map((d) => d.email),
    )
    .withGraphJoined("user.[teams,account]");

  const usersInTeam = userEmails.filter((userEmail) => {
    invariant(userEmail.user?.teams, "relation not fetched");
    return userEmail.user.teams.some((team) => team.id === teamId);
  });

  if (usersInTeam.length > 0) {
    throw new AlreadyTeamMembersError(
      usersInTeam.map((userEmail) => userEmail.email),
    );
  }

  const invites = await TeamInvite.query()
    .insertAndFetch(data)
    .onConflict(["email", "teamId"])
    .merge();

  await Promise.all(
    invites.map(async (invite) => {
      const inviteeUser = userEmails.find(
        (userEmail) => userEmail.email === invite.email,
      )?.user;

      const [teamAvatar, avatar] = await Promise.all([
        getAccountAvatar(teamAccount),
        inviteeUser?.account ? getAccountAvatar(inviteeUser.account) : null,
      ]);

      const [teamAvatarURL, avatarURL] = await Promise.all([
        teamAvatar.url({ size: 128 }),
        avatar?.url({ size: 128 }) ?? null,
      ]);

      const firstEmailLetter = invite.email[0]?.toUpperCase();
      invariant(firstEmailLetter, "Email is empty");

      await sendEmailTemplate({
        template: "team_invite",
        to: [invite.email],
        data: {
          email: invite.email,
          userLevel: invite.userLevel,
          avatar: avatar
            ? {
                url: avatarURL,
                initial: avatar.initial,
                color: avatar.color,
              }
            : {
                url: null,
                initial: firstEmailLetter,
                color: getAvatarColor(invite.email),
              },
          invite: {
            url: new URL(`/invites/${invite.secret}`, config.get("server.url"))
              .href,
            date: new Date(invite.createdAt),
          },
          team: {
            name: teamAccount.displayName,
            avatar: {
              url: teamAvatarURL,
              initial: teamAvatar.initial,
              color: teamAvatar.color,
            },
          },
          invitedBy: {
            name: actorAccount.displayName,
            email: user.email,
            location: args.requestLocation ?? null,
          },
        },
      });
    }),
  );

  return invites;
}

/**
 * Cancel a pending invite, addressed by its public id.
 *
 * The invite id encodes the team it belongs to, so an id pointing at another
 * team is rejected rather than silently cancelling an invite the caller has no
 * business touching.
 */
export async function cancelTeamInvite(args: {
  account: Account;
  user: User;
  inviteId: string;
}): Promise<void> {
  const teamId = await assertTeamAdmin(args);

  const parsedId = TeamInvite.parseId(args.inviteId);
  if (!parsedId || parsedId.teamId !== teamId) {
    throw boom(404, "Team invite not found.");
  }

  const deleted = await TeamInvite.query().findOne(parsedId).delete();
  if (deleted === 0) {
    throw boom(404, "Team invite not found.");
  }
}
