import { lazy, Suspense } from "react";
import { clsx } from "clsx";

import {
  EDITOR_BOXED_CLASS,
  EDITOR_BOXED_CONTENT_PADDING_CLASS,
  EDITOR_DEFAULT_CONTENT_HEIGHT_CLASS,
  EDITOR_PROSE_CLASS,
} from "./EditorContent.css";
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
 * Stand-in rendered while the editor chunk loads: the same box, the same
 * content padding and height (`contentClassName` sizes it exactly like the
 * real editable area), the same placeholder text and the same footer — so the
 * loaded editor swaps in without a single pixel moving. Marked `aria-busy` so
 * Argos waits for the editor rather than screenshotting the stand-in.
 */
function EditorFallback(
  props: Pick<
    EditorProps,
    "variant" | "className" | "contentClassName" | "placeholder" | "footer"
  >,
) {
  const {
    variant = "boxed",
    className,
    contentClassName,
    placeholder,
    footer,
  } = props;
  const isBoxed = variant === "boxed";
  return (
    <div aria-busy className={clsx(isBoxed && EDITOR_BOXED_CLASS, className)}>
      <div
        className={clsx(
          EDITOR_PROSE_CLASS,
          isBoxed && EDITOR_BOXED_CONTENT_PADDING_CLASS,
          isBoxed
            ? (contentClassName ?? EDITOR_DEFAULT_CONTENT_HEIGHT_CLASS)
            : contentClassName,
        )}
      >
        {/* The placeholder a caller supplies is shown by the editor itself
            once loaded; painting it here too means the text doesn't blink in
            after the fact. */}
        {placeholder ? <p className="text-placeholder">{placeholder}</p> : null}
      </div>
      {footer}
    </div>
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
          {...(props.contentClassName !== undefined
            ? { contentClassName: props.contentClassName }
            : {})}
          {...(props.placeholder !== undefined
            ? { placeholder: props.placeholder }
            : {})}
          {...(props.footer !== undefined ? { footer: props.footer } : {})}
        />
      }
    >
      <EditorImpl {...props} />
    </Suspense>
  );
}
