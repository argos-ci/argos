import { useCallback, useRef, useState } from "react";

import { getItem, removeItem, setItem } from "@/util/storage";

import { type EditorValue } from "./Editor";
import { hasEditorContent } from "./util";

// Local-storage keys are namespaced to avoid clashing with other features. The
// caller-provided key encodes the context (build, thread, …) so a draft only
// reappears where it was written.
const DRAFT_KEY_PREFIX = "editor.draft.";

function readDraft(key: string): EditorValue {
  const raw = getItem(DRAFT_KEY_PREFIX + key);
  if (raw == null) {
    return null;
  }
  try {
    return JSON.parse(raw) as EditorValue;
  } catch {
    // Corrupted draft (e.g. truncated write); ignore it.
    return null;
  }
}

export interface EditorDraft {
  /**
   * Content the editor should mount with — the restored draft when one exists,
   * otherwise the provided default. Pass to the {@link Editor} `defaultValue`.
   */
  initialContent: EditorValue;
  /** Current value, kept in sync with the editor through {@link setValue}. */
  value: EditorValue;
  /** Update the value and persist (or remove) the draft in local storage. */
  setValue: (value: EditorValue) => void;
  /** Discard the draft, e.g. after a successful submit. */
  clear: () => void;
}

/**
 * Persists an editor's content in local storage so a draft survives a refresh.
 *
 * When `key` is undefined drafts are disabled and nothing is persisted — useful
 * for editors (like in-place edits) that should never restore a draft. The key
 * must encode the context so a draft only reappears where it was written: a new
 * comment on a build should not show up on another build, and a reply should
 * not show up on another thread.
 */
export function useEditorDraft(
  key: string | undefined,
  defaultValue: EditorValue = null,
): EditorDraft {
  const [initialContent, setInitialContent] = useState<EditorValue>(() =>
    key ? (readDraft(key) ?? defaultValue) : defaultValue,
  );
  const [value, setValueState] = useState<EditorValue>(initialContent);
  // Read lazily so the persisting callbacks stay stable as the key changes.
  const keyRef = useRef(key);
  keyRef.current = key;

  const setValue = useCallback((next: EditorValue) => {
    setValueState(next);
    const key = keyRef.current;
    if (!key) {
      return;
    }
    // Only keep meaningful drafts around; drop empty ones so a cleared editor
    // doesn't leave a stale key behind.
    if (hasEditorContent(next)) {
      setItem(DRAFT_KEY_PREFIX + key, JSON.stringify(next));
    } else {
      removeItem(DRAFT_KEY_PREFIX + key);
    }
  }, []);

  const clear = useCallback(() => {
    setValueState(null);
    setInitialContent(null);
    const key = keyRef.current;
    if (key) {
      removeItem(DRAFT_KEY_PREFIX + key);
    }
  }, []);

  return { initialContent, value, setValue, clear };
}
