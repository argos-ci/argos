import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor, within } from "storybook/test";

import { Label } from "@/ui/Label";
import { StoryTitle } from "@/ui/StoryTitle";

import { Editor, type EditorValue } from "./Editor";

const meta = {
  title: "UI/Editor",
  component: Editor,
  args: {
    defaultValue: null,
    onChange: () => {},
  },
} satisfies Meta<typeof Editor>;

export default meta;
type Story = StoryObj<typeof meta>;
type PlayContext = Parameters<NonNullable<Story["play"]>>[0];

function ControlledEditor(props: { initialValue?: EditorValue }) {
  const [value, setValue] = useState<EditorValue>(props.initialValue ?? null);
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div>
        <Label>Comment</Label>
        <Editor
          defaultValue={props.initialValue ?? null}
          onChange={setValue}
          aria-label="Comment"
        />
      </div>
      <div>
        <Label>JSON output</Label>
        <pre className="bg-ui overflow-auto rounded-sm p-2 text-xs">
          {value ? JSON.stringify(value, null, 2) : "(empty)"}
        </pre>
      </div>
    </div>
  );
}

/** A paragraph of plain text, the shape stored content takes. */
function paragraph(text: string): EditorValue {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export const CommitAutolink: Story = {
  name: "Commit autolink",
  render: () => (
    <div className="flex max-w-xl flex-col">
      <StoryTitle>Linked</StoryTitle>
      <Editor
        variant="plain"
        readOnly
        repositoryUrl="https://github.com/argos-ci/argos"
        value={paragraph("Pushed to the PR in d15cba5.")}
      />
      <Editor
        variant="plain"
        readOnly
        repositoryUrl="https://github.com/argos-ci/argos"
        value={paragraph(
          "Reverted 9f2c1a7b3e4d5c6a8b0f1e2d3c4b5a6978d0e1f2, then squashed abc1234 and 7fed210.",
        )}
      />

      <StoryTitle>Left alone</StoryTitle>
      {/* Shape heuristics: a plain number, a hex-only word, an asset name, a
          color, and a sha the author chose to write as code. */}
      <Editor
        variant="plain"
        readOnly
        repositoryUrl="https://github.com/argos-ci/argos"
        value={paragraph(
          "2000000 pixels, acceded, chunk-abc1234.js and #a1b2c3d4 are not commits.",
        )}
      />
      <Editor
        variant="plain"
        readOnly
        repositoryUrl="https://github.com/argos-ci/argos"
        value={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Run " },
                {
                  type: "text",
                  text: "git show d15cba5",
                  marks: [{ type: "code" }],
                },
                { type: "text", text: " to see it." },
              ],
            },
          ],
        }}
      />

      <StoryTitle>No repository linked</StoryTitle>
      <Editor
        variant="plain"
        readOnly
        value={paragraph("Pushed to the PR in d15cba5.")}
      />
    </div>
  ),
};

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Empty</StoryTitle>
      <ControlledEditor />

      <StoryTitle>With initial content</StoryTitle>
      <ControlledEditor
        initialValue={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Select some text to see the " },
                {
                  type: "text",
                  text: "floating toolbar",
                  marks: [{ type: "bold" }],
                },
                { type: "text", text: " appear above the selection." },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Press " },
                {
                  type: "text",
                  text: "Cmd/Ctrl + B",
                  marks: [{ type: "bold" }],
                },
                { type: "text", text: " to toggle bold." },
              ],
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Type " },
                { type: "text", text: "/", marks: [{ type: "code" }] },
                {
                  type: "text",
                  text: " at the start of a line for block commands.",
                },
              ],
            },
          ],
        }}
      />
    </div>
  ),
};

/** Two paragraphs, so a command that loses the selection has somewhere else to land. */
const TWO_PARAGRAPHS: EditorValue = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "First paragraph" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Second paragraph" }],
    },
  ],
};

/**
 * For the stories that end with the formatting toolbar up. Argos's default
 * capture zooms the page and grows the frame just before it shoots, and TipTap
 * re-places the toolbar 60ms after that resize — mid-capture, and wrongly,
 * since its placement does not account for a CSS zoom. Captured as the page
 * stands, a re-place lands the toolbar where it already is.
 */
const toolbarParameters = { argos: { fitToContent: false } };

