import { useMemo, useState } from "react";
import { type Editor } from "@tiptap/react";
import { clsx } from "clsx";
import { ExternalLinkIcon, Trash2Icon } from "lucide-react";

import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

export interface EditorToolbarLinkInputProps {
  editor: Editor;
  initialHref: string;
  hasLink: boolean;
  onDone: () => void;
}

/**
 * Normalize a user-entered URL.
 * - Prepends `https://` when no scheme is present so `google.com` works.
 * - Rejects anything that does not resolve to an `http(s)` URL with a host,
 *   blocking `javascript:`, `data:`, `mailto:`, `ftp:`, …
 */
function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (!parsed.host) {
    return null;
  }
  return parsed.toString();
}

export function EditorToolbarLinkInput(props: EditorToolbarLinkInputProps) {
  const { editor, initialHref, hasLink, onDone } = props;
  const [href, setHref] = useState(initialHref);
  const trimmed = href.trim();
  const normalized = useMemo(() => normalizeUrl(href), [href]);
  const isInvalid = trimmed !== "" && normalized === null;

  const apply = () => {
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onDone();
      return;
    }
    if (!normalized) {
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run();
    onDone();
  };

  const cancel = () => {
    editor.chain().focus().run();
    onDone();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onDone();
  };

  const open = () => {
    if (normalized) {
      window.open(normalized, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <form
      className="flex items-center gap-0.5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        apply();
      }}
    >
      <input
        type="text"
        autoFocus={initialHref === ""}
        placeholder="Enter link URL"
        value={href}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => setHref(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className={clsx(
          "placeholder:text-placeholder w-56 bg-transparent px-2 py-0.5 text-sm outline-hidden",
          isInvalid && "text-danger-low",
        )}
      />
      <div className="mx-1 h-4 w-px shrink-0 bg-(--mauve-6)" />
      <HotkeyTooltip description="Open link" keys={[]}>
        <IconButton
          size="small"
          aria-label="Open link"
          isDisabled={!normalized}
          onPress={open}
        >
          <ExternalLinkIcon />
        </IconButton>
      </HotkeyTooltip>
      <HotkeyTooltip description="Remove link" keys={[]}>
        <IconButton
          size="small"
          aria-label="Remove link"
          isDisabled={!hasLink}
          onPress={remove}
        >
          <Trash2Icon />
        </IconButton>
      </HotkeyTooltip>
    </form>
  );
}
