import { assertNever } from "@argos/util/assertNever";
import { LightBulbIcon } from "@primer/octicons-react";

import { FragmentType, graphql, useFragment } from "@/gql";
import { BuildMode, BuildType } from "@/gql/graphql";
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

const BuildFragment = graphql(`
  fragment BuildOrphanDialog_Build on Build {
    baseBranch
    mode
    type
  }
`);

const ProjectFragment = graphql(`
  fragment BuildOrphanDialog_Project on Project {
    slug
  }
`);

export function BuildOrphanDialog(props: {
  build: FragmentType<typeof BuildFragment>;
  project: FragmentType<typeof ProjectFragment>;
}) {
  const build = useFragment(BuildFragment, props.build);
  const project = useFragment(ProjectFragment, props.project);

  if (build.type !== BuildType.Orphan || !build.baseBranch) {
    return null;
  }

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
            switch (build.mode) {
              case BuildMode.Ci: {
                return (
                  <>
                    <p>
                      To begin visual comparisons, run Argos on the base branch
                      of this build: <Code>{build.baseBranch}</Code>.
                    </p>

                    <h3 className="mb-1 mt-4 text-base font-medium">
                      Create baseline for future builds
                    </h3>
                    <p>
                      Set your CI pipeline to run Argos on push, on a branch
                      that matches <Code>{build.baseBranch}</Code>. This creates
                      a <strong>baseline</strong> to compare with future builds.
                    </p>

                    <p className="text-low mt-2">
                      <LightBulbIcon /> You can configure auto-approved branches
                      in{" "}
                      <Link href={`/${project.slug}/settings`}>
                        project's settings
                      </Link>
                      .
                    </p>
                  </>
                );
              }
              case BuildMode.Monitoring: {
                return (
                  <p>
                    To begin visual comparisons, approve this build. This will
                    be used as a{" "}
                    <strong className="font-semibold">baseline</strong> to
                    compare with future builds.
                  </p>
                );
              }
              default:
                assertNever(build.mode);
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
