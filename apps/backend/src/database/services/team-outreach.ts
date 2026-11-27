import { isUniqueViolationError } from "../error";
import { TeamOutreach, type TeamOutreachType } from "../models";

type OneOffAction = {
  teamId: string;
  type: TeamOutreachType;
  subscriptionId?: string;
};

/**
 * Record an action staff take once, as the trial outreach and the
 * cancellation follow-up are. Marking it again keeps the first author and
 * date.
 *
 * The index that makes the action one-off is partial, per type, and an
 * `ON CONFLICT` target would have to restate its predicate: the violation is
 * caught instead, which keeps the insert atomic all the same.
 */
export async function markTeamOutreach(
  action: OneOffAction & { userId: string },
): Promise<void> {
  try {
    await TeamOutreach.query().insert({
      teamId: action.teamId,
      userId: action.userId,
      subscriptionId: action.subscriptionId ?? null,
      type: action.type,
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return;
    }
    throw error;
  }
}

/** Record an email staff can send many times, as each renewal email is. */
export async function logTeamOutreach(
  action: OneOffAction & { userId: string },
): Promise<void> {
  await TeamOutreach.query().insert({
    teamId: action.teamId,
    userId: action.userId,
    subscriptionId: action.subscriptionId ?? null,
    type: action.type,
  });
}

/** Take back a one-off action, when it was marked by mistake. */
export async function unmarkTeamOutreach(action: OneOffAction): Promise<void> {
  const query = TeamOutreach.query()
    .delete()
    .where({ teamId: action.teamId, type: action.type });
  if (action.subscriptionId) {
    query.where("subscriptionId", action.subscriptionId);
  }
  await query;
}
