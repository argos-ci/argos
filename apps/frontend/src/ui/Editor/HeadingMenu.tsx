import type { Editor } from "@tiptap/react";
import { ChevronDownIcon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Kbd } from "@/ui/Kbd";
import { Menu, MenuItem, MenuItemShortcut, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { ToolbarMenuButton } from "@/ui/Toolbar";

import { ALT, MOD } from "./EditorToolbar.shortcuts";
import type { ToolbarState } from "./EditorToolbar.types";

const PARAGRAPH_HEADING_OPTION = {
  key: "paragraph",
  label: "Regular text",
  keys: [MOD, ALT, "0"],
};

const HEADING_OPTIONS = [
  PARAGRAPH_HEADING_OPTION,
  { key: "1", label: "Heading 1", keys: [MOD, ALT, "1"] },
  { key: "2", label: "Heading 2", keys: [MOD, ALT, "2"] },
  { key: "3", label: "Heading 3", keys: [MOD, ALT, "3"] },
  { key: "4", label: "Heading 4", keys: [MOD, ALT, "4"] },
] as const;

export function HeadingMenu(props: { editor: Editor; state: ToolbarState }) {
  const { editor, state } = props;
  const selectedKey = state.headingLevel
    ? String(state.headingLevel)
    : "paragraph";
  const selectedOption =
    HEADING_OPTIONS.find((option) => option.key === selectedKey) ??
    PARAGRAPH_HEADING_OPTION;
  const tooltipKeys = [...selectedOption.keys];

  return (
    <MenuTrigger>
      <HotkeyTooltip description={selectedOption.label} keys={tooltipKeys}>
        <ToolbarMenuButton aria-label="Text style">
          <span className="font-medium">Aa</span>
          <ChevronDownIcon className="size-3" />
        </ToolbarMenuButton>
      </HotkeyTooltip>
      <Popover>
        <Menu
          aria-label="Text style"
          selectionMode="single"
          selectedKeys={[selectedKey]}
          onAction={(key) => {
            const chain = editor.chain().focus();
            if (key === "paragraph") {
              chain.setParagraph().run();
            } else {
              const level = Number(key) as 1 | 2 | 3 | 4 | 5 | 6;
              chain.toggleHeading({ level }).run();
            }
          }}
          className="min-w-52"
        >
          {HEADING_OPTIONS.map((option) => (
            <MenuItem key={option.key} id={option.key} textValue={option.label}>
              <span className={getHeadingItemClassName(option.key)}>
                {option.label}
              </span>
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

function getHeadingItemClassName(key: (typeof HEADING_OPTIONS)[number]["key"]) {
  switch (key) {
    case "1":
      return "text-xl font-bold";
    case "2":
      return "text-lg font-bold";
    case "3":
      return "text-base font-semibold";
    case "4":
      return "text-sm font-semibold";
    default:
      return "";
  }
}
