import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";
import { Modal } from "./Modal";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/Dialog",
  component: Dialog,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Default</StoryTitle>
      <DialogTrigger>
        <Button variant="secondary">Open Dialog</Button>
        <Modal isDismissable>
          <Dialog>
            <DialogBody>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogText>Are you sure you want to proceed?</DialogText>
            </DialogBody>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <Button variant="primary">Confirm</Button>
            </DialogFooter>
          </Dialog>
        </Modal>
      </DialogTrigger>

      <StoryTitle>Destructive</StoryTitle>
      <DialogTrigger>
        <Button variant="destructive">Delete Project</Button>
        <Modal isDismissable>
          <Dialog>
            <DialogBody confirm>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogText>
                This action cannot be undone. All data will be permanently
                deleted.
              </DialogText>
            </DialogBody>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <Button variant="destructive">Delete</Button>
            </DialogFooter>
          </Dialog>
        </Modal>
      </DialogTrigger>
    </div>
  ),
};
