import { createContext, useContext } from "react";

import type { MentionUser } from "@/ui/Editor/mention";

/**
 * The users that can be mentioned in comments on the current build. Provided
 * once near the top of the activity section and consumed by every comment
 * editor (new comment, reply and edit) so the `@` autocomplete is synchronous.
 */
const MentionableUsersContext = createContext<MentionUser[]>([]);

export const MentionableUsersProvider = MentionableUsersContext.Provider;

export function useMentionableUsers(): MentionUser[] {
  return useContext(MentionableUsersContext);
}
