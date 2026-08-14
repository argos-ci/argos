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
import { openOverlayParameters } from "./storyOverlay";
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
          <Dialog role="alertdialog">
            <DialogBody>
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

/**
 * An open `dialog`. This is also the only baseline of `Modal`'s overlay — the
 * backdrop tint, the blur and the card — which Base UI splits across
 * `Dialog.Backdrop`, `Dialog.Viewport` and `Dialog.Popup`.
 */
export const Open: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <DialogTrigger defaultOpen>
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
  ),
};

/**
 * `role="alertdialog"` centres the body and lets a footer alert span the full
 * width — a distinct layout that `DialogRoleContext` drives.
 */
export const OpenAlert: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <DialogTrigger defaultOpen>
      <Button variant="destructive">Delete Project</Button>
      <Modal isDismissable>
        <Dialog role="alertdialog">
          <DialogBody>
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
  ),
};

/**
 * A dialog whose action is in flight. `Modal` refuses Escape and backdrop
 * dismissal while pending and disables every `DialogDismiss`, which is the
 * behaviour Base UI has to reproduce through `onOpenChange`'s event details.
 */
export const OpenPending: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <DialogTrigger defaultOpen>
      <Button variant="secondary">Open Dialog</Button>
      <Modal isDismissable>
        <Dialog>
          <DialogBody>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogText>
              The new owner will be billed for this project.
            </DialogText>
          </DialogBody>
          <DialogFooter>
            <DialogDismiss isDisabled>Cancel</DialogDismiss>
            <Button variant="primary" isPending>
              Transfer
            </Button>
          </DialogFooter>
        </Dialog>
      </Modal>
    </DialogTrigger>
  ),
};
