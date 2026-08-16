import type { Editor } from "@tiptap/react";
import { ChevronDownIcon, ListIcon, ListOrderedIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Kbd } from "@/ui/Kbd";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";

import { Button } from "../Button";
import { MOD, SHIFT } from "./EditorToolbar.shortcuts";
import type { ToolbarState } from "./EditorToolbar.types";

const LIST_OPTIONS = [
  {
    key: "bulletList",
    label: "Bullet list",
    keys: [MOD, SHIFT, "8"],
    icon: ListIcon,
  },
  {
    key: "orderedList",
    label: "Numbered list",
    keys: [MOD, SHIFT, "7"],
    icon: ListOrderedIcon,
  },
] as const;

export function ListMenu(props: { editor: Editor; state: ToolbarState }) {
  const { editor, state } = props;
  const selectedKey = state.isBulletList
    ? "bulletList"
    : state.isOrderedList
      ? "orderedList"
      : null;
  const selectedOption = selectedKey
    ? LIST_OPTIONS.find((option) => option.key === selectedKey)
    : null;
  const tooltipKeys = selectedOption ? [...selectedOption.keys] : [];

  return (
    <MenuRoot>
      {/* The tooltip wraps the menu button rather than the other way round:
          Base UI triggers compose through `render`, so the outer one hands its
          props down to the inner one and both reach the button. */}
      <HotkeyTooltip
        description={selectedOption?.label ?? "List"}
        keys={tooltipKeys}
      >
        <MenuTrigger>
          <Button
            size="small"
            variant="ghost"
            aria-label="Lists"
            aria-pressed={selectedKey !== null}
          >
            <ListIcon className="size-4" />
            <ChevronDownIcon className="size-3" />
          </Button>
        </MenuTrigger>
      </HotkeyTooltip>
      <Menu aria-label="Lists" className="min-w-60">
        {LIST_OPTIONS.map((option) => (
          <MenuItem
            key={option.key}
            textValue={option.label}
            icon={<option.icon />}
            checked={selectedKey === option.key}
            disabled={
              option.key === "bulletList"
                ? !state.canBulletList
                : !state.canOrderedList
            }
            keyboardShortcut={option.keys.map((key) => (
              <Kbd key={key} className="ml-0.5">
                {key}
              </Kbd>
            ))}
            onAction={() => {
              const chain = editor.chain().focus();
              if (option.key === "bulletList") {
                chain.toggleBulletList().run();
              } else if (option.key === "orderedList") {
                chain.toggleOrderedList().run();
              }
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </MenuRoot>
  );
}
