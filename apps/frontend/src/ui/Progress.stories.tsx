import type { Meta, StoryObj } from "@storybook/react-vite";

import { CircleProgress, Progress } from "./Progress";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/Progress",
  component: Progress,
  args: { value: 50, min: 0, max: 100 },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Scales</StoryTitle>
      <div className="flex max-w-sm flex-col gap-6">
        <div>
          <p className="mb-2 text-sm">Small (60%)</p>
          <Progress value={60} min={0} max={100} scale="sm" />
        </div>
        <div>
          <p className="mb-2 text-sm">Medium (40%)</p>
          <Progress value={40} min={0} max={100} scale="md" />
        </div>
      </div>

      <StoryTitle>Circle</StoryTitle>
      <div className="flex gap-6">
        <CircleProgress
          value={75}
          min={0}
          max={100}
          radius={30}
          strokeWidth={4}
          title="75%"
        />
        <CircleProgress
          value={30}
          min={0}
          max={100}
          radius={30}
          strokeWidth={4}
          title="30%"
        />
      </div>
    </div>
  ),
};
