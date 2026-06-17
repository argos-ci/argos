import { lazy, Suspense } from "react";
import type {
  BaseCodeOptions,
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

const MultiFileDiff = lazy(() =>
  import("@pierre/diffs/react").then(({ MultiFileDiff }) => ({
    default: MultiFileDiff,
  })),
);

// Shared options matching the previous Monaco read-only viewer behavior:
// word wrapping on, no file header, JS highlighter (avoids a WASM CSP relaxation).
const BASE_OPTIONS = {
  theme: { light: "pierre-light", dark: "pierre-dark" },
  overflow: "wrap",
  disableFileHeader: true,
  preferredHighlighter: "shiki-js",
} satisfies BaseCodeOptions;

const CLASS_NAME = "overflow-hidden rounded border";

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

export function DiffEditor(props: {
  original: string;
  modified: string;
  originalLanguage: SupportedLanguages;
  modifiedLanguage: SupportedLanguages;
  renderSideBySide: boolean;
}) {
  const { original, modified, originalLanguage, modifiedLanguage } = props;
  const themeType = useThemeType();
  const options = {
    ...BASE_OPTIONS,
    themeType,
    diffStyle: props.renderSideBySide
      ? ("split" as const)
      : ("unified" as const),
  };
  return (
    <Suspense fallback={<SnapshotLoader />}>
      <MultiFileDiff
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
        className={CLASS_NAME}
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
        className={CLASS_NAME}
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
