import {
  DiffEditor as MonacoDiffEditor,
  Editor as MonacoEditor,
  type DiffEditorProps,
  type EditorProps,
} from "@monaco-editor/react";

import { useColorMode } from "@/ui/ColorMode";

const OPTIONS = {
  readOnly: true,
  wordWrap: "on" as const,
  useInlineViewWhenSpaceIsLimited: false,
  minimap: { enabled: false },
};

export function DiffEditor(
  props: Pick<
    DiffEditorProps,
    "original" | "modified" | "originalLanguage" | "modifiedLanguage"
  > &
    Pick<NonNullable<DiffEditorProps["options"]>, "renderSideBySide">,
) {
  const { renderSideBySide, ...rest } = props;
  const { colorMode } = useColorMode();
  return (
    <MonacoDiffEditor
      {...rest}
      theme={colorMode === "dark" ? "vs-dark" : "vs-light"}
      options={{
        ...OPTIONS,
        renderSideBySide: renderSideBySide,
      }}
    />
  );
}

export function Editor(props: Pick<EditorProps, "value" | "language">) {
  return <MonacoEditor {...props} options={OPTIONS} />;
}

export function getLanguageFromContentType(contentType: string) {
  switch (contentType) {
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
    case "text/xml":
      return "xml";
    case "text/markdown":
      return "markdown";
    default:
      return "plaintext";
  }
}
