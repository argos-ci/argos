import { z } from "zod";

import { getAgentDisplayName } from "@/agent/registry";

/**
 * A coding agent acting on a user's behalf. An agent works with the user's own
 * credentials, so the `user` alone can never tell it apart from the person.
 *
 * Shared by everything that records one — comments and build reviews — so they
 * cannot describe an agent differently.
 */
export const AgentSchema = z
  .object({
    id: z.string().meta({
      description:
        "Stable id of the agent, e.g. `claude-code`. `unknown` when it could not be identified.",
    }),
    name: z.string().nullable().meta({
      description:
        "Name to display, e.g. `Claude Code`. Null for an agent we cannot name.",
    }),
  })
  .meta({
    description: "A coding agent acting on behalf of a user.",
    id: "Agent",
  });

/** Serialize a stored agent id, or null when the action was taken directly. */
export function serializeAgent(
  agent: string | null,
): z.infer<typeof AgentSchema> | null {
  if (!agent) {
    return null;
  }
  return { id: agent, name: getAgentDisplayName(agent) };
}
