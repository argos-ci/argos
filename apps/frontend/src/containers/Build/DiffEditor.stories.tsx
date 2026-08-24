import { useState } from "react";
import { invariant } from "@argos/util/invariant";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/ui/Button";
import { ColorModeProvider } from "@/ui/ColorMode";
import { StoryTitle } from "@/ui/StoryTitle";

import { DiffEditor, Editor, getLanguageFromContentType } from "./DiffEditor";

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
  args: {
    value: SAMPLES[0]?.value ?? "",
    language: "json",
    cacheKey: "application/json",
  },
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
              cacheKey={contentType}
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

// HTML, not plain text: the viewer re-renders unconditionally on the plain-text
// path, so a `text` sample would pass no matter what the cache keys are.
const DIFF_SAMPLES = [
  {
    baseCacheKey: "screenshot-base-1",
    headCacheKey: "screenshot-head-1",
    original: '<meta name="description" content="the first baseline line" />',
    modified: '<meta name="description" content="the first changed line" />',
  },
  {
    baseCacheKey: "screenshot-base-2",
    headCacheKey: "screenshot-head-2",
    original: '<meta name="description" content="the second baseline line" />',
    modified: '<meta name="description" content="the second changed line" />',
  },
];

function SnapshotSwitcher() {
  const [index, setIndex] = useState(0);
  const sample = DIFF_SAMPLES[index];
  invariant(sample);
  return (
    <div className="flex flex-col items-start gap-4">
      <Button
        onClick={() => setIndex((value) => (value + 1) % DIFF_SAMPLES.length)}
      >
        Next snapshot
      </Button>
      <DiffEditor
        original={sample.original}
        modified={sample.modified}
        originalLanguage="html"
        modifiedLanguage="html"
        originalCacheKey={sample.baseCacheKey}
        modifiedCacheKey={sample.headCacheKey}
        renderSideBySide
      />
    </div>
  );
}

/** Text rendered by the viewer, which lives in the custom element's shadow DOM. */
function getViewerText(canvasElement: HTMLElement) {
  const container = canvasElement.querySelector("diffs-container");
  return container?.shadowRoot?.textContent ?? "";
}

/**
 * The viewer reuses a rendered diff whenever its cache key comes back, so a key
 * shared by two snapshots pins the first one's hunks on screen. That happened:
 * every file handed to the viewer is named "snapshot", the key falls back to
 * the file name when unset, and selecting another text snapshot on the build
 * page kept showing the previous diff until a full page reload. Switching
 * snapshots in place is what proves the keys are distinct — rendering one never
 * would.
 */
export const SwitchingSnapshots: Story = {
  args: { value: "", language: "text", cacheKey: "unused" },
  render: () => (
    <ColorModeProvider>
      <SnapshotSwitcher />
    </ColorModeProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => {
        expect(getViewerText(canvasElement)).toContain(
          "the first changed line",
        );
      },
      { timeout: 15_000 },
    );

    await userEvent.click(
      canvas.getByRole("button", { name: "Next snapshot" }),
    );

    await waitFor(
      () => {
        const text = getViewerText(canvasElement);
        expect(text).toContain("the second changed line");
        expect(text).toContain("the second baseline line");
        expect(text).not.toContain("the first changed line");
      },
      { timeout: 15_000 },
    );
  },
};
