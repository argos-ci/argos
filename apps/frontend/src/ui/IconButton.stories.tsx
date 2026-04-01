import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { IconButton } from "./IconButton";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/IconButton",
  component: IconButton,
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Variants</StoryTitle>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="w-24 text-sm">Outline</span>
          <IconButton variant="outline" color="neutral">
            <PencilIcon />
          </IconButton>
          <IconButton variant="outline" color="danger">
            <Trash2Icon />
          </IconButton>
          <IconButton variant="outline" color="success">
            <CopyIcon />
          </IconButton>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-24 text-sm">Contained</span>
          <IconButton variant="contained" color="neutral">
            <PencilIcon />
          </IconButton>
        </div>
      </div>

      <StoryTitle>Sizes</StoryTitle>
      <div className="flex items-center gap-4">
        <IconButton size="small">
          <PencilIcon />
        </IconButton>
        <IconButton size="medium">
          <PencilIcon />
        </IconButton>
      </div>
    </div>
  ),
};
