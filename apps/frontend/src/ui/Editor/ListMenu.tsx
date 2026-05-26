import type { Editor } from "@tiptap/react";
import { ChevronDownIcon, ListIcon, ListOrderedIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Kbd } from "@/ui/Kbd";
import { Menu, MenuItem, MenuItemShortcut, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { ToolbarMenuButton } from "@/ui/Toolbar";

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
    <MenuTrigger>
      <HotkeyTooltip
        description={selectedOption?.label ?? "List"}
        keys={tooltipKeys}
      >
        <ToolbarMenuButton
          aria-label="Lists"
          aria-pressed={selectedKey !== null}
        >
          <ListIcon className="size-4" />
          <ChevronDownIcon className="size-3" />
        </ToolbarMenuButton>
      </HotkeyTooltip>
      <Popover>
        <Menu
          aria-label="Lists"
          selectionMode="single"
          selectedKeys={selectedKey ? [selectedKey] : []}
          onAction={(key) => {
            const chain = editor.chain().focus();
            if (key === "bulletList") {
              chain.toggleBulletList().run();
            } else if (key === "orderedList") {
              chain.toggleOrderedList().run();
            }
          }}
          className="min-w-60"
        >
          {LIST_OPTIONS.map((option) => (
            <MenuItem
              key={option.key}
              id={option.key}
              textValue={option.label}
              isDisabled={
                option.key === "bulletList"
                  ? !state.canBulletList
                  : !state.canOrderedList
              }
            >
              <option.icon className="mr-2 size-4" />
              {option.label}
              <MenuItemShortcut>
                {option.keys.map((key) => (
                  <Kbd key={key} className="ml-0.5">
                    {key}
                  </Kbd>
                ))}
              </MenuItemShortcut>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
