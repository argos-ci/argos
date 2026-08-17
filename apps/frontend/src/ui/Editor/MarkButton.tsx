import type { ReactElement } from "react";
import type { Editor } from "@tiptap/react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

import { Button } from "../Button";

export function MarkButton(props: {
  editor: Editor;
  label: string;
  keys: string[];
  icon: ReactElement;
  isActive: boolean;
  disabled: boolean;
  /**
   * The tiptap transform this button applies — deliberately not `onPress` or
   * `onClick`: it takes a command chain and returns it, and a name that reads
   * as a click handler invites someone to pass one.
   */
  apply: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>;
}) {
  const { editor, label, keys, icon, isActive, disabled, apply } = props;
  return (
    <HotkeyTooltip description={label} keys={keys}>
      <Button
        variant="ghost"
        iconOnly
        size="small"
        aria-label={label}
        aria-pressed={isActive}
        disabled={disabled}
        onClick={() => apply(editor.chain().focus()).run()}
      >
        {icon}
      </Button>
    </HotkeyTooltip>
  );
}
