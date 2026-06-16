import { TeamUser, type User } from "@/database/models";

import { forbidden, unauthenticated } from "../util";

/**
 * Whether two users share at least one team. A user always "shares" with
 * themselves.
 */
export async function usersShareTeam(
  aUserId: string,
  bUserId: string,
): Promise<boolean> {
  if (aUserId === bUserId) {
    return true;
  }
  const rows = await TeamUser.query()
    .whereIn("userId", [aUserId, bUserId])
    .select("userId", "teamId");
  const aTeamIds = new Set(
    rows.filter((row) => row.userId === aUserId).map((row) => row.teamId),
  );
  return rows.some((row) => row.userId === bUserId && aTeamIds.has(row.teamId));
}

/**
 * Presence (last seen, timezone) is personal data: visible only to the user
 * themselves or someone who shares a team with them. Mirrors how `User.sessions`
 * is owner-gated. Used by the subscription, which must authorize before opening
 * the stream; the equivalent field-level gate is batched via the
 * `UsersShareTeam` loader.
 */
export async function assertCanViewUserPresence(
  targetUserId: string,
  viewer: User | null,
): Promise<void> {
  if (!viewer) {
    throw unauthenticated();
  }
  if (await usersShareTeam(viewer.id, targetUserId)) {
    return;
  }
  throw forbidden();
}
