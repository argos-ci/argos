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
 * Content of the button that performs the remembered action. An `iconOnly`
 * button takes its icon as its only child, a labelled one wraps it.
 */
function PrimaryContent(props: {
  iconOnly: boolean;
  icon: React.ReactElement<{ className?: string }>;
  children: React.ReactNode;
}) {
  if (props.iconOnly) {
    return props.icon;
  }
  return (
    <>
      <ButtonIcon>{props.icon}</ButtonIcon>
      {props.children}
    </>
  );
}

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
  /**
   * Drop the label and keep the target's icon, for rows with no room for a
   * sentence. The tooltip still says where the prompt goes.
   */
  iconOnly?: boolean;
}) {
  const { prompt, promptName = "prompt", size, iconOnly = false } = props;
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
            iconOnly={iconOnly}
            aria-label={iconOnly ? `Open in ${agent.name}` : undefined}
            href={agent.getURL(prompt)}
          >
            <PrimaryContent iconOnly={iconOnly} icon={<agent.Icon />}>
              Open in {agent.name}
            </PrimaryContent>
          </LinkButton>
        </Tooltip>
      ) : (
        <Tooltip content={copyLabel}>
          <Button
            variant="secondary"
            size={size}
            iconOnly={iconOnly}
            aria-label={
              iconOnly ? (clipboard.copied ? "Copied" : copyLabel) : undefined
            }
            onPress={copy}
          >
            <PrimaryContent
              iconOnly={iconOnly}
              icon={clipboard.copied ? <CheckIcon /> : <CopyIcon />}
            >
              {clipboard.copied ? "Copied" : copyLabel}
            </PrimaryContent>
          </Button>
        </Tooltip>
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
        {/* Anchored on its right edge: the menu is much wider than the button,
            and the button sits at the right of a header, so aligning it the
            other way only to be pushed back in reads as a stutter. */}
        <Popover placement="bottom end">
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
