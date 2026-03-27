import type { Meta, StoryObj } from "@storybook/react-vite";
import { DownloadIcon } from "lucide-react";

import { Button, ButtonIcon, LinkButton } from "./Button";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/Button",
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Variants</StoryTitle>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="github">GitHub</Button>
        <Button variant="gitlab">GitLab</Button>
        <Button variant="google">Google</Button>
      </div>

      <StoryTitle>Sizes</StoryTitle>
      <div className="flex flex-wrap items-center gap-4">
        <Button size="small">Small</Button>
        <Button size="medium">Medium</Button>
        <Button size="large">Large</Button>
      </div>

      <StoryTitle>With Icon</StoryTitle>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary">
          <ButtonIcon>
            <DownloadIcon />
          </ButtonIcon>
          Download
        </Button>
        <Button variant="secondary">
          <ButtonIcon>
            <DownloadIcon />
          </ButtonIcon>
          Download
        </Button>
      </div>

      <StoryTitle>Disabled</StoryTitle>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" isDisabled>
          Primary
        </Button>
        <Button variant="secondary" isDisabled>
          Secondary
        </Button>
        <Button variant="destructive" isDisabled>
          Destructive
        </Button>
      </div>

      <StoryTitle>Pending</StoryTitle>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" isPending>
          Saving…
        </Button>
        <Button variant="secondary" isPending>
          Loading…
        </Button>
      </div>

      <StoryTitle>As Link</StoryTitle>
      <div className="flex flex-wrap items-center gap-4">
        <LinkButton href="#" variant="primary">
          Primary Link
        </LinkButton>
        <LinkButton href="#" variant="secondary">
          Secondary Link
        </LinkButton>
      </div>
    </div>
  ),
};