/** Room above the editor, so the toolbar is not pushed off the top of the shot. */
function ToolbarStage(props: { children: React.ReactNode }) {
  return <div className="p-16">{props.children}</div>;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Selects the block that reads `text`, which raises the floating toolbar. */
async function selectBlock(context: PlayContext, text: string) {
  const { canvasElement, userEvent } = context;
  // The editor chunk is loaded on demand, so the first lookup waits for it.
  const editor = await within(canvasElement).findByLabelText(
    "Comment",
    {},
    { timeout: 5000 },
  );
  // 20ms after the editor gains focus, ProseMirror writes its own selection
  // back over the DOM's if it has not read the DOM's yet. A synthetic triple
  // click fits all three presses in those 20ms, so the write could land between
  // the third press and ProseMirror reading it, and the selection fell back to
  // the word the second press picked. Take focus first and let the timer run.
  editor.focus();
  await wait(50);
  await userEvent.tripleClick(within(editor).getByText(text));
  return editor;
}

/**
 * Waits for the toolbar to follow the block a command reshaped. TipTap moves it
 * 250ms after the change, counted again from when focus comes back to the
 * editor, so a play that stops at the command photographs the toolbar on
 * either side of the move.
 */
async function waitForToolbarToFollow(editor: HTMLElement) {
  await waitFor(() => expect(editor).toHaveFocus());
  await wait(500);
}

/**
 * The toolbar's menus are portalled to `document.body`, but React still bubbles
 * their events up through the editor box. A press on a row used to reach the
 * box's mousedown handler, which took it for a click on the box's own padding
 * and moved the cursor to the end of the document — the toolbar vanished, the
 * menu lost its anchor and jumped to the corner of the page, and the command
 * ran on the last paragraph instead of the selected one.
 */
export const HeadingFromToolbar: Story = {
  name: "Heading picked from the toolbar",
  parameters: toolbarParameters,
  render: () => (
    <ToolbarStage>
      <ControlledEditor initialValue={TWO_PARAGRAPHS} />
    </ToolbarStage>
  ),
  play: async (context) => {
    const { userEvent } = context;
    const editor = await selectBlock(context, "First paragraph");
    await userEvent.click(
      await screen.findByRole("button", { name: "Text style" }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: /^Heading 2/ }),
    );
    await expect(
      await within(editor).findByRole("heading", { level: 2 }),
    ).toHaveTextContent("First paragraph");
    await waitForToolbarToFollow(editor);
    // The selection survived, so the toolbar is still up.
    await expect(
      screen.getByRole("button", { name: "Text style" }),
    ).toBeVisible();
  },
};

export const ListFromToolbar: Story = {
  name: "List picked from the toolbar",
  parameters: toolbarParameters,
  render: () => (
    <ToolbarStage>
      <ControlledEditor initialValue={TWO_PARAGRAPHS} />
    </ToolbarStage>
  ),
  play: async (context) => {
    const { userEvent } = context;
    const editor = await selectBlock(context, "First paragraph");
    await userEvent.click(await screen.findByRole("button", { name: "Lists" }));
    await userEvent.click(
      await screen.findByRole("option", { name: /^Bullet list/ }),
    );
    await expect(await within(editor).findByRole("listitem")).toHaveTextContent(
      "First paragraph",
    );
    await waitForToolbarToFollow(editor);
    await expect(screen.getByRole("button", { name: "Lists" })).toBeVisible();
  },
};

/** A heading over a paragraph: a heading is the block a list cannot wrap as it stands. */
const HEADING_AND_PARAGRAPH: EditorValue = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "A heading" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "A paragraph" }],
    },
  ],
};

/**
 * The list rows read as disabled on a heading, which is one of the blocks
 * people most want to turn into bullets. `toggleBulletList` flattens a block it
 * cannot wrap and then wraps it, but that flattening does nothing in a dry run,
 * so `editor.can()` measured the wrap against the heading and called the whole
 * command impossible.
 */
export const ListFromHeading: Story = {
  name: "List picked with a heading selected",
  parameters: toolbarParameters,
  render: () => (
    <ToolbarStage>
      <ControlledEditor initialValue={HEADING_AND_PARAGRAPH} />
    </ToolbarStage>
  ),
  play: async (context) => {
    const { userEvent } = context;
    const editor = await selectBlock(context, "A heading");
    await userEvent.click(await screen.findByRole("button", { name: "Lists" }));
    const row = await screen.findByRole("option", { name: /^Bullet list/ });
    await expect(row).not.toHaveAttribute("aria-disabled");
    await userEvent.click(row);
    await expect(await within(editor).findByRole("listitem")).toHaveTextContent(
      "A heading",
    );
    await waitForToolbarToFollow(editor);
  },
};
