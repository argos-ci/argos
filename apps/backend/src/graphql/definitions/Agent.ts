import gqlTag from "graphql-tag";

import { getAgentDisplayName } from "@/agent/registry";

const { gql } = gqlTag;

export const typeDefs = gql`
  """
  A coding agent acting on a user's behalf.

  An agent works with the user's own credentials, so without this what it did
  would read as something they did themselves.
  """
  type Agent {
    "Stable id of the agent, e.g. claude-code. Falls back to the literal id unknown when it could not be identified."
    id: String!
    "Name to display, e.g. Claude Code. Null for an agent we cannot name."
    name: String
  }
`;

/**
 * Resolve a stored agent id to the `Agent` shape, or null when the action was
 * taken directly. Shared by everything that records an agent — comments and
 * build reviews — so they can never describe one differently.
 */
export function resolveAgent(
  agent: string | null,
): { id: string; name: string | null } | null {
  if (!agent) {
    return null;
  }
  return { id: agent, name: getAgentDisplayName(agent) };
}
