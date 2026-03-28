import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import { ButtonGroup } from "./ButtonGroup";
import { Chip, ChipButton, ChipLink } from "./Chip";
import { IconButton } from "./IconButton";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/ButtonGroup",
  component: ButtonGroup,
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>With IconButtons</StoryTitle>
      <ButtonGroup>
        <IconButton variant="contained">Left</IconButton>
        <IconButton variant="contained">Center</IconButton>
        <IconButton variant="contained">Right</IconButton>
      </ButtonGroup>

      <StoryTitle>With Chips</StoryTitle>
      <ButtonGroup>
        <Chip>Default</Chip>
        <ChipLink href="/">Chip Link</ChipLink>
        <ChipButton onClick={() => console.log("ok")}>Chip Button</ChipButton>
      </ButtonGroup>

      <StoryTitle>With Buttons</StoryTitle>
      <ButtonGroup>
        <Button variant="secondary">Left</Button>
        <Button variant="secondary">Center</Button>
        <Button variant="secondary">Right</Button>
      </ButtonGroup>
    </div>
  ),
};
