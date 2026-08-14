import { BotIcon } from "lucide-react";

import { KNOWN_APP_LOGOS } from "@/containers/brand-logos";
import { Tooltip } from "@/ui/Tooltip";

export type Agent = {
  id: string;
  name?: string | null;
};

/**
 * Marks something an agent did on a user's behalf, pinned to the corner of
 * their avatar.
 *
 * The person stays the author — the agent acted with their credentials — so
 * this reads as an annotation on them rather than a second identity: what they
 * signed off on came through a tool. Agents we recognize show their own mark;
 * the rest fall back to a generic bot, which is still the part that matters.
 *
 * `action` completes the sentence "<action> through Claude Code on behalf of
 * this user", so it reads the same wherever the badge appears.
 */
export function AgentBadge(props: { agent: Agent; action: string }) {
  const { agent, action } = props;
  const Logo = KNOWN_APP_LOGOS[agent.id];
  const label = `${action} through ${agent.name ?? "an AI agent"} on behalf of this user`;
  return (
    <Tooltip content={label}>
      <span
        role="img"
        aria-label={label}
        className="bg-app border-thin text-low absolute -right-1 -bottom-1 flex size-3 items-center justify-center rounded-full"
      >
        {Logo ? <Logo className="size-2" /> : <BotIcon className="size-2" />}
      </span>
    </Tooltip>
  );
}
