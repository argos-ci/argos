import type { ReactElement } from "react";
import type { Editor } from "@tiptap/react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

export function MarkButton(props: {
  editor: Editor;
  label: string;
  keys: string[];
  icon: ReactElement;
  isActive: boolean;
  isDisabled: boolean;
  onPress: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>;
}) {
  const { editor, label, keys, icon, isActive, isDisabled, onPress } = props;
  return (
    <HotkeyTooltip description={label} keys={keys}>
      <IconButton
        size="small"
        aria-label={label}
        aria-pressed={isActive}
        isDisabled={isDisabled}
        onPress={() => onPress(editor.chain().focus()).run()}
      >
        {icon}
      </IconButton>
    </HotkeyTooltip>
  );
}
