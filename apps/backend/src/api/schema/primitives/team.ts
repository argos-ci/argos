import { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { TeamInvite, type TeamUser } from "@/database/models";

import { serializeUser, UserSchema } from "./user";

export const TeamUserLevel = TeamUserLevelSchema.meta({
  description:
    "Role of a user on a team. Owners administer the team, members see every project, contributors only the projects they are added to.",
  id: "TeamUserLevel",
});

export const TeamDefaultUserLevel = z.enum(["member", "contributor"]).meta({
  description:
    "Role given to users that join a team through its invite link or a verified email domain.",
  id: "TeamDefaultUserLevel",
});

export const TeamMemberSchema = z
  .object({
    id: z.string().meta({
      description: "Identifier of the membership, not of the user.",
    }),
    user: UserSchema,
    level: TeamUserLevel,
  })
  .meta({ description: "A member of a team.", id: "TeamMember" });

/**
 * Serialize a team membership. Requires the `user.account` relation, which
 * `queryTeamMembers` joins in.
 */
export function serializeTeamMember(
  teamUser: TeamUser,
): z.infer<typeof TeamMemberSchema> {
  const account = teamUser.user?.account;
  invariant(account, "user account is not fetched");
  return {
    id: teamUser.id,
    user: serializeUser(account),
    level: teamUser.userLevel,
  };
}

export const TeamInviteSchema = z
  .object({
    id: z.string(),
    email: z.email(),
    level: TeamUserLevel,
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    expired: z.boolean().meta({
      description:
        "Whether the invite is past its expiry date. Expired invites stay listed until they are cancelled or re-sent.",
    }),
  })
  .meta({
    description: "A pending invitation to join a team.",
    id: "TeamInvite",
  });

export function serializeTeamInvite(
  invite: TeamInvite,
): z.infer<typeof TeamInviteSchema> {
  return {
    id: TeamInvite.formatId(invite),
    email: invite.email,
    level: invite.userLevel,
    createdAt: new Date(invite.createdAt).toISOString(),
    expiresAt: new Date(invite.expiresAt).toISOString(),
    expired: new Date(invite.expiresAt) < new Date(),
  };
}
