import { assertNever } from "@argos/util/assertNever";

import { FragmentType, graphql, useFragment } from "@/gql";
import { BuildMode, BuildStatus } from "@/gql/graphql";
import { Code } from "@/ui/Code";

const BuildFragment = graphql(`
  fragment BuildStatusDescription_Build on Build {
    type
    status
    mode
    baseBranch
    stats {
      total
    }
    parallel {
      total
      received
      nonce
    }
  }
`);

export const BuildStatusDescription = (props: {
  build: FragmentType<typeof BuildFragment>;
}) => {
  const build = useFragment(BuildFragment, props.build);

  if (build.status === BuildStatus.Expired) {
    if (build.parallel) {
      if (build.parallel.total === -1) {
        return (
          <>
            The build was aborted because it took too long to be finalized.
            <br />
            Received {build.parallel.received} batches with nonce{" "}
            <span className="font-mono">{build.parallel.nonce}</span>.
          </>
        );
      }
      return (
        <>
          The build was aborted because it took too long to receive all the
          batches.
          <br />
          Received {build.parallel.received}/{build.parallel.total} batches with
          nonce <span className="font-mono">{build.parallel.nonce}</span>.
        </>
      );
    }
    return <>Build has been killed because it took too much time.</>;
  }

  switch (build.type) {
    case "orphan":
      switch (build.status) {
        case BuildStatus.Accepted:
          return <>Changes have been accepted by a user.</>;
        case BuildStatus.Rejected:
          return <>Changes have been rejected by a user.</>;
        default: {
          switch (build.mode) {
            case BuildMode.Ci:
              return (
                <>
                  Comparing screenshot is not possible because no baseline build
                  was found.
                  <div className="my-4">
                    It may happens because:
                    <ul className="ml-8 mt-2 list-disc space-y-1">
                      <li>
                        No Argos build has been performed on the base branch
                        {build.baseBranch ? (
                          <>
                            {" "}
                            : <Code>{build.baseBranch}</Code>
                          </>
                        ) : null}
                        .
                      </li>
                      <li>
                        Argos can't find any commit ancestor that matches an
                        approved build. You may need to rebase your branch.
                      </li>
                    </ul>
                  </div>
                </>
              );
            case BuildMode.Monitoring:
              return (
                <>
                  This build has no comparison because no previous build has
                  been approved yet. To start comparing screenshots, you need to
                  approve this build.
                </>
              );
            default:
              assertNever(build.mode);
          }
        }
      }

    // eslint-disable-next-line no-fallthrough
    case "reference":
      return (
        <>
          This build was auto-approved because the branch is identified as an
          auto-approved one in project settings.
        </>
      );

    case "check": {
      switch (build.status) {
        case BuildStatus.NoChanges: {
          if (build.stats.total === 0) {
            return (
              <>
                No screenshot has been uploaded. Be sure to specify a directory
                containing images in your upload script.
              </>
            );
          }
          return <>This build is stable: no changes found.</>;
        }

        case BuildStatus.Error:
          return <>The build has failed to be processed.</>;

        case BuildStatus.Aborted:
          return <>This build has been voluntarily aborted.</>;

        case BuildStatus.ChangesDetected:
          return (
            <>
              Some changes have been detected between baseline and current
              screenshots.
            </>
          );

        case BuildStatus.Progress:
          return <>This build is in progress.</>;
        case BuildStatus.Accepted:
          return <>Changes have been accepted by a user.</>;
        case BuildStatus.Rejected:
          return <>Changes have been rejected by a user.</>;
        case BuildStatus.Pending:
          return <>This build is scheduled to be processed.</>;
        default:
          assertNever(build.status);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case null: {
      switch (build.status) {
        case BuildStatus.Error:
          return <>The build has failed to be processed.</>;
        case BuildStatus.Pending:
          return <>This build is scheduled to be processed.</>;
      }
      return null;
    }
    default:
      throw new Error(`Unknown build type: ${build.type}`);
  }
};
