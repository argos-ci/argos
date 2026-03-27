import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import { StoryTitle } from "./StoryTitle";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  args: {
    content: "Tooltip",
    children: (<Button variant="secondary">Hover me</Button>) as any,
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col p-16">
      <StoryTitle>Variants</StoryTitle>
      <div className="flex gap-8">
        <Tooltip content="Default tooltip">
          <Button variant="secondary">Default</Button>
        </Tooltip>
        <Tooltip content="Info tooltip with more detail" variant="info">
          <Button variant="secondary">Info</Button>
        </Tooltip>
      </div>

      <StoryTitle>Placements</StoryTitle>
      <div className="flex gap-8">
        <Tooltip content="Top" placement="top">
          <Button variant="secondary">Top</Button>
        </Tooltip>
        <Tooltip content="Bottom" placement="bottom">
          <Button variant="secondary">Bottom</Button>
        </Tooltip>
        <Tooltip content="Left" placement="left">
          <Button variant="secondary">Left</Button>
        </Tooltip>
        <Tooltip content="Right" placement="right">
          <Button variant="secondary">Right</Button>
        </Tooltip>
      </div>
    </div>
  ),
};
