import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import { DialogTrigger } from "./Dialog";
import { Popover } from "./Popover";

const meta = {
  title: "UI/Popover",
  component: Popover,
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-16">
      <DialogTrigger>
        <Button variant="secondary">Open Popover</Button>
        <Popover>
          <div className="p-3 text-sm">Popover content here</div>
        </Popover>
      </DialogTrigger>
    </div>
  ),
};
