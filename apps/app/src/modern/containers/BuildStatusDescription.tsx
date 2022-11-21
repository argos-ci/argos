import { checkIsBuildEmpty, checkIsBuildIncomplete } from "./Build";
import type { Build } from "./Build";
import type { Repository } from "./Repository";
import { Anchor } from "@/modern/ui/Link";
import { Code } from "@/modern/ui/Code";

export interface BuildStatusDescriptionProps {
  build: Pick<Build, "type" | "status" | "batchCount" | "totalBatch"> & {
    stats: Pick<Build["stats"], "total">;
  };
  repository: Pick<Repository, "referenceBranch">;
}

export const BuildStatusDescription = ({
  build,
  repository,
}: BuildStatusDescriptionProps) => {
  switch (build.type) {
    case "orphan":
      return (
        <>
          Comparing screenshot is not possible because no reference build was
          found.
          <div className="my-4">
            It may happens because:
            <ul className="ml-8 mt-2 list-disc space-y-1">
              <li>
                There is no Argos build on the{" "}
                <Code>{repository.referenceBranch}</Code> branch yet
              </li>
              <li>
                Your pull-request is not rebased on{" "}
                <Code>{repository.referenceBranch}</Code> branch
              </li>
            </ul>
          </div>
          To perform comparison, make sure that you have an Argos build on{" "}
          <Code>{repository.referenceBranch}</Code> branch and that your
          pull-request is rebased.
        </>
      );

    case "reference":
      return (
        <>
          This build was performed on the reference branch. Screenshots will be
          used as a comparison baseline in next Argos builds
        </>
      );

    case "check": {
      switch (build.status) {
        case "stable": {
          if (checkIsBuildEmpty(build)) {
            return (
              <>
                Empty build: no screenshot has been uploaded. It may result of a
                wrong uploaded repository&apos;s path.
              </>
            );
          }
          return <>This build is stable: no screenshot change detected.</>;
        }

        case "expired": {
          if (checkIsBuildIncomplete(build)) {
            return (
              <>
                Build has been killed because it took too much time to receive
                all batches.
                <br />
                Be sure that argos upload is called up to the number specified
                in parallel total.
              </>
            );
          }
          return (
            <>
              Build has been killed because it took too much time.
              <br />
              If you are having trouble with this issue reach us on{" "}
              <Anchor href="https://discord.gg/pK79sv85Vg">Discord</Anchor>.
            </>
          );
        }

        case "error":
          return (
            <>
              The build failed to be processed.
              <br />
              If you are having trouble with this issue reach us on{" "}
              <Anchor href="https://discord.gg/pK79sv85Vg">Discord</Anchor>.
            </>
          );

        case "aborted":
          return <>This build has been voluntarily aborted.</>;

        case "diffDetected":
          return (
            <>
              Some differences have been detected between baseline branch and
              head.
            </>
          );

        case "pending":
        case "progress":
          return <>This build is in progress.</>;
        case "accepted":
          return <>Changes have been accepted by a user.</>;
        case "rejected":
          return <>Changes have been rejected by a user.</>;
        default:
          return null;
      }
    }
    default:
      throw new Error(`Unknown build type: ${build.type}`);
  }
};
