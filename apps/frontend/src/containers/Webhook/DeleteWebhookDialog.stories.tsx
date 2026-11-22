import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/ui/Button";
import { DialogTrigger } from "@/ui/Dialog";
import { Modal } from "@/ui/Modal";
import { openOverlayParameters } from "@/ui/storyOverlay";

import { DeleteWebhookConfirmation } from "./DeleteWebhookDialog";

const meta = {
  title: "Containers/DeleteWebhookDialog",
  parameters: openOverlayParameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: () => (
    <DialogTrigger defaultOpen>
      <Button variant="destructive">Delete</Button>
      <Modal>
        <DeleteWebhookConfirmation
          id="1"
          url="https://hooks.acme.com/argos"
          onDelete={async () => {}}
        />
      </Modal>
    </DialogTrigger>
  ),
};
