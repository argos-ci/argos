import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

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
