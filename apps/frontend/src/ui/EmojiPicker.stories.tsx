import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SmilePlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  EmojiPicker,
  EmojiPickerField,
  EmojiPickerPopover,
  EmojiPickerTrigger,
} from "./EmojiPicker";
import { IconButton } from "./IconButton";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/EmojiPicker",
  component: EmojiPicker,
} satisfies Meta<typeof EmojiPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultStory() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="p-8">
      <StoryTitle>Inline</StoryTitle>
      <div className="border-thin bg-subtle w-fit rounded-lg">
        <EmojiPicker onEmojiSelect={({ emoji }) => setSelected(emoji)} />
      </div>
      <p className="text-low mt-2 text-sm">Last selected: {selected ?? "—"}</p>

      <StoryTitle>In a Popover</StoryTitle>
      <EmojiPickerTrigger>
        <IconButton aria-label="Add reaction">
          <SmilePlusIcon />
        </IconButton>
        <EmojiPickerPopover onEmojiSelect={({ emoji }) => setSelected(emoji)} />
      </EmojiPickerTrigger>
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};

type FormValues = { emoji: string };

function FieldStory() {
  const { control, watch } = useForm<FormValues>({
    defaultValues: { emoji: "" },
  });
  const value = watch("emoji");
  return (
    <div className="p-8">
      <StoryTitle>EmojiPickerField (react-hook-form)</StoryTitle>
      <div className="flex items-center gap-3">
        <EmojiPickerField
          control={control}
          name="emoji"
          aria-label="Pick an emoji"
        />
        <span className="text-low text-sm">Field value: {value || "—"}</span>
      </div>
    </div>
  );
}

export const Field: Story = {
  render: () => <FieldStory />,
};
