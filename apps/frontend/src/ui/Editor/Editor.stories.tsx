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
