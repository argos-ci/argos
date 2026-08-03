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
  SubmenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";
import { AI_AGENTS, type AiAgentId } from "@/util/ai-agents";

/**
 * Copying is a target like the agents are, so it can be the one remembered: it
 * is what someone whose agent Argos cannot open reaches for every time.
 */
const COPY_TARGET = "copy";

export type AiPromptTarget = AiAgentId | typeof COPY_TARGET;

/**
 * Where prompts went last, so the button offers that again instead of asking on
 * every build and every flaky test. Shared by every prompt Argos hands out: the
 * choice is about the user's tools, not about the prompt.
 */
const targetAtom = atomWithStorage<AiPromptTarget>(
  "aiPromptTarget",
  AI_AGENTS[0].id,
);

/**
 * The agent prompts go to, and how to change it. Exported so the surfaces that
 * hand out a prompt without this button — a comment thread's actions menu —
 * still feed the one choice.
 */
export function useAiPromptTarget() {
  return useAtom(targetAtom);
}

/** One thing Argos can ask a coding agent to do. */
export interface AiPrompt {
  /**
   * What the prompt asks for, as the menu says it ("Review build"). Only shown
   * when the button carries more than one.
   */
  label: string;
  /**
   * Names the prompt where it needs naming ("Copy review prompt"). Keep it
   * short: it reads mid-label.
   */
  name: string;
  prompt: string;
}

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
 * The rows that send one prompt somewhere: every agent Argos can open, then the
 * clipboard. Picking one is also meant to make it the remembered target, which
 * is what `onPick` is for.
 *
 * Copying is left to the caller rather than done here, so the surface that owns
 * the rows can confirm it in its own way — the button relabels itself, a menu
 * that closes on the click has to say it another way.
 */
export function AiPromptTargetItems(props: {
  entry: AiPrompt;
  onPick: (target: AiPromptTarget) => void;
  onCopy: (entry: AiPrompt) => void;
}) {
  const { entry, onPick, onCopy } = props;
  return (
    <>
      {AI_AGENTS.map(({ id, name, Icon, getURL }) => (
        <MenuItem
          key={id}
          href={getURL(entry.prompt)}
          textValue={name}
          onAction={() => onPick(id)}
        >
          <MenuItemIcon>
            <Icon />
          </MenuItemIcon>
          Open in {name}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem
        textValue={`Copy ${entry.name}`}
        onAction={() => {
          onPick(COPY_TARGET);
          onCopy(entry);
        }}
      >
        <MenuItemIcon>
          <CopyIcon />
        </MenuItemIcon>
        Copy {entry.name}
      </MenuItem>
    </>
  );
}

/**
 * Hands a prompt to the coding agent the user works with: a split button that
 * opens the one picked last, and a menu for the others and for the clipboard.
 *
 * The agents are opened through their own deep links, so the prompt is typed in
 * but not sent, and never leaves the machine.
 *
 * A button can carry several prompts — reviewing a build and acting on what its
 * reviewers wrote are two things to ask of the same agent about the same build.
 * The button itself performs the first one; the menu then folds each prompt's
 * targets into a submenu of its own, rather than listing every pairing flat.
 */
export function AiPromptButton(props: {
  /**
   * What this button can hand out, most-used first: the button performs that
   * one, and the menu reaches the rest.
   */
  prompts: readonly [AiPrompt, ...AiPrompt[]];
  size?: ButtonSize;
  /**
   * Drop the label and keep the target's icon, for rows with no room for a
   * sentence. The tooltip still says where the prompt goes.
   */
  iconOnly?: boolean;
}) {
  const { prompts, size, iconOnly = false } = props;
  const [target, setTarget] = useAiPromptTarget();
  const clipboard = useClipboard({ copiedTimeout: 2000 });
  const [primary] = prompts;
  const copy = (entry: AiPrompt) => clipboard.copy(entry.prompt);
  const copyLabel = `Copy ${primary.name}`;
  // A target this build no longer offers falls back to copying, which always
  // works.
  const agent = AI_AGENTS.find(({ id }) => id === target) ?? null;
  const targetItems = (entry: AiPrompt) => (
    <AiPromptTargetItems entry={entry} onPick={setTarget} onCopy={copy} />
  );

  return (
    <ButtonGroup>
      {agent ? (
        <Tooltip content={`Open the ${primary.name} in ${agent.name}`}>
          <LinkButton
            variant="secondary"
            size={size}
            iconOnly={iconOnly}
            aria-label={
              iconOnly ? `Open the ${primary.name} in ${agent.name}` : undefined
            }
            href={agent.getURL(primary.prompt)}
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
            onPress={() => copy(primary)}
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
          aria-label={
            prompts.length > 1
              ? "Choose what to hand to an agent"
              : `Choose what to do with the ${primary.name}`
          }
        >
          <ChevronDownIcon />
        </Button>
        {/* Anchored on its right edge: the menu is much wider than the button,
            and the button sits at the right of a header, so aligning it the
            other way only to be pushed back in reads as a stutter. */}
        <Popover placement="bottom end">
          {prompts.length > 1 ? (
            <Menu aria-label="Agent prompts">
              {prompts.map((entry) => (
                <SubmenuTrigger key={entry.label}>
                  <MenuItem textValue={entry.label}>{entry.label}</MenuItem>
                  <Popover>
                    <Menu aria-label={entry.label}>{targetItems(entry)}</Menu>
                  </Popover>
                </SubmenuTrigger>
              ))}
            </Menu>
          ) : (
            <Menu aria-label={primary.name}>{targetItems(primary)}</Menu>
          )}
        </Popover>
      </MenuTrigger>
    </ButtonGroup>
  );
}
