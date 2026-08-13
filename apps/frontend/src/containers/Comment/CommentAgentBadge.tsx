import { AgentLogo } from "@argos/agents/react";
import { BotIcon } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";

export type CommentAgent = {
  id: string;
  name?: string | null;
};

/**
 * Marks a comment an agent wrote on its author's behalf, pinned to the corner
 * of their avatar.
 *
 * The author stays the author — the agent acted with their credentials — so
 * this reads as an annotation on them rather than a second identity: their
 * words came through a tool. Agents we recognize show their own mark; the rest
 * fall back to a generic bot, which is still the part that matters.
 */
export function CommentAgentBadge(props: { agent: CommentAgent }) {
  const { agent } = props;
  const label = agent.name
    ? `Posted through ${agent.name} on behalf of this user`
    : "Posted through an AI agent on behalf of this user";
  return (
    <Tooltip content={label}>
      <span
        role="img"
        aria-label={label}
        className="bg-app border-thin text-low absolute -right-1 -bottom-1 flex size-3 items-center justify-center rounded-full"
      >
        {/* A bot rather than a monogram of the name: an unrecognized agent's
            name is self-asserted, and at this size a letter reads as noise. */}
        <AgentLogo
          id={agent.id}
          fallback={<BotIcon className="size-2" />}
          className="size-2"
        />
      </span>
    </Tooltip>
  );
}
