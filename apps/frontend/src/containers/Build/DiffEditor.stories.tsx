import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";

import { ColorModeProvider } from "@/ui/ColorMode";
import { StoryTitle } from "@/ui/StoryTitle";

import { Editor, getLanguageFromContentType } from "./DiffEditor";

/**
 * Guards the curated Shiki bundle in `@/shiki/bundle`, which ships grammars only
 * for the languages `getLanguageFromContentType` can return, instead of Shiki's
 * full set of 243. A language missing from that bundle throws at highlight
 * time — but only for the content type that reaches it, which is exactly the
 * kind of gap nothing else would catch.
 *
 * Every content type the app maps to a grammar gets a snapshot here, so the
 * story walks the same path the build page does: content type → language →
 * highlighted output.
 */
const SAMPLES: { contentType: string; value: string }[] = [
  {
    contentType: "application/json",
    value: '{\n  "name": "argos",\n  "screenshots": 12\n}',
  },
  {
    contentType: "text/javascript",
    value:
      "export function diff(a, b) {\n  return a.filter((x) => !b.includes(x));\n}",
  },
  {
    contentType: "application/yaml",
    value: "name: argos\njobs:\n  test:\n    runs-on: ubuntu-latest",
  },
  {
    contentType: "text/html",
    value: '<main class="app">\n  <h1>Argos</h1>\n</main>',
  },
  {
    contentType: "text/css",
    value: ".app {\n  display: flex;\n  color: var(--violet-9);\n}",
  },
  {
    contentType: "application/xml",
    value:
      '<?xml version="1.0"?>\n<build>\n  <status>passed</status>\n</build>',
  },
  {
    contentType: "text/markdown",
    value: "# Argos\n\nVisual testing, with **screenshots**.",
  },
  {
    // Falls through to `text`, which Shiki resolves without a grammar.
    contentType: "text/plain; charset=utf-8",
    value: "a plain snapshot with no grammar at all",
  },
];

const meta = {
  title: "Containers/DiffEditor",
  component: Editor,
} satisfies Meta<typeof Editor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryHighlightedContentType: Story = {
  args: { value: SAMPLES[0]?.value ?? "", language: "json" },
  render: () => (
    // `Editor` reads the color mode to pick its light/dark Shiki theme.
    <ColorModeProvider>
      <div className="flex flex-col gap-4">
        {SAMPLES.map(({ contentType, value }) => (
          <div key={contentType}>
            <StoryTitle>{contentType}</StoryTitle>
            <Editor
              value={value}
              language={getLanguageFromContentType(contentType)}
            />
          </div>
        ))}
      </div>
    </ColorModeProvider>
  ),
  // Without this the story would pass while every viewer is still showing its
  // Suspense fallback, so a missing grammar would go unnoticed. Waiting for one
  // mounted viewer per sample — and for the loaders to be gone — is what makes
  // this a real check on the curated bundle.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => {
        expect(canvasElement.querySelectorAll("diffs-container")).toHaveLength(
          SAMPLES.length,
        );
        expect(canvas.queryByText("Loading snapshot…")).not.toBeInTheDocument();
      },
      { timeout: 15_000 },
    );
  },
};
