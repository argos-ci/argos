import { useId, useState } from "react";
import clsx from "clsx";
import { ArrowUpIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../Button";
import { HotkeyTooltip } from "../HotkeyTooltip";
import { IconButton } from "../IconButton";
import { Editor, type EditorValue, type EditorVariant } from "./Editor";
import { MOD } from "./EditorToolbar.shortcuts";
import { type MentionUser } from "./mention";
import { useEditorDraft } from "./useEditorDraft";
import { hasEditorContent } from "./util";

type EmptyMessage = { title: string; description?: string };

const DEFAULT_EMPTY_MESSAGE: EmptyMessage = {
  title: "Nothing to submit",
  description: "Write something before submitting.",
};

export interface StandaloneEditorProps {
  /**
   * Called when the content is submitted (send button or Cmd/Ctrl+Enter). The
   * editor clears once the returned promise resolves; throw to keep the content
   * so the user can retry.
   */
  onSubmit: (value: EditorValue) => void | Promise<void>;
  /**
   * Initial content of the editor. Defaults to empty. Pass existing content to
   * use the editor in "edit" mode.
   */
  defaultValue?: EditorValue;
  /**
   * When provided, a cancel button is shown next to the send button. Useful when
   * editing existing content.
   */
  onCancel?: () => void;
  placeholder?: string;
  /** Accessible label and tooltip text for the send button. */
  submitLabel?: string;
  /** Toast shown when the user submits while the editor is empty. */
  emptyMessage?: EmptyMessage;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
  /**
   * Visual style, forwarded to the {@link Editor}. `boxed` (default) shows the
   * bordered box with a toolbar; `plain` renders only the content with the
   * action buttons below (used to edit in place without any layout shift).
   */
  variant?: EditorVariant;
  /**
   * Content rendered in the footer, to the left of the send button (e.g. an
   * attachment control). Only shown when no `onCancel` is set, i.e. when
   * composing rather than editing.
   */
  footerStart?: React.ReactNode;
  contentClassName?: string;
  /** Users that can be mentioned with `@`, forwarded to the {@link Editor}. */
  mentions?: MentionUser[];
  /** Users to resolve existing mentions against, forwarded to the {@link Editor}. */
  mentionedUsers?: MentionUser[];
  /**
   * When provided, the editor content is persisted in local storage under this
   * key so a draft survives a page refresh. The key must encode the context so
   * a draft only reappears where it was written (see {@link useEditorDraft}).
   */
  draftKey?: string;
}

/**
 * A self-contained rich-text comment box: the {@link Editor} with a send button
 * integrated into the box. It owns its content, clears it on a successful
 * submit and keeps it on failure. The send button is disabled while a submit is
 * pending or when disabled by the parent; when the editor is merely empty it
 * stays clickable so the press can surface a toast.
 */
export function StandaloneEditor(props: StandaloneEditorProps) {
  const {
    onSubmit,
    defaultValue = null,
    onCancel,
    placeholder,
    submitLabel = "Send",
    emptyMessage = DEFAULT_EMPTY_MESSAGE,
    disabled,
    autoFocus,
    className,
    "aria-label": ariaLabel,
    variant = "boxed",
    footerStart,
    contentClassName,
    mentions,
    mentionedUsers,
    draftKey,
  } = props;
  const { initialContent, value, setValue, clear } = useEditorDraft(
    draftKey,
    defaultValue,
  );
  // Remounts the editor after a successful submit to clear its content.
  const [editorKey, setEditorKey] = useState(0);
  const [isPending, setIsPending] = useState(false);
  // Stable id so repeated empty submits reuse the same toast instead of stacking.
  const emptyToastId = useId();
  const isEmpty = !hasEditorContent(value);

  const performSubmit = async () => {
    setIsPending(true);
    try {
      await onSubmit(value);
      clear();
      setEditorKey((key) => key + 1);
    } catch {
      // Keep the content so the user can retry.
    } finally {
      setIsPending(false);
    }
  };

  const submit = () => {
    if (disabled || isPending) {
      return;
    }
    if (isEmpty) {
      toast.warning(emptyMessage.title, {
        id: emptyToastId,
        description: emptyMessage.description,
      });
      return;
    }
    void performSubmit();
  };

  return (
    <Editor
      key={editorKey}
      defaultValue={initialContent}
      onChange={setValue}
      onSubmit={submit}
      mentions={mentions}
      mentionedUsers={mentionedUsers}
      placeholder={placeholder}
      disabled={disabled || isPending}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      className={className}
      variant={variant}
      contentClassName={clsx(
        variant === "boxed" ? "min-h-9" : undefined,
        contentClassName,
      )}
      footer={
        onCancel ? (
          <div className="flex justify-end gap-1.5 p-1 pt-2">
            <Button
              variant="ghost"
              rounded
              size="small"
              onPress={onCancel}
              isDisabled={isPending}
            >
              Cancel
            </Button>
            <HotkeyTooltip
              description={submitLabel}
              keys={[MOD, "Enter"]}
              placement="top"
            >
              <Button
                variant="secondary"
                rounded
                size="small"
                onPress={submit}
                // Truly disabled (not focusable/clickable) while submitting or
                // when disabled by the parent. When the editor is merely empty
                // it only *looks* disabled but stays clickable, so the press can
                // surface the "empty" toast.
                isDisabled={disabled || isPending}
                aria-disabled={isEmpty}
              >
                {submitLabel}
              </Button>
            </HotkeyTooltip>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-1.5">
            {footerStart ? (
              <div className="flex min-w-0 flex-1 items-center">
                {footerStart}
              </div>
            ) : null}
            <HotkeyTooltip
              description={submitLabel}
              keys={[MOD, "Enter"]}
              placement="top"
            >
              <IconButton
                variant="contained"
                size="small"
                rounded
                aria-label={submitLabel}
                // Truly disabled (not focusable/clickable) while submitting or when
                // disabled by the parent. When the editor is merely empty it only
                // *looks* disabled but stays clickable, so the press can surface the
                // "empty" toast.
                isDisabled={disabled || isPending}
                aria-disabled={isEmpty}
                onPress={submit}
                className="ml-auto"
              >
                <ArrowUpIcon />
              </IconButton>
            </HotkeyTooltip>
          </div>
        )
      }
    />
  );
}
