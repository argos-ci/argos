import { lazy, Suspense } from "react";
import { clsx } from "clsx";

import { EDITOR_PROSE_CLASS } from "./EditorContent.css";
import type { EditorProps } from "./EditorImpl";

export type { EditorProps, EditorValue, EditorVariant } from "./EditorImpl";

/**
 * TipTap and ProseMirror total ~1.1 MB before compression, and the build page
 * pulled them in statically — the whole editor rode along in its chunk whether
 * or not any comment was on screen, ahead of the screenshot diffs that are the
 * reason to open the page at all.
 *
 * Loading it on demand means the shell paints first and the editor streams in
 * for the comment surfaces. It backs read-only rendering too (see
 * {@link ReadOnlyEditor}), so this defers *displaying* comments as well as
 * composing them; the fallback below holds their space until it lands.
 */
const EditorImpl = lazy(() => import("./EditorImpl"));

/**
 * Placeholder standing in for the editor while it loads. Mirrors the real
 * padding and minimum height so nothing shifts when it swaps in, and is marked
 * `aria-busy` so Argos waits for the editor rather than screenshotting the gap.
 */
function EditorFallback(props: Pick<EditorProps, "variant" | "className">) {
  const { variant = "boxed", className } = props;
  const boxed = variant === "boxed";
  return (
    <div
      aria-busy
      className={clsx(
        EDITOR_PROSE_CLASS,
        boxed && "bg-app rounded-lg border px-3 py-2",
        "min-h-20",
        className,
      )}
    />
  );
}

/**
 * Rich-text editor, also used to render stored content read-only.
 *
 * Suspends on first use while the editor loads. Callers do not need their own
 * boundary — one is built in, sized to the editor it replaces.
 */
export function Editor(props: EditorProps) {
  return (
    <Suspense
      fallback={
        <EditorFallback
          {...(props.variant !== undefined ? { variant: props.variant } : {})}
          {...(props.className !== undefined
            ? { className: props.className }
            : {})}
        />
      }
    >
      <EditorImpl {...props} />
    </Suspense>
  );
}
