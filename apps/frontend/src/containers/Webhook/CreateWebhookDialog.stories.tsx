import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/ui/Button";
import { DialogTrigger } from "@/ui/Dialog";
import { Modal } from "@/ui/Modal";
import { openOverlayParameters } from "@/ui/storyOverlay";

import { CreatedWebhookDialog, CreateWebhookForm } from "./CreateWebhookDialog";

const projects = ["web", "docs", "design-system", "marketing-site"].map(
  (name, index) => ({ id: String(index + 1), name }),
);

const meta = {
  title: "Containers/CreateWebhookDialog",
  parameters: openOverlayParameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllProjects: Story = {
  render: () => (
    <DialogTrigger defaultOpen>
      <Button variant="secondary">Add webhook</Button>
      <Modal>
        <CreateWebhookForm projects={projects} onCreate={async () => {}} />
      </Modal>
    </DialogTrigger>
  ),
};

export const SpecificProjects: Story = {
  render: () => (
    <DialogTrigger defaultOpen>
      <Button variant="secondary">Add webhook</Button>
      <Modal>
        <CreateWebhookForm
          projects={projects}
          onCreate={async () => {}}
          defaultScope="selected"
        />
      </Modal>
    </DialogTrigger>
  ),
};

export const Created: Story = {
  render: () => (
    <DialogTrigger defaultOpen>
      <Button variant="secondary">Add webhook</Button>
      <Modal>
        <CreatedWebhookDialog secret="whsec_c3Rvcnlib29rLW5vdC1hLXJlYWwtc2VjcmV0LWF0LWFsbA==" />
      </Modal>
    </DialogTrigger>
  ),
};
