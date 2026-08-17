import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";

import { Button } from "./Button";
import {
  Dialog,
  DialogActionButton,
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
        <Modal dismissible>
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
        <Modal dismissible>
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
      <Modal dismissible>
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
      <Modal dismissible>
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
      <Modal dismissible>
        <Dialog>
          <DialogBody>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogText>
              The new owner will be billed for this project.
            </DialogText>
          </DialogBody>
          <DialogFooter>
            <DialogDismiss disabled>Cancel</DialogDismiss>
            <Button variant="primary" isPending>
              Transfer
            </Button>
          </DialogFooter>
        </Dialog>
      </Modal>
    </DialogTrigger>
  ),
};

/** The play drives this to settle the pending action on demand. */
let settlePendingAction: (() => void) | null = null;

/**
 * The dialog's one hard behaviour: while an action runs, every user dismissal
 * — Escape, the backdrop, the dismiss button — is refused, and the dialog
 * un-blocks once the action settles. No screenshot can see this; the play is
 * the guard.
 */
export const PendingBlocksDismissal: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <div className="flex h-screen w-full items-start justify-center p-16">
      <DialogTrigger>
        <Button variant="secondary">Delete project</Button>
        <Modal dismissible>
          <Dialog role="alertdialog">
            <DialogBody>
              <DialogTitle>Delete this project?</DialogTitle>
              <DialogText>This cannot be undone.</DialogText>
            </DialogBody>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <DialogActionButton
                variant="destructive"
                onAsyncAction={() =>
                  new Promise<void>((resolve) => {
                    settlePendingAction = resolve;
                  })
                }
              >
                Delete
              </DialogActionButton>
            </DialogFooter>
          </Dialog>
        </Modal>
      </DialogTrigger>
    </div>
  ),
  play: async ({ userEvent }) => {
    await userEvent.click(
      await screen.findByRole("button", { name: "Delete project" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    // Start the action: the dialog is now pending.
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    // Escape and a backdrop press are refused while it runs.
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeVisible();
    await userEvent.click(document.body);
    await expect(dialog).toBeVisible();
    // The dismiss button is disabled while it runs.
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    // Once the action settles, the dialog un-blocks and Escape closes it.
    settlePendingAction?.();
    await waitFor(async () => {
      await expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeEnabled();
    });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  },
};
