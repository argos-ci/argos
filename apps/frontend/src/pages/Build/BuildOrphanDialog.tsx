import { assertNever } from "@argos/util/assertNever";
import { LightBulbIcon } from "@primer/octicons-react";

import { BuildMode } from "@/gql/graphql";
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
  referenceBranchGlob,
  projectSlug,
  mode,
}: {
  referenceBranchGlob: string;
  projectSlug: string;
  mode: BuildMode;
}) {
  return (
    <Modal defaultOpen>
      <Dialog size="medium">
        <DialogBody>
          <DialogTitle>Welcome to an orphan build!</DialogTitle>
          <DialogText>
            An <strong>orphan build</strong> means Argos doesn't have a prior
            set of screenshots to compare with this build. It's totally normal
            for the first builds.
          </DialogText>

          <h3 className="mb-1 mt-4 text-base font-medium">Next Steps?</h3>
          {(() => {
            switch (mode) {
              case BuildMode.Ci: {
                return (
                  <>
                    <p>
                      To begin visual comparisons, run Argos on a branch that
                      matches <Code>{referenceBranchGlob}</Code> to create a{" "}
                      <strong className="font-semibold">reference build</strong>
                      . This will be your baseline for all future comparisons.
                    </p>

                    <p className="text-low mt-2">
                      <LightBulbIcon /> You can change your reference branch on{" "}
                      <Link href={`/${projectSlug}/settings`}>
                        project's settings
                      </Link>
                      .
                    </p>

                    <h3 className="mb-1 mt-4 text-base font-medium">
                      Keep your baseline updated
                    </h3>
                    <p>
                      Set your CI pipeline to run Argos on push, on a branch
                      that matches <Code>{referenceBranchGlob}</Code>. This
                      keeps your comparison baseline fresh and reliable.
                    </p>
                  </>
                );
              }
              case BuildMode.Monitoring: {
                return (
                  <p>
                    To begin visual comparisons, approve this build. This will
                    create a{" "}
                    <strong className="font-semibold">reference build</strong>{" "}
                    to compare with future builds.
                  </p>
                );
              }
              default:
                assertNever(mode);
            }
          })()}
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>I got It!</DialogDismiss>
        </DialogFooter>
      </Dialog>
    </Modal>
  );
}
