import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleIcon, FlameIcon, ZapIcon } from "lucide-react";

import { Chip, ChipButton, ChipLink } from "./Chip";
import type { ChipColor } from "./Chip";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/Chip",
  component: Chip,
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

const colors: ChipColor[] = [
  "primary",
  "info",
  "success",
  "neutral",
  "pending",
  "danger",
  "warning",
];

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Colors</StoryTitle>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <Chip key={color} color={color}>
            {color}
          </Chip>
        ))}
      </div>

      <StoryTitle>Scales</StoryTitle>
      <div className="flex flex-wrap items-center gap-3">
        <Chip scale="xs" color="primary">
          xs
        </Chip>
        <Chip scale="sm" color="primary">
          sm
        </Chip>
        <Chip scale="md" color="primary">
          md
        </Chip>
      </div>

      <StoryTitle>With Icon</StoryTitle>
      <div className="flex flex-wrap gap-3">
        <Chip color="danger" icon={FlameIcon}>
          Error
        </Chip>
        <Chip color="warning" icon={ZapIcon}>
          Warning
        </Chip>
        <Chip color="info" icon={CircleIcon}>
          Info
        </Chip>
      </div>

      <StoryTitle>Icon only</StoryTitle>
      <div className="flex flex-wrap items-center gap-3">
        <Chip scale="xs" color="primary" icon={FlameIcon} />
        <Chip scale="sm" color="warning" icon={ZapIcon} />
        <Chip scale="md" color="info" icon={CircleIcon} />
      </div>

      <StoryTitle>Trailing avatar</StoryTitle>
      <div className="flex flex-wrap items-center gap-3">
        {(["xs", "sm", "md"] as const).map((scale) => (
          <Chip key={scale} scale={scale} color="success" icon={CircleIcon}>
            <span className="flex items-center gap-(--chip-gap)">
              Approved
              <span
                data-chip-end-avatar
                className="bg-primary-solid size-4 shrink-0 rounded-full"
              />
            </span>
          </Chip>
        ))}
      </div>

      <StoryTitle>Interactive</StoryTitle>
      <div className="flex flex-wrap gap-3">
        <ChipButton color="primary" onPress={() => {}}>
          Button Chip
        </ChipButton>
        <ChipLink color="info" href="#">
          Link Chip
        </ChipLink>
      </div>
    </div>
  ),
};
