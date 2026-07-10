import { lazy, Suspense, type ReactNode } from "react";
import type {
  BaseCodeOptions,
  DiffLineAnnotation,
  SelectedLineRange,
  SupportedLanguages,
  ThemeTypes,
} from "@pierre/diffs/react";

import { ColorMode, useColorMode } from "@/ui/ColorMode";

import { SnapshotLoader } from "./SnapshotLoader";

const File = lazy(() =>
  import("@pierre/diffs/react").then(({ File }) => ({
    default: File,
  })),
);

// `lazy()` collapses the component's `<LAnnotation>` generic, so cast back to the
// original generic signature to keep typed line annotations at the call site.
// The runtime value is still the lazy (Suspense-driven) component.
const MultiFileDiff = lazy(() =>
  import("@pierre/diffs/react").then(({ MultiFileDiff }) => ({
    default: MultiFileDiff,
  })),
) as unknown as typeof import("@pierre/diffs/react").MultiFileDiff;

// Shared options matching the previous Monaco read-only viewer behavior:
// word wrapping on, no file header, JS highlighter (avoids a WASM CSP relaxation).
const BASE_OPTIONS = {
  theme: { light: "pierre-light", dark: "pierre-dark" },
  overflow: "wrap",
  disableFileHeader: true,
  preferredHighlighter: "shiki-js",
} satisfies BaseCodeOptions;

// Styling for the gutter "+", injected into the viewer's shadow DOM via
// `unsafeCSS` (its `unsafe` cascade layer outranks the library's own rules).
const GUTTER_UTILITY_CSS =
  // Hide the "+" on the baseline/deletions side: line comments anchor to the
  // head (additions) line numbers only, so it would be a no-op there.
  // `[data-deletions]` is the deletions column in split view; `change-deletion`
  // covers pure deletion lines in unified view.
  "[data-deletions] [data-gutter-utility-slot]," +
  '[data-line-type="change-deletion"] [data-gutter-utility-slot]{display:none}' +
  // Tint the "+" with the app's primary violet. The Radix `--violet-*` custom
  // properties are defined on :root and inherit across the shadow boundary, so
  // this also tracks light/dark.
  "[data-utility-button]{background-color:var(--violet-9);color:#fff}" +
  "[data-utility-button]:hover{background-color:var(--violet-10)}";

function useThemeType(): ThemeTypes {
  const { colorMode } = useColorMode();
  switch (colorMode) {
    case ColorMode.Light:
      return "light";
    case ColorMode.Dark:
      return "dark";
    // `null` means "follow the system preference".
    default:
      return "system";
  }
}

/** The line the gutter "+" is currently hovering, as reported by the viewer. */
/**
 * Comment integration for the diff viewer, mapped onto `@pierre/diffs`'
 * annotation and gutter-utility APIs. Lets callers (see `DiffCommentLayer`)
 * render inline comment threads/drafts between lines and a gutter "+" affordance
 * without `DiffEditor` knowing anything about comments.
 *
 * We use the built-in gutter utility (`onGutterUtilityClick`): the library
 * renders and positions the "+" at the gutter/code edge and reports the clicked
 * (or drag-selected) line range, so a single click comments on one line and a
 * drag comments on a range.
 */
export type DiffEditorComments<LAnnotation> = {
  /** Inline annotations to render (one per anchored line). */
  lineAnnotations: DiffLineAnnotation<LAnnotation>[];
  /**
   * Controlled line highlight (e.g. the range being commented on). Driving it
   * keeps the highlight in sync with the draft, so clearing the draft clears it.
   */
  selectedLines: SelectedLineRange | null;
  /** Whether to show the gutter "+" affordance (gated on permission). */
  enableGutterUtility: boolean;
  /** Renders an inline annotation (a comment thread and/or a draft composer). */
  renderAnnotation: (annotation: DiffLineAnnotation<LAnnotation>) => ReactNode;
  /** Fired when the gutter "+" is clicked or drag-selected over a line range. */
  onGutterUtilityClick: (range: SelectedLineRange) => void;
  /**
   * Fired as a drag selection starts and updates. Controlled selection doesn't
   * render the in-progress range on its own, so the caller echoes it back into
   * `selectedLines` to show a live highlight while dragging.
   */
  onLineSelectionChange?: (range: SelectedLineRange | null) => void;
  /** Fired when a drag selection ends (used to drop the live drag range). */
  onLineSelectionEnd?: (range: SelectedLineRange | null) => void;
};

export function DiffEditor<LAnnotation = undefined>(props: {
  original: string;
  modified: string;
  originalLanguage: SupportedLanguages;
  modifiedLanguage: SupportedLanguages;
  renderSideBySide: boolean;
  comments?: DiffEditorComments<LAnnotation>;
}) {
  const { original, modified, originalLanguage, modifiedLanguage, comments } =
    props;
  const themeType = useThemeType();
  const options = {
    ...BASE_OPTIONS,
    themeType,
    diffStyle: props.renderSideBySide
      ? ("split" as const)
      : ("unified" as const),
    ...(comments?.enableGutterUtility
      ? {
          enableGutterUtility: true,
          // Lets the user drag the "+" to select a range; the committed range
          // arrives via onGutterUtilityClick, and the in-progress range via the
          // selection callbacks (echoed back into selectedLines for a live
          // highlight, since controlled selection doesn't render it on its own).
          enableLineSelection: true,
          onGutterUtilityClick: comments.onGutterUtilityClick,
          onLineSelectionStart: comments.onLineSelectionChange,
          onLineSelectionChange: comments.onLineSelectionChange,
          onLineSelectionEnd: comments.onLineSelectionEnd,
          unsafeCSS: GUTTER_UTILITY_CSS,
        }
      : null),
  };
  return (
    <Suspense fallback={<SnapshotLoader />}>
      <MultiFileDiff<LAnnotation>
        oldFile={{
          name: "snapshot",
          contents: original,
          lang: originalLanguage,
        }}
        newFile={{
          name: "snapshot",
          contents: modified,
          lang: modifiedLanguage,
        }}
        options={options}
        lineAnnotations={comments?.lineAnnotations}
        selectedLines={comments?.selectedLines}
        renderAnnotation={comments?.renderAnnotation}
      />
    </Suspense>
  );
}

export function Editor(props: { value: string; language: SupportedLanguages }) {
  const themeType = useThemeType();
  return (
    <Suspense fallback={<SnapshotLoader />}>
      <File
        file={{ name: "snapshot", contents: props.value, lang: props.language }}
        options={{ ...BASE_OPTIONS, themeType }}
      />
    </Suspense>
  );
}

export function getLanguageFromContentType(
  contentType: string,
): SupportedLanguages {
  // Normalize: drop any parameters (e.g. "; charset=utf-8") and lowercase.
  const normalized = (contentType.split(";")[0] ?? "").trim().toLowerCase();
  switch (normalized) {
    case "application/json":
      return "json";
    case "application/javascript":
    case "text/javascript":
      return "javascript";
    case "application/yaml":
    case "text/yaml":
      return "yaml";
    case "text/html":
      return "html";
    case "text/css":
      return "css";
    case "application/xml":
    case "text/xml":
      return "xml";
    case "text/markdown":
      return "markdown";
    default:
      return "text";
  }
}
