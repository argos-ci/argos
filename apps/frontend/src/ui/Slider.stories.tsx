import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./Label";
import { Slider, SliderOutput, SliderThumb, SliderTrack } from "./Slider";

const meta = {
  title: "UI/Slider",
  component: Slider,
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="max-w-xs">
      <Slider defaultValue={50} minValue={0} maxValue={100}>
        <Label>Threshold</Label>
        <SliderOutput />
        <SliderTrack>
          <SliderThumb />
        </SliderTrack>
      </Slider>
    </div>
  ),
};
