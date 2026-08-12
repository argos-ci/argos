import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  BlendIcon,
  ColumnsIcon,
  CopyIcon,
  HandIcon,
  MessageSquarePlusIcon,
} from "lucide-react";

import { Button } from "./Button";
import { ButtonGroup } from "./ButtonGroup";
import {
  BaselineViewIcon,
  ChangesViewIcon,
  OnionViewIcon,
  SplitViewIcon,
  SwipeViewIcon,
} from "./Icons";
import { StoryTitle } from "./StoryTitle";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "UI/Icons",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The comparison viewer's control, in the order it is laid out there. */
const viewModeIcons = [
  { label: "Baseline", Icon: BaselineViewIcon },
  { label: "Changes", Icon: ChangesViewIcon },
  { label: "Side by side", Icon: SplitViewIcon },
  { label: "Onion skin", Icon: OnionViewIcon },
  { label: "Swipe", Icon: SwipeViewIcon },
];

export const ViewModes: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>View-mode icons</StoryTitle>
      <div className="flex gap-6">
        {viewModeIcons.map(({ label, Icon }) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <Icon size={24} />
            <span className="text-low font-mono text-xs">{label}</span>
          </div>
        ))}
      </div>

      <StoryTitle>At button size (16px)</StoryTitle>
      <div className="flex items-center gap-4">
        {viewModeIcons.map(({ label, Icon }) => (
          <Icon key={label} size={16} />
        ))}
      </div>

      <StoryTitle>Alongside Lucide originals</StoryTitle>
      <div className="flex items-center gap-4">
        {viewModeIcons.map(({ label, Icon }) => (
          <Icon key={label} size={24} />
        ))}
        <span className="text-low font-mono text-xs">/ lucide:</span>
        <CopyIcon size={24} />
        <BlendIcon size={24} />
        <ColumnsIcon size={24} />
        <HandIcon size={24} />
        <MessageSquarePlusIcon size={24} />
      </div>

      <StoryTitle>In context</StoryTitle>
      <ButtonGroup>
        {viewModeIcons.map(({ label, Icon }, index) => (
          <Tooltip key={label} content={label}>
            <Button
              variant="secondary"
              iconOnly
              aria-pressed={index === 1}
              aria-label={label}
            >
              <Icon />
            </Button>
          </Tooltip>
        ))}
      </ButtonGroup>
    </div>
  ),
};
