import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import { useClipboard } from "use-clipboard-copy";

import { Button, ButtonIcon, LinkButton, type ButtonSize } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuSeparator,
  MenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";
import { AI_AGENTS, type AiAgentId } from "@/util/ai-agents";

/**
 * Copying is a target like the agents are, so it can be the one remembered: it
 * is what someone whose agent Argos cannot open reaches for every time.
 */
const COPY = "copy";

type Target = AiAgentId | typeof COPY;

/**
 * Where prompts went last, so the button offers that again instead of asking on
 * every build and every flaky test. Shared by every prompt Argos hands out: the
 * choice is about the user's tools, not about the prompt.
 */
const targetAtom = atomWithStorage<Target>("aiPromptTarget", AI_AGENTS[0].id);

/**
 * Hands a prompt to the coding agent the user works with: a split button that
 * opens the one picked last, and a menu for the others and for the clipboard.
 *
 * The agents are opened through their own deep links, so the prompt is typed in
 * but not sent, and never leaves the machine.
 */
export function AiPromptButton(props: {
  prompt: string;
  /**
   * Names the prompt where it needs naming ("Copy review prompt"). Keep it
   * short: it reads mid-label.
   */
  promptName?: string;
  size?: ButtonSize;
}) {
  const { prompt, promptName = "prompt", size } = props;
  const [target, setTarget] = useAtom(targetAtom);
  const clipboard = useClipboard({ copiedTimeout: 2000 });
  const copy = () => clipboard.copy(prompt);
  const copyLabel = `Copy ${promptName}`;
  // A target this build no longer offers falls back to copying, which always
  // works.
  const agent = AI_AGENTS.find(({ id }) => id === target) ?? null;

  return (
    <ButtonGroup>
      {agent ? (
        <Tooltip content={`Open the ${promptName} in ${agent.name}`}>
          <LinkButton
            variant="secondary"
            size={size}
            href={agent.getURL(prompt)}
          >
            <ButtonIcon>
              <agent.Icon />
            </ButtonIcon>
            Open in {agent.name}
          </LinkButton>
        </Tooltip>
      ) : (
        <Button variant="secondary" size={size} onPress={copy}>
          <ButtonIcon>
            {clipboard.copied ? <CheckIcon /> : <CopyIcon />}
          </ButtonIcon>
          {clipboard.copied ? "Copied" : copyLabel}
        </Button>
      )}
      <MenuTrigger>
        <Button
          variant="secondary"
          size={size}
          iconOnly
          aria-label={`Choose what to do with the ${promptName}`}
        >
          <ChevronDownIcon />
        </Button>
        <Popover>
          <Menu aria-label={promptName}>
            {AI_AGENTS.map(({ id, name, Icon, getURL }) => (
              <MenuItem
                key={id}
                href={getURL(prompt)}
                textValue={name}
                onAction={() => setTarget(id)}
              >
                <MenuItemIcon>
                  <Icon />
                </MenuItemIcon>
                Open in {name}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem
              textValue={copyLabel}
              onAction={() => {
                setTarget(COPY);
                copy();
              }}
            >
              <MenuItemIcon>
                <CopyIcon />
              </MenuItemIcon>
              {copyLabel}
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
    </ButtonGroup>
  );
}
