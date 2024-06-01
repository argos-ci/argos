import { Code } from "@/ui/Code";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { Link } from "@/ui/Link";
import { Modal } from "@/ui/Modal";

export function BuildOrphanDialog({
  referenceBranch,
  projectSlug,
}: {
  referenceBranch: string;
  projectSlug: string;
}) {
  return (
    <Modal defaultOpen>
      <Dialog size="medium">
        <DialogBody>
          <DialogTitle>Welcome to an orphan build!</DialogTitle>
          <DialogText>
            An <strong className="font-semibold">orphan build</strong> means
            Argos doesn't have a prior set of screenshots to compare with this
            build. It's typical for new projects or first-time setup.
          </DialogText>

          <h3 className="mb-1 font-semibold">Next Steps?</h3>
          <p>
            To begin visual comparisons, run Argos on your reference branch{" "}
            <Code>{referenceBranch}</Code> to create a{" "}
            <strong className="font-semibold">reference build</strong>. This
            will be your baseline for all future comparisons.
          </p>

          <p className="text-low mt-2 text-xs">
            Tip: You can change your reference branch on{" "}
            <Link href={`/${projectSlug}/settings`}>project's settings</Link>.
          </p>

          <h3 className="mb-1 mt-4 font-semibold">Keep Baseline Updated</h3>
          <p>
            Set your CI pipeline to run Argos on <Code>{referenceBranch}</Code>{" "}
            updates. This keeps your comparison baseline fresh and reliable.
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>I got It!</DialogDismiss>
        </DialogFooter>
      </Dialog>
    </Modal>
  );
}
