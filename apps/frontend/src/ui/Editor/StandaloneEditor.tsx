import { useId, useState } from "react";
import { ArrowUpIcon } from "lucide-react";
import { toast } from "sonner";

import { HotkeyTooltip } from "../HotkeyTooltip";
import { IconButton } from "../IconButton";
import { Editor, type EditorValue } from "./Editor";
import { MOD } from "./EditorToolbar.shortcuts";
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
  placeholder?: string;
  /** Accessible label and tooltip text for the send button. */
  submitLabel?: string;
  /** Toast shown when the user submits while the editor is empty. */
  emptyMessage?: EmptyMessage;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * A self-contained rich-text comment box: the {@link Editor} with a send button
 * integrated into the box. It owns its content, clears it on a successful
 * submit and keeps it on failure. The send button is never disabled — an empty
 * submit surfaces a toast instead.
 */
export function StandaloneEditor(props: StandaloneEditorProps) {
  const {
    onSubmit,
    placeholder,
    submitLabel = "Send",
    emptyMessage = DEFAULT_EMPTY_MESSAGE,
    disabled,
    autoFocus,
    className,
    "aria-label": ariaLabel,
  } = props;
  const [value, setValue] = useState<EditorValue>(null);
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
      setValue(null);
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
      defaultValue={null}
      onChange={setValue}
      onSubmit={submit}
      placeholder={placeholder}
      disabled={disabled || isPending}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      className={className}
      contentClassName="min-h-9"
      footer={
        <div className="flex justify-end p-1.5">
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
              // Looks disabled when empty, but stays clickable so the press can
              // surface the "empty" toast.
              aria-disabled={isEmpty}
              onPress={submit}
            >
              <ArrowUpIcon />
            </IconButton>
          </HotkeyTooltip>
        </div>
      }
    />
  );
}
