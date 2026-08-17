import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CircleIcon,
  FlameIcon,
  SunIcon,
  SunMoonIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { userEvent } from "storybook/test";

import { ButtonGroup } from "./ButtonGroup";
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

      <StoryTitle>Interactive</StoryTitle>
      <div className="flex flex-wrap gap-3">
        <ChipButton color="primary" onClick={() => {}}>
          Button Chip
        </ChipButton>
        <ChipLink color="info" href="#">
          Link Chip
        </ChipLink>
      </div>

      <StoryTitle>Filter group</StoryTitle>
      <div className="flex flex-col items-start gap-3">
        {(["xs", "sm", "md"] as const).map((scale) => (
          <ButtonGroup key={scale}>
            <Chip scale={scale} icon={SunMoonIcon}>
              Color scheme
            </Chip>
            <Chip scale={scale}>is</Chip>
            <ChipButton scale={scale} icon={SunIcon} onClick={() => {}}>
              light
            </ChipButton>
            <ChipButton
              scale={scale}
              icon={XIcon}
              onClick={() => {}}
              aria-label="Remove Color scheme filter"
            />
          </ButtonGroup>
        ))}
      </div>
    </div>
  ),
};

/**
 * Keyboard focus on a chip button — the one baseline of the `focus-ring`
 * utility, which keeps react-aria's "outline on keyboard focus only" contract
 * now that it is the browser's own `:focus-visible` doing the deciding.
 */
export const KeyboardFocus: Story = {
  play: async () => {
    await userEvent.tab();
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <ChipButton color="primary" icon={ZapIcon} onClick={() => {}}>
        Focused
      </ChipButton>
      <ChipButton color="danger" icon={FlameIcon} onClick={() => {}}>
        Danger
      </ChipButton>
    </div>
  ),
};
