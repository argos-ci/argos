import { createContext, useContext } from "react";

import type { MentionUser } from "./mention";

/**
 * The users that can be mentioned in the comments below the provider. Every
 * {@link Editor} reads them unless it is given its own `mentions`, so a new
 * comment surface cannot forget them, and the `@` autocomplete is synchronous.
 */
const MentionableUsersContext = createContext<MentionUser[]>([]);

export const MentionableUsersProvider = MentionableUsersContext.Provider;

export function useMentionableUsers(): MentionUser[] {
  return useContext(MentionableUsersContext);
}
